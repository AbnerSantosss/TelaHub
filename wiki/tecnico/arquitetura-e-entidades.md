---
tipo: tecnico
atualizado: 2026-07-25
tags: [arquitetura, dominio, prisma, multi-tenant, tenant-scope, billing, planos, auditoria, seguranca, observabilidade, cicd, deploy]
sources: [raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md]
---

# Arquitetura e Entidades de Domínio — TelaHub

Levantamento feito por leitura direta do código (`backend/prisma/schema.prisma`, rotas e serviços do backend, `docker-compose.yml`, `frontend/App.tsx` e componentes). Duas grandes revisões: a sessão de 2026-07-15 (gaps técnicos originais) e o ciclo de 2026-07-25, que transformou o TelaHub de app single-tenant com agrupamento visual em **SaaS multi-tenant com planos, assinatura e auditoria**. Ver [[Kanban-TelaHub]].

Leitura complementar: [[seguranca-e-conformidade-tecnica]] (guardas de segredo, proxy, upload), [[modelo-comercial-e-precificacao]] (o porquê dos preços e limites), [[funcionalidades-produto]], [[oportunidades-ux]].

## Modelo de domínio (Prisma)

Todas as afirmações abaixo foram conferidas em `backend/prisma/schema.prisma` (2026-07-25).

- **User** — username, name, email, hash de senha, role `user`/`admin`/`master`, `lastLogin`. Tem **`organizationId`** — o escopo de tenant do usuário. É nulo **apenas** para o role `master` (proprietário da plataforma, que opera acima das organizações); qualquer outro usuário sem organização é tratado como órfão e bloqueado (403).
- **Organization** — a Loja/Organização, hoje o **tenant** do sistema. Relaciona displays, users, devices, broadcasts, auditLogs e uma `subscription` (1:1). Existem dois scripts de migração para ela, ambos idempotentes: o original `prisma/backfill-default-organization.ts` (`npm run db:backfill-org`, só displays, de 2026-07-15) e o atual `prisma/backfill-tenant-scope.ts` (`npm run db:backfill-tenant`), que cobre users, devices, broadcasts e `activatedAt` — é este que roda no boot do container.
- **Display** — a "tela" lógica: nome, `slug` único (URL pública do player), `pages` (JSON com as cenas do editor), `coverImage`, `organizationId`, `updatedAt` usado como versão para cache/SSE.
- **Device** — dispositivo físico pareado via `pairingCode`, vinculado opcionalmente a um `Display`, com `status` (`pending`/`linked`), `lastSeen` (heartbeat), `lastAlertedAt` (evita repetir alerta de offline), **`organizationId`** e **`activatedAt`** — a data em que o device passou a contar como "tela ativa" para fins de cobrança. `activatedAt` é gravado no pareamento (`device.service.ts`, `link()`), só se ainda estiver nulo.
- **Broadcast** — interrupção temporária ou permanente que sobrescreve o conteúdo normal de displays (`displayIds`), com janela `startTime`/`endTime`, flag `active` e **`organizationId`**.
- **Plan** *(novo)* — catálogo comercial. `code` único (`gratis` | `loja` | `rede` | `enterprise`; o `trial` legado existe com `active: false`), `name`, `pricePerScreenCents` (preço por **tela ativa/mês**, em centavos), `minScreens` (piso de telas faturadas), `maxDevices` / `maxUsers` / `maxOrganizations` (**`null` = ilimitado**), `features` (array JSON serializado em texto) e `active`. Nos planos pagos `maxDevices` é `null` **de propósito**: quem limita a expansão é a fatura por tela, não uma trava de software. Detalhe comercial em [[modelo-comercial-e-precificacao]].
- **Subscription** *(novo)* — **uma por organização** (`organizationId @unique`). `status` ∈ `trialing` | `active` | `past_due` | `canceled`, `trialEndsAt`, `currentPeriodEnd` e os campos de gateway `gateway` / `gatewayCustomerId` / `gatewaySubscriptionId` (nulos enquanto não houver integração). A conta criada por auto-cadastro nasce no plano `gratis`, `active` e **sem prazo** (`trialEndsAt: null`) — freemium não expira. O ramo `trialing` continua no código só para um trial promocional futuro.
- **AuditLog** *(novo)* — `organizationId`, `userId`, `userEmail`, `action` (ex.: `display.create`, `display.publish`, `display.delete`, `device.link`, `device.delete`, `broadcast.create`, `broadcast.delete`), `entityType`, `entityId`, `metadata` (JSON livre) e `createdAt`. Gravado por `audit.service.ts`, que **nunca lança**: falha de auditoria só vai para o log, a requisição do usuário segue.
- **Setting** — key-value genérico (usado para config SMTP).
- **PasswordReset** — tokens de recuperação de senha com expiração.

