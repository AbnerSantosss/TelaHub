# Deploy — TelaHub

---

# Convenção de nomes (desde 25/09/2026)

Decisão do dono em 25/09/2026. Vale para todos os arquivos deste repositório.

| Hostname | O que é | Túnel |
|---|---|---|
| `telahub.proxserverabner.site` | TelaHub principal: a produção antiga, stack `telahub-novo`, com os dados reais dos clientes | stack antiga |
| `devtelahubpainel.proxserverabner.site` | versão nova: painel, API em `/api`, login e cadastro | `localhost:4025` |
| `devtelahublandingpage.proxserverabner.site` | versão nova: site de vendas | `localhost:4038` |
| `devtelahubcheckout.proxserverabner.site` | versão nova: checkout (hoje simulado) | `localhost:4039` |

Regra curta: `telahub.` é a principal. Tudo com prefixo `devtelahub` é a versão
nova. Os nomes `painel.`, `vendas.` e `checkout.` foram da versão nova até
25/09 e saíram do ar. Não reaproveite esses nomes.

As stacks no Portainer **não foram renomeadas**. Continuam `telahub-prod`,
`telahub-site-prod` e `telahub-checkout-prod`. O Portainer usa o nome da stack
como prefixo dos volumes: renomear cria volumes novos e o banco nasce vazio.

Nunca aponte `telahub.` para a porta `4025`. Isso levaria os clientes da
produção antiga para a versão nova.

---

# Estado do deploy em 05/09/2026 — leia antes de tudo

Levantamento feito nesta data, com o que dá para verificar de fora. Os nomes
da tabela são os que valiam em 05/09. Os atuais estão na convenção acima.

| O que | Situação |
|---|---|
| API pública | responde **502** |
| `painel.proxserverabner.site` (hoje `devtelahubpainel.`) | **não resolve** em DNS |
| `checkout.proxserverabner.site` (hoje `devtelahubcheckout.`) | **não resolve** em DNS |
| `vendas.proxserverabner.site` (hoje `devtelahublandingpage.`) | **não resolve** em DNS |
| `sitetelahub.proxserverabner.site` | **não resolve** em DNS. Não é mais usado |
| Branch de trabalho | `chore/monorepo`, com **58 commits que nunca foram para o GitHub** |
| CI / build-and-push | **nunca rodaram**: disparam em `main`, e nada chegou em `main` |
| Imagens no GHCR | não há imagem nova publicada desta rodada |

Conclusão honesta: **as três stacks novas nunca subiram.** Não existe "estado de
produção" a preservar do trabalho recente — o que está no ar (quando está) é a
stack antiga.

Nada do procedimento abaixo foi executado. Ele depende de acesso à VPS, ao
Portainer e ao Cloudflare, que não existem no ambiente onde este arquivo foi
escrito. **É roteiro para o dono, não relatório de execução.**

---

# Publicação a partir do zero — procedimento numerado

Faça na ordem. Cada fase tem um "só siga se…" no fim; se ele falhar, pare ali —
seguir com a fase seguinte só troca um problema fácil de achar por três difíceis.

Domínios e portas usados daqui para frente (uma linha só, para não haver dúvida):

| App | Porta na VPS | Domínio |
|---|---|---|
| painel + API | `4025` | `devtelahubpainel.proxserverabner.site` |
| site de vendas | `4038` | `devtelahublandingpage.proxserverabner.site` |
| checkout | `4039` | `devtelahubcheckout.proxserverabner.site` |

A **API não tem domínio próprio**: o Nginx do painel faz proxy de `/api/` e
`/uploads/` para `backend:3001`. Logo, o domínio da API **é**
`devtelahubpainel.proxserverabner.site`. Isso vale para o `/api/health`, para o
webhook do Asaas e para qualquer chamada pública.

> O domínio do site é **`devtelahublandingpage.`**. Até 25/09 era `vendas.`.
> Antes disso, `sitetelahub.` aparecia no `build-and-push.yml` sem nenhum
> compose declarar, e o link "ver site" saía do build morto. `VITE_*` é lido em
> tempo de **build**: domínio errado no bundle não se conserta mexendo no
> Portainer, só rebuildando.

## Fase 0 — antes de tocar em qualquer coisa

1. **Backup do banco que está no ar.** Mesmo que a stack antiga esteja meio
   quebrada, o volume dela é o único lugar onde existem os dados dos clientes.

   ```bash
   docker ps                     # descubra o nome do container do Postgres antigo
   docker exec -t <container_db> pg_dump -Fc -U <POSTGRES_USER> <POSTGRES_DB> > telahub-$(date +%F).dump
   ls -lh telahub-*.dump          # confira que o arquivo NÃO tem 0 bytes
   ```

   Copie o arquivo para fora da VPS. Backup que só existe na máquina que pode
   morrer não é backup.

