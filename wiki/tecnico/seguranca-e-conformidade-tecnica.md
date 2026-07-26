---
tipo: tecnico
atualizado: 2026-07-25
tags: [seguranca, multi-tenant, jwt, upload, lgpd, ci, auditoria]
sources:
  - raw/pesquisa/2026-07-25-analise-prontidao-comercial.md
---

# Segurança e conformidade técnica

Esta página existe para **evitar reincidência**. Cada item descreve uma classe de
falha que já aconteceu no TelaHub: o que estava errado, por que era perigoso em
concreto, e como está agora. Está organizada por problema, não por arquivo —
quem chega aqui quer saber "o que já deu errado nesta base".

Contexto de arquitetura (entidades, tenancy, papéis) em
[[arquitetura-e-entidades]]. Consequências comerciais em
[[modelo-comercial-e-precificacao]], [[concorrentes-e-mercado-signage]] e
[[canais-de-venda-e-landings]]. Itens em aberto viram card em [[Kanban-TelaHub]].

---

## 1. Isolamento multi-tenant é fronteira de segurança, não filtro de UI

**A falha mais grave do ciclo.**

**O que estava errado.** `GET /api/displays` chamava `displayService.getAll()`
sem escopo nenhum e devolvia os displays de **todos os clientes**. O modelo
`User` do Prisma sequer tinha `organizationId` — não havia como escopar no
servidor. Qualquer recorte por cliente que existisse acontecia no navegador
(`frontend/components/Dashboard.tsx`).

**Por que era perigoso.** Filtro no cliente não é controle de acesso: bastava um
`curl` com um token válido de qualquer conta para enumerar e ler os dados de
todos os clientes da plataforma. Para um produto vendido como multi-cliente,
isso é vazamento cruzado total.

**Como está agora.**
- `requireTenant` (`backend/src/middlewares/tenant.middleware.ts`) resolve
  `req.tenantId` a partir do usuário autenticado, **no servidor**. Usuário sem
  organização é bloqueado com 403 em vez de cair em escopo "todas".
- Só o role `master` pode ter escopo nulo ("todas as organizações"), e escolhe um
  tenant específico via header `X-Organization-Id` ou `?organizationId=`.
- O `organizationId` de escrita é imposto pelo servidor: `displayService.save()`
  ignora qualquer `organizationId` vindo do corpo da requisição.
- **Acesso cruzado responde 404, nunca 403.** Está escrito no contrato do
  `assertSameTenant` e na classe `TenantScopeError` (`statusCode = 404`). O
  motivo: 403 confirmaria que o recurso existe em outro cliente — um oráculo de
  enumeração.
- Suíte dedicada em `backend/src/routes/__tests__/tenant-isolation.test.ts`,
  cobrindo displays, devices, broadcasts, organizações e usuários — inclusive
  "POST ignora `organizationId` do corpo" e "não sobrescreve display de outro
  tenant (404)".

O filtro que hoje existe no `Dashboard.tsx` é **conveniência de UI para o
master** com mais de uma organização acessível, aplicado sobre dados que a API
já entregou escopados — não é mais a barreira.

**Regra herdada:** dado legado com `organizationId` nulo é considerado fora de
qualquer tenant e só o master o alcança (`npm run db:backfill-tenant` atribui à
organização padrão).

---

## 2. `JWT_SECRET` com fallback público

**A falha mais grave individualmente.**

**O que estava errado.** `auth.service.ts` fazia
`process.env.JWT_SECRET || 'officecom-display-secret'` — e esse valor estava
**versionado no repositório**.

**Por que era perigoso.** Em produção sem a variável configurada, qualquer pessoa
com acesso ao repositório assinava um token com `role: master` e assumia a
plataforma inteira. Não é escalonamento de privilégio: é chave mestra pública.