## Escopo de tenant — o coração do ciclo de 2026-07-25

O isolamento não é uma coluna no banco: é uma cadeia explícita no servidor.

- **JWT carrega `organizationId`** (`auth.service.ts`, `JwtUserPayload`). Tokens antigos, emitidos antes do escopo, decodificam com `organizationId: null` — ou seja, deixam de conseguir operar como usuário comum.
- **`requireTenant`** (`middlewares/tenant.middleware.ts`) roda sempre depois de `authMiddleware` e define **`req.tenantId`**:
  - usuário comum/admin → `req.tenantId = user.organizationId`;
  - usuário sem organização → **403** ("Usuário não vinculado a nenhuma organização");
  - `master` → escolhe o tenant pelo header `X-Organization-Id` ou pela query `?organizationId=`; sem escolha, `req.tenantId = null`, que significa "todas as organizações".
- **Acesso cruzado responde 404, não 403.** É deliberado e está comentado no código: 403 confirmaria que o recurso existe em outro tenant. Vale para `GET /api/displays/:id`, `DELETE` de display/device/broadcast, `GET /api/organizations/:id/report`, `DELETE /api/media/:filename` e o `TenantScopeError` (que carrega `statusCode = 404`).
- **`POST /api/displays` ignora o `organizationId` do corpo.** A rota desestrutura apenas `id, name, slug, pages, coverImage, orientation` e passa `req.tenantId` adiante; `display.service.save()` impõe o tenant do token. Editar um display de outro tenant cai em `TenantScopeError` → 404.
- **Broadcasts validam os `displayIds`.** Antes de salvar, `displayService.findForeignDisplayIds(displayIds, req.tenantId)` verifica se todos pertencem ao tenant; se qualquer um for de fora, o payload inteiro é rejeitado com **400**.
- **Mídia é prefixada por `<organizationId>/`.** `media.service.ts` monta a chave como `` `${organizationId}/${filename}` `` (tanto no R2 quanto no diretório local) e valida o id contra `/^[A-Za-z0-9._-]+$/` antes de usá-lo como caminho. Listagem, download e delete só alcançam esse prefixo — arquivos legados na raiz continuam visíveis apenas para a organização padrão.
- **`GET /api/organizations`** devolve todas para o `master` e exatamente uma para os demais; criar organização (`POST`) é ato de plataforma, restrito ao `master`. O cadastro de clientes novos entra por `POST /api/signup`.

## Rotas novas (2026-07-25)

Públicas (registradas em `server.ts` **antes** de qualquer guarda de autenticação — quem se cadastra ainda não tem conta):

- `POST /api/signup` — auto-atendimento. Numa única transação cria Organization + User `admin` + Subscription no plano `gratis`, deriva um `username` livre a partir do e-mail, devolve token no mesmo formato do login e dispara um e-mail de boas-vindas de forma não bloqueante. Protegida por `authRateLimit` + Zod.
- `GET /api/signup/check-email?email=` — validação em tempo real do formulário; devolve só `{ available: boolean }`.
- `GET /api/plans` — catálogo público consumido pela landing (ver [[canais-de-venda-e-landings]]). Expõe preço, limites e features, mais um bloco `billingPolicy` (1 tela grátis, `trialDays: 0`, sem cartão, cobrança a partir da 2ª tela, proração, `retroactiveCharges: false`).

Autenticadas (`billing.routes.ts` faz `router.use(authMiddleware)`):