2. **Suba a stack de backup automático** (`infra/backup-compose.yml`), apontando
   `DB_NETWORK` para a rede da stack antiga. Ela faz um dump imediato ao subir.
   Depois de publicar as stacks novas, suba uma segunda instância apontando para
   `telahub_net`.

3. **Rotação de segredos — pendente desde 29/07/2026.** As senhas novas foram
   geradas naquela data e **não há confirmação de que foram aplicadas** nas
   variáveis das stacks. Enquanto não forem, as credenciais antigas continuam
   válidas — e estão no histórico de um repositório **público**. Troque agora,
   nesta ordem: `POSTGRES_PASSWORD`, `JWT_SECRET` (`openssl rand -base64 48`),
   `ADMIN_PASSWORD`, `SMTP_PASS`, `PGADMIN_PASSWORD`. Trocar o `JWT_SECRET`
   invalida todas as sessões: todo mundo vai precisar entrar de novo, e isso é
   esperado.

4. **Repositório ainda é público.** Torná-lo privado é um clique em
   Settings → General → Change visibility. Limpar o histórico (que contém wiki e
   credenciais) exige `git filter-repo` + force-push coordenado — outro dia,
   mas o clique é hoje.

> **Só siga se:** existe um `.dump` de tamanho plausível fora da VPS.

## Fase 1 — GitHub (sem isto, nada chega na VPS)

O Portainer **não builda** as imagens: quem builda é o GitHub Actions, que
publica no GHCR. Enquanto o código não chegar em `main`, o Portainer só tem o
que já existia.

5. Envie a branch e abra o PR:

   ```bash
   git push -u origin chore/monorepo
   ```

   Abra o PR contra `main`. Isso dispara `.github/workflows/ci.yml`, com cinco
   jobs independentes: **claims**, **api**, **painel**, **checkout**, **site**.

   - **claims** é a guarda contra promessa que o produto não cumpre
     (`scripts/verificar-claims-proibidos.mjs`). Se ele falhar, a saída certa é
     apagar a frase, não afrouxar a regra — leia o cabeçalho do script.
   - **api** sobe um Postgres efêmero próprio. Ele nunca toca o banco de
     desenvolvimento nem o de produção: `apps/api/vitest.config.ts` **recusa**
     rodar contra o banco de dev.

   Se quiser rodar o CI antes de abrir PR: aba **Actions → CI → Run workflow**,
   escolhendo a branch (`workflow_dispatch`).

6. Com o CI verde, faça o merge em `main`. Aí sim dispara o
   `build-and-push.yml`, que builda **só os apps cuja pasta mudou** e publica em
   `ghcr.io/abnersantosss/telahub-{backend,frontend,checkout,site}`.

7. Confira no GitHub → Packages que as quatro imagens têm tag `latest` recente.
   Se algum app não mudou de pasta, ele não é republicado — é de propósito. Para
   forçar tudo: **Actions → build-and-push → Run workflow**.

> **Só siga se:** o CI ficou verde e as imagens que você vai usar têm data de hoje.

## Fase 2 — Portainer: preparação

8. **Crie a rede compartilhada**, uma única vez. As três stacks a declaram como
   `external: true` e nenhuma delas sobe se ela não existir:

   ```bash
   docker network create telahub_net
   ```