**Como está agora.** `assertJwtSecretIsSafe(secret, nodeEnv)` — função pura,
exportada e testada (`backend/src/services/__tests__/auth.security.test.ts`) —
roda **no carregamento do módulo** e aborta o boot quando `NODE_ENV=production`
e o segredo:

- está ausente/vazio;
- é igual ao `DEV_FALLBACK_SECRET`;
- tem menos de `MIN_JWT_SECRET_LENGTH` (32) caracteres.

**Decisão de onde ela vive — de propósito em `auth.service.ts`, não no
`server.ts`.** Assim ela cobre **toda porta de entrada** (API HTTP, jobs, seeds,
scripts de backfill), não só o servidor Express. Uma checagem redundante que
existia no `server.ts` foi removida e substituída por um comentário explicando o
porquê — dois lugares com o mesmo segredo literal viram dois lugares para
esquecer de atualizar.

O mesmo `server.ts` mantém, por motivo diferente (perda de dados, não
segurança), o guard de variáveis do R2 em produção.

---

## 3. `TRUST_PROXY` — rate limit que não protegia nada

**O que estava errado.** Não havia `app.set('trust proxy', ...)`. O backend fica
atrás de Nginx + Cloudflare Tunnel, então `req.ip` era **sempre** o IP do proxy.

**Por que era perigoso.** O `authRateLimit` (10 requisições / 15 min, aplicado em
`POST /api/auth/login`, `POST /api/signup`, `GET /api/signup/check-email`,
`forgot-password` e `reset-password`) agrupava todos os visitantes num contador
único. Duplo efeito, ambos ruins: não mitigava força bruta contra uma conta
específica, e ao estourar bloqueava **todos os usuários juntos** — vira DoS
trivial contra o login.

**Como está agora.** `server.ts` lê `TRUST_PROXY` (número de saltos, `loopback`,
ou `false` para desligar) e, em produção sem a variável, emite aviso no boot.
`backend/.env.example` documenta `TRUST_PROXY=2`; o `docker-compose.yml` usa
`${TRUST_PROXY:-1}` como padrão.

**Ponto de atenção em aberto.** O número correto depende do encadeamento real:
Tunnel → Nginx → backend são **2 saltos, não 1**. O default do compose é 1.
**Isso ainda precisa ser confirmado na VPS** — o `DEPLOY.md` descreve a
validação (cadastrar pelo domínio público e conferir no log que os IPs
registrados são de visitantes distintos, não repetidos).

---

## 4. Upload de mídia sem validação de tipo → XSS armazenado

**O que estava errado.** O multer limitava a 50 MB e aceitava **qualquer**
arquivo.

**Correção em duas camadas — e por que a primeira não bastou.**

1. Whitelist de MIME (`ALLOWED_UPLOAD_MIME`). Insuficiente: o `Content-Type` é
   enviado pelo cliente e é trivialmente falsificável. Um `evil.html` declarado
   como `image/png` passava e era gravado em disco **preservando a extensão
   `.html`**.
2. Whitelist de extensão (`ALLOWED_UPLOAD_EXTENSIONS`) somada à de MIME: **os
   dois precisam bater**.

**Por que era perigoso em concreto.** No modo local os uploads são servidos por
`express.static('/uploads')` na **mesma origem do painel** (`server.ts`). Um HTML
com script gravado ali executa no domínio do painel, com acesso ao contexto do
usuário logado: XSS armazenado. No modo R2 o bucket é público — a conta de um
cliente viraria hospedagem de conteúdo arbitrário sob o nosso domínio.

**Status HTTP corrigidos junto.** O wrapper `handleUpload` traduz **415** para
tipo recusado e **413** para tamanho excedido. Antes, ambos caíam no error
handler genérico como **500**, escondendo do usuário o motivo real da recusa.