- `GET /api/billing/subscription` — assinatura + uso + previsão de fatura (`estimatedMonthly`: telas ativas, telas faturadas com o piso de `minScreens`, valor). Serializa **sem** ids de gateway.
- `POST /api/billing/plan` — troca de plano (exige `adminMiddleware`). Recusa com 400 o downgrade que estouraria algum limite do plano de destino.
- `POST /api/billing/checkout` — responde **501** de propósito: **não há gateway integrado**. Simular pagamento aprovado daria ao frontend a impressão de que a cobrança existe. O plano de integração (Asaas/Stripe) está escrito como `TODO(gateway)` na própria rota, junto da regra anti-cobrança-retroativa.

No frontend, `App.tsx` ganhou a rota `/signup` (`components/Signup.tsx`), e `services/storage.ts` ganhou `signup()`, `getPlans()` e a leitura de `/billing/subscription` — esta última degradando silenciosamente se a rota não existir.

## Cadeia de middlewares — e a decisão de onde NÃO aplicar

A ordem real, quando todos aparecem:

```
authMiddleware → requireTenant → requireActiveSubscription (402) → enforceQuota (403) → validateBody (400)
```

- `requireActiveSubscription` (`quota.middleware.ts`) bloqueia com **402 Payment Required** quando a assinatura é inexistente, `past_due`, `canceled` ou um trial promocional vencido. `master` passa livre.
- `enforceQuota(resource)` bloqueia com **403** quando criar mais um recurso estouraria o limite do plano. Limite `null` nunca bloqueia. O caso freemium (2ª tela no plano grátis) tem resposta própria, com o plano sugerido e a fatura estimada.

**A cadeia completa só existe em três rotas**, todas de escrita:

| Rota | Cadeia |
|---|---|
| `POST /api/displays` | auth → requireTenant → requireActiveSubscription → validateBody |
| `POST /api/devices/link` | auth → requireTenant → requireActiveSubscription → **enforceQuota('device')** → validateBody |
| `POST /api/users/invite` | auth → requireTenant → requireActiveSubscription → **enforceQuota('user')** → validateBody |

**Decisão registrada, não acidente:** nada disso é aplicado em rotas de leitura, nem no heartbeat, nem nas rotas públicas do Player (`/api/displays/slug/:slug`, `/slug/:slug/live`, `/player/:id`, `PATCH /api/devices/:id/heartbeat`, `POST /api/devices/register`). **Assinatura vencida bloqueia criar e editar; nunca derruba uma tela que já está no ar.** O comentário está no próprio `devices.routes.ts`, acima de `POST /link`. Parear um device é o momento em que uma "tela ativa" nasce — por isso é ali que a quota é cobrada, e não na criação de displays (display não é unidade de cobrança).

Observação: `enforceQuota('organization')` existe no código mas não é usado por nenhuma rota — criar organização é privilégio do `master`, que passa livre por qualquer quota.

## ⚠️ Lacuna: quota é real, feature de plano é decorativa

`hasFeature()` está implementado em `backend/src/services/plan.service.ts` e tem teste (`services/__tests__/subscription.test.ts`). **Nenhuma rota e nenhum serviço o chama** — verificado por grep em todo o repositório em 2026-07-25: as únicas ocorrências fora da definição são o `.d.ts` compilado em `dist/` e o próprio teste. O frontend também não tem gate: não há referência a `hasFeature`, `features` ou `planCode` nos componentes.

Consequência concreta: os limites **numéricos** (telas ativas e usuários) são aplicados de verdade pelo `enforceQuota`, mas as **features** do plano não são aplicadas em lugar nenhum. Hoje uma conta no plano `gratis` — cujo `features` é apenas `["widgets-basicos","alerta-offline"]` — usa Power BI, Airtable, Google/Office Docs e PDF sem nenhum impedimento, embora `powerbi` esteja no conjunto do plano **Rede**.

Vale notar que este é o **inverso do problema habitual**: o risco não é vender algo que não entregamos, é **entregar de graça o que deveria ser pago** e depois gerar atrito com o cliente ao tirar o recurso. Quando o gate for implementado, ele tem de ser **no servidor** (rotas/serviços que servem esses widgets) — esconder o botão no Editor seria burlável por chamada direta à API, já que o conteúdo do widget é salvo no `pages` do Display como qualquer outro.