9. **Cadastre as variáveis da stack do painel** (Portainer → Stacks → a stack →
   Environment variables). **Armadilha que já custou um deploy:** variável
   cadastrada aqui só chega ao container se o compose a repassar em
   `environment:` — se você criar uma variável nova, adicione a linha no compose
   no mesmo commit.

   | Variável | Obrigatória | Observação |
   |---|---|---|
   | `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | sim | banco novo e vazio, próprio desta stack |
   | `JWT_SECRET` | sim | `openssl rand -base64 48`, mín. 32 caracteres |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | sim | banco nasce vazio: sem admin o seed aborta e o container **não sobe** — é proposital |
   | `CORS_ORIGINS` | sim | origens **exatas**, separadas por vírgula: `https://devtelahubpainel.proxserverabner.site,https://devtelahubcheckout.proxserverabner.site,https://devtelahublandingpage.proxserverabner.site`. Barra final a mais derruba a comunicação |
   | `APP_URL` | sim | `https://devtelahubpainel.proxserverabner.site` |
   | `CHECKOUT_URL` | não | padrão `https://devtelahubcheckout.proxserverabner.site/c`. Destino do botão de assinar, lido em `billing.routes.ts` |
   | `TRUST_PROXY` | sim | `2` (Tunnel → Nginx → backend). Com `1`, o rate limit agrupa todos os visitantes num contador só |
   | `SMTP_USER` / `SMTP_PASS` | para haver e-mail | sem elas o sistema sobe e apenas não envia |
   | `SMTP_PROVIDER` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | não | ver seção de e-mail |
   | `COMMERCIAL_EMAIL` | recomendada | destino do aviso de lead novo do site |
   | `PAYMENT_PROVIDER` | sim para cobrar | `asaas`. Com `simulado`, produção **recusa** e as rotas de cobrança respondem 503 (o backend não morre: ele também serve o Player) |
   | `ASAAS_ENV` | sim | `sandbox` para validar, `production` para cobrar de verdade |
   | `ASAAS_API_KEY` | sim para cobrar | **segredo** — chave do ambiente escolhido. Chave de sandbox com `ASAAS_ENV=production` dá 401 em toda cobrança |
   | `ASAAS_WEBHOOK_TOKEN` | sim para cobrar | **segredo** — sem ele, qualquer um confirma o próprio pagamento com um `curl` |
   | `ASAAS_NFSE_ENABLED` | não (`false`) | `false` = nota manual no primeiro mês |
   | `GTM_CONTAINER_ID` | recomendada | `GTM-…` do container único (site+painel+checkout) |
   | `META_PIXEL_ID` | recomendada | público, vai no HTML |
   | `META_CAPI_ACCESS_TOKEN` | recomendada | **segredo**, nunca no frontend nem no Git |
   | `META_CAPI_TEST_EVENT_CODE` | **vazio em produção** | preenchido, todo evento entra como teste e não otimiza campanha |
   | `COMPANY_CNPJ` | sim | identificação do fornecedor (CDC art. 6º, III); sem ela a página não deveria cobrar nem anunciar |
   | `PRIVACY_CONTACT_EMAIL` | sim | canal do titular (LGPD art. 18) |
   | `SITE_PUBLIC_URL` | sim | `https://devtelahublandingpage.proxserverabner.site`. **Nunca** `telahub.com.br`: é domínio de terceiro desde 2025 |

   Os três segredos estão escritos no compose como `${VAR}` **sem valor
   padrão**, de propósito. Se algum ficar em branco, o container sobe com a
   variável vazia — e a falha aparece só na hora de cobrar. Confira antes.

> **Só siga se:** `docker network ls | grep telahub_net` mostra a rede.

## Fase 3 — subir as stacks, uma por vez

Uma por vez, conferindo cada uma antes da seguinte. Não há staging: as três
juntas erradas caem juntas, e aí não se sabe qual quebrou.

10. **Stack do painel + API** — repositório `TelaHub`, branch `main`, compose
    `docker-compose.prod.yml`. Ela sobe `db`, `backend` e `frontend`.

    O boot do backend roda, nesta ordem e encadeado com `&&`:
    `migrate-deploy.js` → `backfill-tenant-scope` → `seed-plans` → `seed-prod` →
    `npm start`. Se o seed falhar (falta `ADMIN_PASSWORD`, por exemplo), o
    container **não sobe** — melhor do que subir sem admin.

    Acompanhe o log até ver `🚀 Backend disponível`. O healthcheck tem
    `start_period` de 120s justamente porque migração + três seeds demoram; até
    lá o container aparece como `starting`, e isso é normal.

    ```bash
    docker ps --format '{{.Names}}\t{{.Status}}'   # o backend deve virar (healthy)
    ```

11. **Stack do checkout** — compose `apps/checkout/docker-compose.prod.yml`.
    O Nginx dele faz `proxy_pass http://backend:3001`. **Atenção:** se a stack
    antiga ainda estiver de pé na mesma rede, o nome `backend` fica ambíguo.
    Confirme para qual backend ele resolve antes de considerar validado:

    ```bash
    docker exec -it telahub-checkout-prod getent hosts backend
    ```

12. **Stack do site** — compose `apps/site/docker-compose.prod.yml`.

13. **Stack de backup da base nova** — `infra/backup-compose.yml` com
    `DB_NETWORK=telahub_net` e um `BACKUP_NAME` diferente do da outra.

> **Só siga se:** os três containers estão `running` e o backend está `healthy`.

## Fase 4 — Cloudflare Tunnel

O `cloudflared` roda no **host** da VPS e roteia para `localhost:PORTA` (ele não
enxerga nome de container — é por isso que os composes publicam portas).

14. Cloudflare Zero Trust → Networks → Tunnels → o túnel desta VPS → **Public
    Hostnames**. Crie as três rotas:

    | Hostname | Serviço |
    |---|---|
    | `devtelahubpainel.proxserverabner.site` | `http://localhost:4025` |
    | `devtelahublandingpage.proxserverabner.site` | `http://localhost:4038` |
    | `devtelahubcheckout.proxserverabner.site` | `http://localhost:4039` |

    Apague as rotas antigas `painel.`, `vendas.` e `checkout.` se ainda
    existirem. Esses nomes saíram do ar em 25/09.