> ### SVG ficou deliberadamente de fora
>
> SVG é um documento XML que pode carregar `<script>`. Servido na mesma origem do
> painel, um SVG "de imagem" é um vetor de XSS. Liberar SVG exige **antes** uma
> destas duas coisas: servir mídia de outra origem (domínio separado, sem cookie
> de sessão) ou sanitizar o arquivo no upload. Há teste explícito recusando SVG
> com 415 em `backend/src/routes/__tests__/media.upload-security.test.ts`.

Aceitos hoje: JPEG, PNG, GIF, WebP, AVIF, MP4, WebM, OGG e PDF.

---

## 5. Path traversal na mídia

**Como está agora.** Toda chave de mídia é prefixada pela organização
(`<organizationId>/<arquivo>`), tanto no R2 quanto em disco — é isso que isola os
tenants dentro do mesmo bucket/volume.

`mediaService.resolveTenantKeys()` só devolve chaves quando o nome informado pelo
cliente passa por `isSafeBaseName()`, que recusa de verdade: string vazia ou
maior que 512, byte nulo, `/` ou `\`, `.`, `..` ou qualquer ocorrência de `..`, e
caminho absoluto/drive do Windows (`C:`). Se o cliente mandar a chave já
prefixada, o prefixo tem de ser **exatamente** o do tenant. `deleteFile` ainda
faz cinto e suspensório: confere com `path.relative` que o caminho resolvido
continua dentro de `uploads/`.

Nome inválido, nome malicioso e chave de outro tenant caem todos no **mesmo 404
uniforme** — nada de vazar existência por diferença de resposta.

Ressalva registrada: a organização padrão "herda" os arquivos legados na raiz
(sem prefixo), para compatibilidade com o que existia antes do multi-tenant.

---

## 6. Enumeração de slug entre clientes

**O que estava errado.** `Display.slug` é `@unique` **global** — e precisa ser,
porque alimenta a URL pública do player (`/player/:slug`); torná-lo único por
organização deixaria essa rota ambígua. A consequência: um erro de conflito na
criação revelava a um cliente que aquele slug já existia em outro.

**Como está agora.** `display.service.ts` resolve a colisão **em silêncio**, só
na criação: `resolveAvailableSlug()` acrescenta sufixo numérico (`-2` … `-20`) e,
no caso improvável de esgotar, um sufixo aleatório. O chamador nunca sabe que
houve colisão — é exatamente esse o objetivo.

---

## 7. SMTP da plataforma, mas editável por qualquer cliente

**O que estava errado.** As rotas de SMTP usavam `adminMiddleware`, que aceita
`admin` **ou** `master`. Como o SMTP é único e da plataforma (não por tenant), um
admin de qualquer cliente reconfigurava o e-mail de saída de todo mundo — podendo
redirecionar convites e links de reset de senha.

**Como está agora.** `GET /smtp`, `POST /smtp` e `POST /smtp/test` exigem
`masterMiddleware`. `GET /smtp/status` continua apenas autenticado, por devolver
só um booleano `configured`. A senha nunca volta na resposta (`••••••••`), e o
`POST` aceita o sentinela `__KEEP_CURRENT__` para não exigir reenvio.

Nota de deploy: quem administrava o SMTP precisa ter role `master`, senão perde o
acesso (está registrado no `DEPLOY.md`).

---

## 8. Auditoria

Existe o modelo `AuditLog` e o `audit.service.ts`. `logFromRequest()` preenche
organização, usuário e e-mail a partir da requisição autenticada. É **à prova de
falha por design**: `log()` nunca lança — erro ao auditar (banco fora, FK
inválida) é apenas logado no console e a requisição do usuário segue.

Ações instrumentadas hoje: rotas de displays, devices, broadcasts e users
(criação/remoção e alterações sensíveis).

**Lacuna:** grava, mas **não há nenhuma interface para consultar**. Nenhuma rota
de leitura de `AuditLog` existe. Auditoria que ninguém consegue ler só serve
depois do incidente, via acesso direto ao banco.

---

## 9. CI que não testava o que dizia testar

**O que estava errado.** O CI roda `npm run build` antes de `npm test`. Os
arquivos de teste eram compilados para `dist/`, e o vitest então coletava **duas
cópias** de cada suíte (a de `src/` e a de `dist/`). As cópias de `dist`
falhavam e derrubavam a execução inteira — mesmo com 100% dos testes reais
passando. Um CI vermelho por motivo falso treina a equipe a ignorar o CI.

**Como está agora.**
- `backend/tsconfig.build.json` — usado só por `npm run build`, exclui
  `src/**/__tests__/**` e `src/**/*.test.ts`. Bônus: teste não vai para a imagem
  de produção.
- `backend/tsconfig.json` — continua **incluindo** os testes, para que o editor e
  o `tsc --noEmit` sigam checando tipos neles.
- `.github/workflows/ci.yml` ganhou um passo `npm run typecheck` antes do
  `build`, já que o build sozinho deixou de cobrir os testes.

O job de backend sobe Postgres 15 como service, roda `prisma db push`, e usa
`JWT_SECRET: ci-test-secret` com `NODE_ENV: test` — combinação aceita de
propósito pelo guard do item 2, que só fecha em produção.

---

## 10. Lição de método (a mais importante)

Vários destes problemas **não apareceram nos testes**. Apareceram ao **rodar a
aplicação de verdade** e ao reler o código com olhar adversarial — perguntando
"o que um cliente mal-intencionado com token válido consegue fazer?" em vez de
"a funcionalidade funciona?".

E um deles foi **mascarado por uma verificação minha malfeita**: ao checar se o
guard de `JWT_SECRET` abortava o boot, ele "não abortou" na primeira tentativa —
porque o `dist/` estava desatualizado e o build era anterior à edição. Eu quase
concluí que o guard estava errado quando o errado era o teste.

**Regra concreta:** ao testar comportamento de boot (ou qualquer coisa que rode
código compilado), **rebuild antes**. E desconfie de um teste que passa "de
primeira" quando o esperado era falhar — um verde inesperado é sinal de que você
não está testando o que pensa.

Isso reforça a lição já registrada em [[arquitetura-e-entidades]]: teste
automatizado não substitui rodar o sistema.

---

## Lacunas em aberto

### Persistência offline não existe
Só há cache por versão/ETag no player (`GET /api/displays/slug/:slug/version`
com ETag + `304`, e SSE para push). **Não há service worker, IndexedDB nem
workbox** — verificado por busca no `frontend/`. Se a TV perder a rede depois de
um reload, não há conteúdo local para exibir.

Isso tem consequência **comercial, não só técnica**: "funciona offline" é
requisito de linha de base no signage. Ver
[[canais-de-venda-e-landings]] e [[concorrentes-e-mercado-signage]].

### Feature de plano é decorativa
`hasFeature()` existe em `backend/src/services/plan.service.ts` e tem teste em
`subscription.test.ts` — mas **nenhuma rota o chama** (confirmado por grep: as
únicas ocorrências fora do próprio serviço são o teste e o `.d.ts` compilado em
`dist/`).

Ou seja: **quota é aplicada, feature não.** `enforceQuota('device' | 'user')` e
`requireActiveSubscription` bloqueiam de verdade (403 / 402); recursos por plano
(ex.: widget Power BI, SSO) não bloqueiam nada.

Quando isso for implementado, **o gate tem de ser no servidor**. Esconder o
widget no editor não é controle: a chamada direta à API continua funcionando.

### LGPD
O TelaHub é **operador**; o cliente é **controlador**. Faltam termo de
tratamento de dados, canal de privacidade e RoPA. O detalhe legal — e o alívio
da Resolução CD/ANPD nº 02/2022 para agente de pequeno porte — está em
[[concorrentes-e-mercado-signage]]. Impacta venda para cliente corporativo, que
pede esses documentos no processo de compra ([[modelo-comercial-e-precificacao]]).

### Segredos ainda não migrados para o Portainer
`SECRETS.md` fixa a decisão: variáveis de ambiente na UI do Portainer por Stack,
nunca em `.env` versionado ou copiado à mão. A migração de `JWT_SECRET` e das
credenciais R2 **ainda não foi feita** — exige acesso direto ao painel na VPS.
Nota relacionada: as credenciais de SMTP não são env var; ficam no banco
(tabela `Setting`), gravadas em runtime pela tela de Configurações.

---

## Riscos observados e ainda não tratados

Encontrados na leitura do código durante esta página. Exceto o item 1 (corrigido
logo depois, ver abaixo), **nenhum foi corrigido** — estão aqui para virar
decisão explícita (ou card em [[Kanban-TelaHub]]).

1. ~~**CORS por `startsWith`, com `credentials: true`.**~~ **CORRIGIDO em
   2026-07-25.** A origem era aceita se `origin.startsWith(allowed)` — prefixo,
   não igualdade — então `https://dominio.com.br.evil.com` casava com
   `https://dominio.com.br`. Com `credentials: true`, bastava registrar esse
   domínio para ler respostas autenticadas da API em nome do usuário logado.
   Hoje a comparação é por igualdade (`isAllowedOrigin` em `server.ts`,
   normalizando apenas barra final), e o boot avisa quando `CORS_ORIGINS` está
   como `*` em produção — valor que segue sendo o padrão do `docker-compose.yml`
   e que é inseguro com credenciais.
   **Atenção no deploy:** por ser igualdade agora, um `CORS_ORIGINS` configurado
   no Portainer com caminho, barra final divergente ou só parte do domínio faz o
   painel parar de falar com a API. Ver `DEPLOY.md`.