## Sequência de boot / deploy

O serviço `backend` no `docker-compose.yml` roda, nesta ordem, antes do `npm start`:

1. `npx prisma db push --skip-generate` — aplica o schema (Plan, Subscription, AuditLog e as colunas de escopo).
2. `npx tsx prisma/backfill-tenant-scope.ts` — preenche `organizationId` em users (exceto `master`), devices (herdando do display vinculado; sem display, cai na organização padrão "Loja Padrão"), broadcasts (herdando do primeiro `displayId`) e displays, além de `activatedAt` nos devices já `linked`.
3. `npx tsx prisma/seed-plans.ts` — cria/atualiza o catálogo de planos e migra as assinaturas do `trial` descontinuado para `gratis`.
4. `node prisma/seed-prod.js` — admin/usuários, display demo e a **assinatura herdada** das organizações que ainda não têm uma.

**Por que a ordem importa:** o passo 4 procura `plan.findUnique({ code: 'loja' })` para criar as assinaturas herdadas (`active`, gateway `manual`) das organizações pré-existentes. Se o `seed-plans` não tiver rodado antes, ele apenas avisa e não cria assinatura nenhuma — e essas organizações caem em 402 na primeira escrita.

**Por que o backfill é crítico:** sem ele, registros com `organizationId` nulo ficam invisíveis para qualquer usuário comum (`isSameTenant` trata entidade sem organização como fora de todo tenant, alcançável só pelo `master`), e um usuário `admin` sem organização recebe **403** em `requireTenant` — ou seja, o operador atual ficaria **trancado fora do próprio sistema** logo depois do deploy. Os quatro passos são idempotentes e podem rodar a cada restart do container.

**Dependência frágil a lembrar:** os passos 2 e 3 usam `tsx`, que é `devDependency`. Eles só funcionam na imagem porque o Dockerfile copia o `node_modules` **completo** do builder. Se o build passar a instalar somente dependências de produção (`npm ci --omit=dev` ou equivalente), esses dois passos quebram no boot — converta os scripts para JS puro antes de fazer essa otimização.

## Build e CI

- `backend/tsconfig.json` **inclui** os testes (`include: ["src/**/*"]`): é o tsconfig do editor e do `npm run typecheck` (`tsc --noEmit`), então erro de tipo em teste também precisa aparecer.
- `backend/tsconfig.build.json` **exclui** `src/**/__tests__/**` e `src/**/*.test.ts`, e é o único usado por `npm run build`.
- O motivo é concreto, não estético: o CI roda `build` antes de `test`. Enquanto os testes iam compilados para `dist/`, o vitest coletava **duas cópias de cada suíte** (a de `src/` e a de `dist/`), e as de `dist` falhavam — derrubando a execução inteira mesmo com todos os testes reais passando.
- Como o `build` deixou de checar os testes, `.github/workflows/ci.yml` ganhou um passo `npm run typecheck` antes do `build`, justamente para não perder a checagem de tipos deles. A ordem no CI é: `npm ci` → `prisma db push` → `typecheck` → `build` → `test`.

## Estado dos testes

**107 testes em 12 arquivos, todos passando** (`npm test` no diretório `backend`, executado em 2026-07-25; exige o Postgres local em `localhost:5433` no ar). Cobrem rate limit de auth, validação Zod, health de devices, organizations/report, signup, billing, quota, segurança de upload de mídia, segurança de auth e o serviço de subscription — incluindo `src/routes/__tests__/tenant-isolation.test.ts`, uma **suíte dedicada de isolamento entre tenants** (com helpers em `tenant-helpers.ts`).

## Fluxos de usuário / telas (frontend)

Rotas (`App.tsx`, HashRouter): `/login`, `/signup` (novo — auto-cadastro), `/forgot-password`, `/reset-password`, `/vendas` (landing pública, ver [[canais-de-venda-e-landings]]), `/` (Dashboard), `/edit/:id` (Editor), `/scheduler`, `/reports` (relatórios por Organização), `/player` e `/player/:slug` (públicas, para TVs).