15. **Não crie rota `telahub.` para a versão nova.** Versões anteriores deste
    arquivo pediam uma rota extra `telahub.proxserverabner.site → localhost:4025`
    para o formulário de lead do site. Essa rota nunca foi criada e não deve
    ser. `telahub.` é o TelaHub principal e continua apontando para a stack
    antiga.

    O site agora recebe dois build args, os dois com padrão
    `https://devtelahubpainel.proxserverabner.site/api`:

    | Build arg | Quem usa |
    |---|---|
    | `VITE_API_URL` | formulário de lead (`apps/site/src/lib/funnel.js`), embutido no bundle |
    | `PLANS_API_URL` | busca de preços no build (`apps/site/scripts/fetch-plans.mjs`) |

    Com isso o formulário e a busca de preços falam direto com a API nova, pelo
    painel dev. Nenhuma rota extra é necessária.

16. Confirme que cada hostname resolve em DNS antes de testar no navegador
    (`nslookup devtelahubpainel.proxserverabner.site`). Hostname criado no
    túnel só existe depois que o registro propaga.

> **Só siga se:** os três domínios abrem alguma coisa que não seja 502/1033.

## Fase 5 — Asaas (cobrança)

17. No painel do Asaas → Integrações → **Webhooks**, cadastre:

    ```
    https://devtelahubpainel.proxserverabner.site/api/webhooks/asaas
    ```

    (Se você criou um hostname dedicado para a API, use
    `https://<dominio-da-api>/api/webhooks/asaas` — o caminho é sempre esse.)

    Marque os eventos de cobrança (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`,
    `PAYMENT_OVERDUE`). Guarde o **token** que o Asaas envia no cabeçalho e
    coloque-o em `ASAAS_WEBHOOK_TOKEN`. Sem o token, a rota aceita qualquer
    chamada de quem descobrir a URL — ou seja, qualquer um confirma o próprio
    pagamento.

18. Valide primeiro em `ASAAS_ENV=sandbox`: faça uma cobrança de teste e veja no
    log do backend o webhook chegando e a assinatura virando `active`. Só depois
    troque para `production` **e** troque a chave junto. Ambiente e chave andam
    em par.

## Fase 6 — como saber que deu certo

Três verificações. As três, não uma.

19. **A API responde:**

    ```bash
    curl -i https://devtelahubpainel.proxserverabner.site/api/health
    ```

    Esperado: `200` e `{"status":"ok","timestamp":"…"}`. Um **502 aqui significa
    que o Nginx do painel subiu mas o backend não** — vá para o log do container
    do backend, não para o Cloudflare.

    ```bash
    curl -s https://devtelahubpainel.proxserverabner.site/api/plans | head -c 400
    ```

    Deve listar o catálogo. Se vier vazio, o `seed-plans` não rodou.

20. **Um cadastro real, pelo domínio público.** Abra
    `https://devtelahubpainel.proxserverabner.site` numa janela anônima, crie uma conta
    pelo signup, confirme que entra no painel e que o e-mail de boas-vindas
    chega. Isso exercita, de uma vez: DNS, túnel, Nginx, CORS, banco, JWT, SMTP
    e o rate limit com `TRUST_PROXY` certo. No log, confira que o IP registrado
    é o do **visitante**, não o do proxy — se todos vierem iguais, `TRUST_PROXY`
    está errado.

21. **Uma tela conectando de verdade.** Abra o Player numa TV (ou numa aba),
    pareie com o código gerado no painel e confirme que o conteúdo aparece e que
    o dispositivo fica **online** na lista. É o único teste que prova que
    telemetria e uploads atravessam o túnel.

    Bônus, se você mexeu em cobrança: um checkout de ponta a ponta em sandbox,
    até a assinatura ficar `active`.

> Se as três passarem, está publicado. Anote a data aqui neste arquivo.

## Se der errado — rollback

- **Stack nova quebrada, antiga ainda de pé:** a antiga não é afetada. Cada
  uma tem os próprios hostnames (`telahub.` para a antiga, `devtelahub*` para
  a nova). Não reponte nomes de uma para a outra. Conserte a nova pelo log do
  container ou volte a imagem (item abaixo).
- **Imagem ruim:** o `build-and-push` publica a tag `:latest` **e** a
  `:<sha>`. Troque a tag no compose para o sha anterior e faça redeploy. Voltar
  é repontar a tag, não "reverter e rebuildar".
- **Banco:** restaure o dump da Fase 0 num banco descartável **primeiro** e
  confira que os dados estão lá, antes de restaurar por cima do que está no ar.

---

## Fluxo atual (produção)

```
push/merge em main
  → GitHub Actions builda as imagens e publica no GHCR (build-and-push.yml)
  → webhook do Portainer (ou pull manual) recria a stack na VPS
  → roteamento de acesso via Cloudflare Tunnel
```

O build é no **Actions**, não na VPS: as variáveis `VITE_*` são resolvidas em
tempo de build e ficam dentro do bundle, buildar na VPS disputa RAM com o que
está no ar, e imagem com tag transforma rollback em "repontar a tag".

Não há ambiente de staging provisionado hoje — todo push em `main` vai, no próximo pull do Portainer, direto para o que os usuários acessam via Cloudflare Tunnel.

## CI (GitHub Actions)

Todo PR contra `main` (e todo push em `main`, mais o botão manual
`workflow_dispatch` em qualquer branch) roda `.github/workflows/ci.yml`:

- **claims**: `node scripts/verificar-claims-proibidos.mjs`. Varre o texto de
  `apps/site/src`, `apps/checkout/src` e `apps/painel` e **falha o build** se
  encontrar promessa que o produto não cumpre — trial de 14 dias, funcionamento
  offline/sem internet, app nativo, white-label/marca própria, SSO, SLA, API
  externa, múltiplas unidades, multi-org, uptime/99,9%, "mais vendido",
  depoimento, o domínio de terceiro `telahub.com.br` e o placeholder
  `GTM-XXXXXXX`. Job próprio: **não sobe banco e não instala dependência**.
  Quatro reincidências motivaram isto; a quinta é questão de tempo.
  Frase que **nega** o claim (páginas legais, FAQ) e comentário de código não
  são acusados; quando faltar, há o marcador `claims-permitido` documentado no
  cabeçalho do script.
- **api**: sobe um Postgres efêmero, `prisma db push`, seed de planos,
  `npm run typecheck`, `npm run build` e `npm test` (Vitest). Desde 05/09 o job
  define **`TEST_DATABASE_URL`** além de `DATABASE_URL`: `apps/api/vitest.config.ts`
  se recusa a rodar a suíte contra o banco de desenvolvimento (uma execução
  interrompida contra ele já deixou 13 planos `pay-loja-*` **ativos no catálogo
  público**).
- **painel**: `npm run lint` (type-check) e `npm run build`.
- **checkout**: `npm run lint` (type-check) e `npm run build`.
- **site**: `npm run lint` (ESLint) e `npm run build` (inclui SSR + pré-render).

Isso bloqueia merge/deploy se o build ou os testes falharem — mas **não substitui** o pull no Portainer, que continua manual/automático conforme já configurado na VPS.

## Migração para monorepo (2026-07-31) — LEIA ANTES DO PRÓXIMO DEPLOY

Os três repositórios (`TelaHub`, `TelaHub-Checkout`, `site-telas`) viraram um só.
O código agora vive em `apps/api`, `apps/painel`, `apps/checkout` e `apps/site`.
A justificativa está no ADR-002, em `apps/checkout/README.md`.

**O que NÃO mudou** (de propósito, para o deploy não virar um segundo problema):
nomes das imagens no GHCR, nomes dos serviços Docker, portas, domínios e a
topologia de stacks. Continuam sendo três stacks independentes.

**O que mudou e exige ação manual.** Nada disso pode ser feito por script a
partir daqui — depende de acesso ao GitHub e ao Portainer:

1. **Secrets de webhook no repositório `TelaHub`** (Settings → Secrets → Actions).
   Antes cada repositório tinha um `PORTAINER_WEBHOOK`. Agora são três, porque
   um workflow só precisa saber qual stack recriar:

   | Secret | Stack |
   |---|---|
   | `PORTAINER_WEBHOOK` | painel (api + painel) — já existe |
   | `PORTAINER_WEBHOOK_CHECKOUT` | checkout — copiar do repo `TelaHub-Checkout` |
   | `PORTAINER_WEBHOOK_SITE` | site — copiar do repo `site-telas` |

   Secret ausente = o passo é pulado com aviso e o deploy daquela stack é
   manual. É de propósito: webhook errado recria a stack errada, o que é pior
   que não recriar nenhuma.

2. **Repontar cada stack no Portainer** para o repositório `TelaHub`, ajustando
   o caminho do compose:

   | Stack | Compose antes | Compose agora |
   |---|---|---|
   | painel | `docker-compose.prod.yml` (repo `TelaHub`) | igual — só os `context:` mudaram para `./apps/...` |
   | checkout | `docker-compose.prod.yml` (repo `TelaHub-Checkout`) | `apps/checkout/docker-compose.prod.yml` |
   | site | `docker-compose.prod.yml` (repo `site-telas`) | `apps/site/docker-compose.prod.yml` |

3. **Faça uma stack por vez, e confirme o site no ar antes da seguinte.** Não há
   staging: se as três forem repontadas juntas e algo estiver errado no caminho
   do compose, cai tudo ao mesmo tempo.

**Rollback.** Os três repositórios antigos continuam existindo, intactos, com a
tag `pre-monorepo-2026-07-31` no último commit anterior à migração. Reverter é
repontar a stack de volta para o repositório antigo — não exige desfazer nada no
monorepo. **Não apague os repositórios antigos** até as três stacks estarem
rodando do monorepo e validadas.

### Preço do site agora vem da API

`apps/site` não tem mais preço escrito à mão. O build roda
`scripts/fetch-plans.mjs`, que busca `GET /api/plans` e grava
`src/data/planos.json`. Duas consequências para o deploy:

- Se a API estiver fora do ar durante o build, o script **avisa e usa o snapshot
  versionado** em vez de falhar. Um reajuste publicado com a API fora sai com o
  preço antigo — confira o log do build ao publicar mudança de preço.
- O alvo padrão é `https://devtelahubpainel.proxserverabner.site/api`. No
  Docker ele chega pelo build arg `PLANS_API_URL`. Para apontar para outro
  ambiente fora do Docker: `PLANS_API_URL=... npm run build`.

## Promoção para produção (estado atual, sem staging)

1. Abrir PR contra `main`.
2. Aguardar o CI (`ci.yml`) passar.
3. Fazer merge.
4. Portainer puxa a nova imagem (conforme configuração de auto-update/webhook já existente, ou pull manual).
5. Cloudflare Tunnel continua roteando para o mesmo container — nenhuma mudança de DNS/tunnel necessária num deploy normal.

## Deploy do ciclo comercial (2026-07-25) — leia antes do próximo pull no Portainer

Este ciclo introduziu isolamento multi-tenant, planos/assinatura e cadastro self-service. São mudanças que **alteram o comportamento de contas já em uso**, então o deploy tem particularidades. Não há staging: o próximo pull do Portainer vai direto para o que os usuários acessam pelo Cloudflare Tunnel.

### O que acontece sozinho

O `command` do serviço `backend` no `docker-compose.yml` foi estendido e executa, nesta ordem, a cada start do container (todos idempotentes):

1. `prisma db push` — aplica `Plan`, `Subscription`, `AuditLog`, `User.organizationId`, `Device.organizationId`, `Device.activatedAt`, `Broadcast.organizationId`.
2. `prisma/backfill-tenant-scope.ts` — vincula usuários, devices e broadcasts pré-existentes à organização padrão.
3. `prisma/seed-plans.ts` — cria o catálogo de planos.
4. `prisma/seed-prod.js` — usuários/display demo e **assinatura herdada** (`active`, gateway `manual`) para toda organização que ainda não tinha uma.

Os passos 2 e 3 dependem de `tsx`, presente na imagem porque o Dockerfile copia o `node_modules` inteiro do estágio de build. Se o build passar a instalar só dependências de produção, esses scripts precisam ser convertidos para JS puro antes do próximo deploy.

### O que exige ação manual

- **Todos os usuários precisam sair e entrar de novo.** O payload do JWT passou a incluir `organizationId`. Um token emitido antes deste deploy continua sendo aceito, mas com `organizationId` nulo — e qualquer usuário que não seja `master` recebe **403 "Usuário não vinculado a nenhuma organização"** até relogar. Avise antes de puxar a imagem.
- **Confira o backfill no log do container** após o start. Se o passo 2 falhar (por exemplo, banco ainda subindo), os registros antigos ficam com `organizationId` nulo e **desaparecem** da visão de usuários comuns — só o `master` os vê. Nesse caso, rode manualmente no shell do container: `npx tsx prisma/backfill-tenant-scope.ts`.
- **Uploads mudaram de caminho**: novos arquivos vão para `uploads/<organizationId>/...` no volume `uploads_data`. Arquivos antigos, sem prefixo, continuam sendo servidos (são tratados como pertencentes à organização padrão). O `express.static('/uploads')` já resolve subpastas — nenhuma mudança de Nginx ou de tunnel é necessária.
- **Rotas públicas novas atravessam o Cloudflare Tunnel**: `POST /api/signup`, `GET /api/signup/check-email` e `GET /api/plans` respondem sem autenticação, por definição (quem se cadastra ainda não tem conta). O signup tem rate limit de 10 requisições por 15 minutos por IP. **Corrigido neste ciclo**: o backend não tinha `trust proxy`, então atrás de Nginx + Cloudflare Tunnel o `req.ip` era sempre o do proxy — o rate limit agrupava todos os visitantes num contador único (não protegia contra força bruta e bloquearia todos juntos). Agora há a variável `TRUST_PROXY` (número de proxies à frente; o compose usa `1` por padrão) e o backend avisa no boot se ela faltar em produção. **Confira o valor real do seu encadeamento**: se o Tunnel entrega ao Nginx que entrega ao backend, o número de saltos é `2`, não `1`. Para validar, cadastre-se pelo domínio público e confirme no log que os IPs registrados são de visitantes distintos, não repetidos.
- **`CORS_ORIGINS` agora exige a origem exata.** A comparação era por prefixo (`origin.startsWith`), o que deixava `https://seudominio.com.br.evil.com` ser aceito como se fosse `https://seudominio.com.br` — combinado com `credentials: true`, permitia a um domínio registrado pelo atacante ler respostas autenticadas da API. Agora é igualdade. **Confira o valor configurado no Portainer antes do deploy**: se ele estiver com caminho, barra final divergente ou apenas parte do domínio, o painel para de conseguir falar com a API. Liste as origens exatas, separadas por vírgula. O valor `*` continua aceito (é o padrão do compose) mas agora o backend avisa no boot que ele é inseguro com credenciais.

- **SMTP virou configuração da plataforma**: `GET/POST /api/settings/smtp` passou de `admin` para `master`. Um admin de cliente não reconfigura mais o e-mail de todo mundo — mas confira se quem administra o SMTP hoje tem role `master`, senão perde o acesso.

### O que ainda não gera receita

`POST /api/billing/checkout` responde **501** de propósito: não há gateway integrado. As assinaturas ficam em `active` (herdadas) ou `active` no plano grátis (contas novas), e nada transiciona para `past_due` sozinho. Enquanto isso não existir, o sistema controla quota e mostra plano, mas não cobra ninguém.

## E-mail transacional (2026-07-29) — variáveis novas na stack

O envio deixou de ser fixo em Gmail. O provedor padrão da instalação vem das
variáveis abaixo; o que o `master` salvar em Configurações de E-mail fica no
banco e **tem precedência** sobre elas.

| Variável | Obrigatória | Observação |
|---|---|---|
| `SMTP_USER` | sim, para haver envio | Usuário de autenticação |
| `SMTP_PASS` | sim, para haver envio | Senha de app / chave de API |
| `SMTP_PROVIDER` | não (padrão `gmail`) | Define host, porta e criptografia pelo catálogo |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | não | Só com `custom` ou região alternativa (Mailgun EU, SES fora de us-east-1) |
| `SMTP_FROM_EMAIL` | só em SendGrid/Resend | Nesses, o usuário é a palavra fixa `apikey`/`resend` e não serve de remetente |
| `SMTP_FROM_NAME` | não (padrão `TelaHub`) | Nome exibido |

**Nenhuma delas derruba o boot se faltar** — sem `SMTP_USER`/`SMTP_PASS` o
sistema sobe e apenas não envia e-mail. Isso é deliberado, e é o oposto do que
aconteceu com `ADMIN_PASSWORD` no incidente de 2026-07-26: variável nova que
*exige* valor é mudança incompatível para todo ambiente já existente.

Instalações que já tinham SMTP configurado pelo painel **não precisam de nada**:
a configuração antiga (só usuário e senha) continua sendo lida como Gmail.

Configure no Portainer, em "Environment variables" da stack — nunca no código.

## Migrações versionadas (2026-08-29) — LEIA ANTES DO PRÓXIMO DEPLOY

Até esta data o deploy rodava `prisma db push`. Isso sincroniza o schema
comparando o banco com o arquivo, **sem histórico**, e quando encontra
divergência resolve APAGANDO dado — o `start` da raiz chegava a passar
`--accept-data-loss` explicitamente. Era a dívida mais perigosa do deploy.

Agora existe `prisma/migrations/` e o boot roda `node prisma/migrate-deploy.js`.

### O que acontece sozinho no próximo deploy

O banco de produção já tem as tabelas (criadas por `db push`) mas **não tem** a
tabela de controle `_prisma_migrations`. Nesse estado, um `migrate deploy`
puro tentaria criar tudo de novo e falharia com "already exists".

`migrate-deploy.js` detecta isso e faz o *baseline* sozinho:

| Estado do banco | O que o script faz |
|---|---|
| Vazio (sem `User`) | `migrate deploy` cria tudo |
| Com tabelas, sem histórico (**produção hoje**) | marca `00000000000000_baseline` como aplicada e só então roda `deploy` |
| Já com histórico | `migrate deploy` normal |

É idempotente — pode rodar em todo boot. Os três cenários foram exercitados
contra bancos descartáveis antes da troca, inclusive verificando que o dado
pré-existente sobrevive ao baseline.

### O que muda no dia a dia

- Mudou o schema? `npm --prefix apps/api run db:migrate -- --name descricao`
  gera a migração; ela vai versionada no git e é aplicada no deploy.
- `db push` continua no `package.json` para experimento local, mas **não é mais
  o caminho de produção**.
- Antes de subir uma migração destrutiva (drop/rename de coluna com dado),
  siga expand/contract: adicione o novo, migre o dado, só remova o antigo num
  deploy seguinte.

### Backup antes do primeiro deploy com migração

O baseline não escreve nas tabelas de negócio, mas é a primeira vez que o
histórico é criado. Rode o backup manual (`infra/backup-compose.yml`) e
confirme o dump antes de promover.

## Pendências (não automatizáveis remotamente)

- **Rotação de segredos no Portainer** (US-P0-05): as senhas novas foram geradas em 2026-07-26 mas **não há confirmação de que foram aplicadas** nas variáveis de ambiente das stacks — pendente desde 29/07/2026. Exige acesso ao Portainer. Enquanto não for feito, o histórico público do repositório contém as credenciais antigas ainda válidas. Está como passo 3 da Fase 0 do procedimento acima.
- **Repositório GitHub privado** (US-P0-05): o histórico contém a wiki inteira e credenciais. Tornar privado é um clique nas configurações do repositório; limpar o histórico exige `git filter-repo` + force-push coordenado.
- **`ARG VITE_API_URL` no `apps/site/Dockerfile`**: resolvido em 25/09/2026. O Dockerfile declara `VITE_API_URL` e `PLANS_API_URL`, e o site é buildado com `https://devtelahubpainel.proxserverabner.site/api` nos dois. A rota extra `telahub. → 4025`, pedida em versões anteriores deste arquivo, nunca foi criada e não deve ser: `telahub.` é da stack antiga.
- **Stack legada ainda roda `prisma db push`**: ela puxa `docker-compose.yml`, que mantém `db push` porque é também o compose de desenvolvimento. Trocar o comando ali mudaria o comportamento da stack legada no próximo pull. O caminho é **aposentar a stack legada** depois que as três novas estiverem validadas — não repuxá-la. A stack de produção nova (`docker-compose.prod.yml`) já usa `migrate deploy`.
- **pgAdmin**: saiu do caminho padrão. Continua em `docker-compose.yml` mas atrás do profile `db-admin`, então `docker compose up` não o inicia mais — nem no seu micro, nem numa stack que aponte para esse arquivo. Para usar localmente: `docker compose --profile db-admin up -d pgadmin`. No servidor, use `docker exec -it <db> psql`.
- **Variáveis novas desta rodada** (definir na stack antes do deploy):
  - `COMMERCIAL_EMAIL` — para onde vai o aviso de lead novo do site. Sem ela, o aviso cai no próprio remetente do SMTP.
  - `CORS_ORIGINS` — precisa incluir a origem do **site** agora que a LP chama `POST /api/leads`. Sem isso, o formulário de contato é bloqueado pelo navegador.
  - `VITE_API_URL` e `PLANS_API_URL` (build args do site): base da API para o formulário de lead e para a busca de preços. Padrão `https://devtelahubpainel.proxserverabner.site/api`.
  - `CHECKOUT_URL` (stack do painel): destino do botão de assinar. Padrão `https://devtelahubcheckout.proxserverabner.site/c`.
  - Opcionais de ajuste fino: `HTTP_PROXY_ALLOWED_HOSTS`, `DEVICE_REGISTER_RATE_LIMIT`, `DEVICE_TELEMETRY_RATE_LIMIT`, `PROXY_RATE_LIMIT`, `LEAD_RATE_LIMIT`.
- **Placeholders do site** (US-P0-07, parcial): WhatsApp `wa.me/5500000000000`, `CNPJ 00.000.000/0001-00`, `GTM-XXXXXXX` e o domínio `telahub.com.br` (que é de **terceiro** desde 2025) dependem de dados que só o dono tem. Desde 05/09 o `GTM-XXXXXXX` e o `telahub.com.br` **derrubam o CI** (job `claims`), então não voltam sem alguém ver. O formulário de lead, que era um `setTimeout` sem gravar nada, **já foi ligado ao backend**.
- **Ambiente de staging separado de produção**: exige provisionar um novo stack/container na VPS (ou um segundo Portainer environment) e um subdomínio próprio no Cloudflare Tunnel. Requer acesso direto à VPS/Portainer/Cloudflare — não foi executado nesta sessão, apenas planejado aqui.
- Quando o staging existir, o fluxo de promoção passa a ser: `PR → CI → merge em main → deploy automático em staging → validação manual → promoção manual/tag para produção`.