2. **Nenhum cabeçalho de segurança.** `helmet` não está no
   `backend/package.json`. Sem CSP, `X-Content-Type-Options: nosniff`,
   `X-Frame-Options`/`frame-ancestors` nem HSTS pela aplicação. Um CSP restritivo
   seria, aliás, a segunda linha de defesa do item 4.
3. **Conteúdo do player é público por slug.** `GET /api/displays/slug/:slug` e o
   SSE `/slug/:slug/live` respondem sem autenticação — por design, as TVs
   dependem disso. Mas os slugs derivam do nome do display (`loja-centro`), são
   adivinháveis, e o sufixo de colisão do item 6 só muda o caso de empate. Quem
   acertar o slug lê o conteúdo daquele cliente. Se algum cliente colocar dado
   sensível numa tela, isso é exposição. Mitigação possível: slug com componente
   aleatório, ou token no player.
4. **Endpoints públicos de device sem rate limit.** `POST /api/devices/register`,
   `GET /api/devices/:id/status` e `PATCH /api/devices/:id/heartbeat` não passam
   por `authRateLimit` nem por qualquer limitador. Permitem enumeração de status
   por `deviceId` e criação em massa de registros de device. O `authRateLimit` é
   o **único** limitador da aplicação — não há limite global.
5. **pgAdmin exposto no host.** O `docker-compose.yml` publica
   `pgadmin: "5053:80"`. Se a porta 5053 da VPS estiver aberta para a internet, é
   um console de banco acessível só com e-mail/senha de env var. Deveria ficar
   atrás do tunnel/Nginx com auth, ou ligado apenas sob demanda.
6. **Senha SMTP em texto claro no banco.** `settingsService` grava `smtp_pass`
   como valor cru na tabela `Setting`. Quem tiver leitura do banco (ou o pgAdmin
   do item 5) tem a credencial de e-mail da plataforma.
7. **Nome de arquivo com `Math.random()`.** `media.service.ts` e o `diskStorage`
   compõem o nome com `Date.now()` + `Math.random().toString(36)`. Não é CSPRNG:
   nomes de mídia são parcialmente previsíveis. Baixa severidade (o bucket já é
   público), mas trivial de trocar por `crypto.randomUUID()`.