- **Dashboard** — console de administração: CRUD de displays/devices/users, pairing de dispositivos, config de SMTP/conta, seletor de Organização (`OrganizationSelector.tsx`, persiste em `localStorage`), empty states orientativos (`EmptyState.tsx`) quando não há displays/devices.
- **Editor** (`/edit/:id`) — editor visual de cenas de um Display (grid 48 colunas via `react-grid-layout`, ~20 tipos de widget: imagem, texto, iframe, clima, relógio, vídeo, RSS, calendário, contagem regressiva, Power BI, Airtable, PDF, etc). Publicar/salvar uma cena já ao vivo numa tela pareada agora pede confirmação explícita (`PublishConfirmModal.tsx`) antes de sobrescrever. Erros usam toast (`sonner`), não mais `alert()` nativo.
- **Scheduler** (`/scheduler`) — agendamento de broadcasts, reaproveita o `SceneEditor`.
- **Reports** (`/reports`, novo) — relatório agregado por Organização: contagem de displays, devices online/offline, uso de broadcasts, com filtro de período.
- **Player** (`/player/:slug`) — cliente de exibição nas TVs: pareamento, heartbeat, SSE (`/live`) com fallback de polling, cache condicional por ETag/versão, aplica broadcasts sobre o conteúdo normal. Widgets que carregam via iframe (Power BI, PDF, Google Docs, Office Docs, Airtable, Browser Snapshot) mostram skeleton de carregamento e erro amigável em timeout (`IframeWithSkeleton.tsx`).
- **MediaLibrary** — upload/seleção de mídia, local (multer/disco) ou Cloudflare R2 conforme configuração.

Acessibilidade de modais: os modais construídos sobre o `Dialog` (Radix) já tinham focus trap e fechamento por `Esc` embutidos. Os modais "brutos" (sem Radix) — 3 em `Editor.tsx`, `LayersModal.tsx`, e 2 em `MediaLibrary.tsx` — passaram a usar o hook `hooks/useModalA11y.ts`, que adiciona a mesma garantia. Todos os modais baseados em `Dialog` também tiveram o título corrigido para usar o primitivo `DialogTitle` em vez de um `<h2>` solto (ver seção de bugs abaixo).

## Backend — serviços

Rotas: `auth`, `displays`, `devices`, `broadcasts`, `media`, `settings`, `users`, `organizations`, e as três do ciclo de 2026-07-25: `signup`, `plans`, `billing`. JWT para autenticação, Nodemailer para reset de senha, boas-vindas de cadastro e alerta de device offline, SSE (`sse.service.ts`) para push em tempo real ao Player.

- `POST /api/auth/login`, `POST /api/users/forgot-password`, `POST /api/users/reset-password` têm rate limiting (`express-rate-limit`, 10 tentativas/15min por IP, `middlewares/rate-limit.middleware.ts`).
- Rotas de escrita (`displays`, `devices`, `broadcasts`, `users`) validam payload com Zod (`middlewares/validate.middleware.ts` + `schemas/*.schema.ts`) antes de tocar o banco.
- `GET /api/devices` retorna `online: boolean` computado a partir do `lastSeen` (`ONLINE_THRESHOLD_MS = 60s`, `device.service.ts`) — fonte única usada tanto no frontend (`StatsRow`, `DeviceChips`, `DisplayGrid`, `TopBar`) quanto no backend. `GET /api/devices/health` agrega contagem online/offline.
- Job periódico (`jobs/device-heartbeat-alert.job.ts`, roda a cada 60s fora do ambiente de teste) detecta devices offline há mais de 5min (`OFFLINE_ALERT_THRESHOLD_MS`) e envia e-mail para admins/master, controlado por `Device.lastAlertedAt` para não repetir o alerta na mesma queda.
- `GET/POST /api/organizations`, `GET /api/organizations/:id/report?startDate=&endDate=` (contagem de displays/devices online-offline/broadcasts por Organização e período).
- Boot em produção (`server.ts`) falha com erro claro se faltar qualquer variável de R2 (`R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`) — não cai mais silenciosamente para disco local.
- Testes: Vitest + Supertest (`backend/src/**/__tests__/`) — ver "Estado dos testes" acima para o número atual.

## CI/CD e segredos

