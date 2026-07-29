# Deploy — TelaHub

## Fluxo atual (produção)

```
push no GitHub (branch main)
  → pull manual/automático via Portainer na VPS
  → build das imagens (docker-compose.yml)
  → roteamento de acesso via Cloudflare Tunnel
```

Não há ambiente de staging provisionado hoje — todo push em `main` vai, no próximo pull do Portainer, direto para o que os usuários acessam via Cloudflare Tunnel.

## CI (GitHub Actions)

Todo PR contra `main` (e todo push em `main`) roda `.github/workflows/ci.yml`:

- **backend**: sobe um Postgres efêmero, `prisma db push`, `npm run build` (type-check) e `npm test` (Vitest).
- **frontend**: `npm run lint` (type-check) e `npm run build`.

Isso bloqueia merge/deploy se o build ou os testes falharem — mas **não substitui** o pull no Portainer, que continua manual/automático conforme já configurado na VPS.

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

## Pendências (não automatizáveis remotamente)

- **Ambiente de staging separado de produção**: exige provisionar um novo stack/container na VPS (ou um segundo Portainer environment) e um subdomínio próprio no Cloudflare Tunnel. Requer acesso direto à VPS/Portainer/Cloudflare — não foi executado nesta sessão, apenas planejado aqui.
- Quando o staging existir, o fluxo de promoção passa a ser: `PR → CI → merge em main → deploy automático em staging → validação manual → promoção manual/tag para produção`.