- `.github/workflows/ci.yml` — roda em todo PR/push contra `main`: backend (Postgres efêmero, `prisma db push`, build, testes) e frontend (type-check, build).
- `DEPLOY.md` — documenta o fluxo real (GitHub → Portainer na VPS → Cloudflare Tunnel) e onde um staging futuro se encaixaria.
- `SECRETS.md` — decisão de gestão de segredos: variáveis de ambiente configuradas na UI do Portainer por Stack (não `.env` versionado/copiado). Migração dos segredos já em uso para essa configuração ainda é manual (exige acesso à VPS).

## Gaps técnicos — status após 2026-07-15

1. ~~**Armazenamento de mídia**~~ — R2 agora obrigatório e validado no boot em produção ([[Kanban-TelaHub]] — US-001, Concluído). Migração dos arquivos já existentes no disco para o R2 (US-002) segue em "Em Análise", pendente de execução em ambiente de homologação real.
2. ~~**Segurança de API**~~ — rate limiting (US-003) e validação Zod (US-004) implementados e concluídos.
3. **Multi-loja** — ⚠️ **registro corrigido em 2026-07-25, ver a seção abaixo.** O que foi entregue em 2026-07-15 (modelo `Organization`, seletor no Dashboard, relatório agregado — US-005/006/017) foi real, mas era **agrupamento visual, não isolamento**. O isolamento de verdade só veio no ciclo de 2026-07-25.
4. **CI/CD e segredos** — pipeline de CI implementado e decisão de segredos documentada (US-011/US-012), mas **provisionar staging real** e **migrar os segredos já em uso para o Portainer** seguem pendentes — exigem acesso direto à VPS, não executável remotamente.
5. ~~**Observabilidade**~~ — painel de saúde de devices (US-013) e alerta de offline prolongado por e-mail (US-014) implementados.
6. **Acessibilidade** (não listado originalmente, mas trabalhado nesta sessão) — focus trap/Esc corrigidos em todos os modais (US-009); validação com leitor de tela (NVDA) não é executável remotamente, segue pendente.

### Gaps abertos após o ciclo de 2026-07-25

7. **Gateway de pagamento** — não existe. `POST /api/billing/checkout` responde 501 e os campos `gateway*` da `Subscription` ficam nulos (exceto as assinaturas herdadas, marcadas `manual` pelo `seed-prod`). Sem gateway não há webhook, então **nada move o status para `past_due`/`canceled` automaticamente** — na prática o 402 de `requireActiveSubscription` só dispara hoje por assinatura ausente ou alteração manual no banco. O roteiro de integração está escrito na própria rota (`TODO(gateway)`), com a regra anti-cobrança-retroativa como restrição não negociável.
8. **Gate de features de plano** — `hasFeature()` não é chamado por ninguém. Ver a seção destacada acima; é o gap mais relevante em aberto.
9. **Hierarquia entre organizações** — `maxOrganizations` existe no `Plan`, mas o schema não tem `parentOrganizationId`. `countResources()` reconhece a limitação em comentário e conta sempre 1 (a própria org do tenant), então a quota de organizações é inócua enquanto a hierarquia não existir.

## Correção de registro: "multi-loja concluído" não era fronteira de segurança (2026-07-25)

Esta página afirmava, em 2026-07-15, que o sistema "passou a suportar múltiplas lojas dentro do mesmo deploy" e listava Multi-loja como concluído (US-005/006/017). **A entrega existiu** — modelo `Organization`, `organizationId` em `Display`, backfill, seletor de organização no Dashboard e relatório agregado por loja foram feitos e funcionavam. O que estava errado era a **conclusão que se tirava disso**.

Na prática, até o ciclo de 2026-07-25:

- `GET /api/displays` chamava `displayService.getAll()` **sem argumento de escopo** — o backend devolvia os displays de *todas* as organizações para qualquer usuário autenticado (confirmado em `git show HEAD:backend/src/routes/displays.routes.ts`, linha `const displays = await displayService.getAll();`);
- o filtro por loja acontecia **no cliente**, em `Dashboard.tsx` (`displays.filter(d => d.organizationId === selectedOrgId)`), e só quando havia mais de uma organização;
- `User`, `Device` e `Broadcast` sequer tinham `organizationId`.

Ou seja: era um **filtro de visualização**, contornável por qualquer chamada direta à API com um token válido. A lição — e é a mais importante deste ciclo — é que **"Concluído" no quadro Kanban não significa fronteira de segurança**. Uma US de UX ("quero ver minhas lojas separadas") pode ser entregue por inteiro sem que exista uma única linha de isolamento no servidor, e o registro escrito depois herda a confiança do card em vez da do código. Ao registrar entregas que envolvem separação de dados entre clientes, vale sempre a pergunta explícita: *o filtro está no servidor ou na tela?*

O isolamento real (escopo por `req.tenantId`, 404 em acesso cruzado, prefixo de mídia por organização, suíte de testes de isolamento) é o que está descrito na seção "Escopo de tenant" desta página. Aspectos de segurança adjacentes vivem em [[seguranca-e-conformidade-tecnica]].

## Bugs encontrados e corrigidos rodando o projeto de verdade (2026-07-15)

A implementação das User Stories foi validada só com type-check/testes automatizados numa primeira passada — só apareceram problemas reais ao efetivamente subir os dois servidores (`npm run dev` no backend e no frontend) e navegar pela aplicação com um browser controlado (Playwright), clicando nos fluxos como um usuário real faria. Isso confirma a prática do vault de Engenharia de Software: testes automatizados não substituem rodar a aplicação.

1. **Zod rejeitava `coverImage: null`** — o Editor envia `coverImage: null` para limpar a capa de um Display, mas `saveDisplaySchema` (US-004) só aceitava `string | undefined`, não `null`. Toda tentativa de salvar um Display existente retornava 400 silenciosamente (só visível no console do browser). Corrigido com `.nullable()` em `backend/src/schemas/displays.schema.ts`; teste de regressão adicionado em `validation.test.ts`.
2. **`PublishConfirmModal` sem `DialogTitle`** — usava um `<h2>` solto em vez do primitivo `DialogTitle` do Radix, disparando erro de acessibilidade no console (ironicamente, na mesma sessão em que US-009 tratou acessibilidade). Ao investigar, o mesmo padrão (import de `DialogTitle` não utilizado, `<h2>` no lugar) apareceu em **8 modais pré-existentes**: `ConfirmDeleteModal`, `RenameDisplayModal`, `UserManagementModal`, `EmailSettingsModal`, `LinkDeviceModal`, `CreateDisplayModal`, `DisplaySettingsModal`, `AccountSettingsModal`. Todos corrigidos.
3. **"Display Demo" (dado de seed antigo) quebrava o Editor** — essa Display foi criada antes da refatoração para `react-grid-layout` e guarda os widgets da cena em `page.widgets` (posicionamento absoluto), não em `page.layout` (grid). O Editor atual só entende `layout`, e `activePage.layout.find(...)` quebrava com "Cannot read properties of undefined". Corrigido normalizando no backend (`display.service.ts`, função `normalizePage`): toda página sem `layout` ganha `layout: []` na leitura, sem descartar o `widgets` original (fica no dado bruto para uma eventual migração manual, mas a cena aparece vazia no Editor atual em vez de travar a página inteira).
4. **`tsx watch` não reinicia sozinho com confiabilidade neste ambiente Windows** — depois de editar `displays.schema.ts`, o processo do backend não recarregou o código sozinho, e um `TaskStop`/restart normal não matou de fato o processo `node.exe` filho (ficou órfão segurando a porta 3001). Foi preciso `taskkill /F` no PID real (via `netstat -ano` + `tasklist`) antes de subir de novo. Vale lembrar disso ao reiniciar o backend neste projeto nesta VPS/máquina de dev.

Ver também: [[seguranca-e-conformidade-tecnica]] (segurança), [[modelo-comercial-e-precificacao]] e [[concorrentes-e-mercado-signage]] (por que os planos e a regra anti-cobrança-retroativa são o que são), [[canais-de-venda-e-landings]], [[funcionalidades-produto]] (negócio), [[oportunidades-ux]] (UX), [[Kanban-TelaHub]] (quadro).
