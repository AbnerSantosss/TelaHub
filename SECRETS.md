# Gestão de segredos — TelaHub

## Decisão

Dado que a infra atual é uma VPS única gerenciada via Portainer (sem Kubernetes/Vault/cloud secrets manager), a solução escolhida é:

**Variáveis de ambiente configuradas diretamente na UI do Portainer (por Stack), nunca em arquivo `.env` versionado ou copiado manualmente entre ambientes.**

Motivo: o Portainer já guarda variáveis de ambiente por Stack no seu próprio banco (não no Git), o que já resolve o requisito central — "segredos não vêm de arquivo versionado" — sem introduzir uma ferramenta nova (Vault, Doppler, etc.) que a infra atual não justifica pelo tamanho do projeto.

## Segredos em uso

| Variável | Onde é usada | Origem hoje |
|---|---|---|
| `DATABASE_URL` | backend | Stack do Portainer (produção) / `.env` local (dev) |
| `JWT_SECRET` | backend (`auth.service.ts`) | Stack do Portainer (produção) / `.env` local (dev) |
| `POSTGRES_PASSWORD` | banco (compose) | Stack do Portainer |
| `ADMIN_PASSWORD` | seed de produção (`prisma/seed-prod.js`) | Stack do Portainer — só é lida quando há admin a criar ou `ADMIN_PASSWORD_RESET=true` |
| `PGADMIN_PASSWORD` | pgAdmin (compose antigo) | Stack do Portainer |
| `SMTP_*` | backend (`email.service.ts`, via `settingsService.getSmtpConfig()`) | Stack do Portainer como **padrão de fábrica**; o que o `master` salvar na tela de Configurações fica no banco e tem precedência |
| `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | backend (`media.service.ts`) | Stack do Portainer (produção) / `.env` local (dev) |

## Rotação de segredos — procedimento

Escrito em 2026-07-29, quando as credenciais que estiveram versionadas em
repositório público (senha do seed, do Postgres e do pgAdmin, além do
`JWT_SECRET` com fallback público) foram rotacionadas. Cada segredo tem um
procedimento diferente, e **três deles quebram o ambiente se forem trocados só
na variável**. Guardado aqui para a próxima rotação não exigir redescobrir isso.

Os valores antigos não são repetidos neste arquivo de propósito: enquanto a
rotação não é aplicada no servidor, eles continuam sendo senhas **ativas**.

### `ADMIN_PASSWORD` — senha do admin do painel

A mais simples. O seed **não reescreve** a senha em cada boot (regra que fechou o
incidente de 2026-07-26); para redefinir de propósito é preciso pedir:

1. Na stack, definir `ADMIN_PASSWORD=<nova>` e `ADMIN_PASSWORD_RESET=true`.
2. Redeploy. O log deve mostrar `senha redefinida por ADMIN_PASSWORD_RESET`.
3. **Voltar `ADMIN_PASSWORD_RESET` para `false`** — senão todo restart futuro
   desfaz qualquer troca feita pelo painel, que era exatamente o bug antigo.

Mínimo de 12 caracteres, validado pelo próprio seed.

### `POSTGRES_PASSWORD` — a que quebra se feita errado

⚠️ **Trocar a variável não muda a senha do banco.** A imagem do Postgres só usa
`POSTGRES_PASSWORD` na **primeira** inicialização do volume; num banco que já
existe, a senha continua a antiga e o backend passa a receber
`password authentication failed` — ou seja, o sistema cai.

Ordem correta (a senha muda **no banco primeiro**, na variável depois):

```sh
# 1. Com a stack no ar, altere a senha dentro do Postgres:
docker exec -it <container-do-db> psql -U <POSTGRES_USER> -d <POSTGRES_DB> \
  -c "ALTER USER <POSTGRES_USER> WITH PASSWORD '<nova-senha>';"

# 2. Só então atualize POSTGRES_PASSWORD na stack e faça redeploy.
```

A `DATABASE_URL` do compose é montada a partir dessa variável, então ela se
ajusta sozinha. Evite `@`, `:`, `/` e aspas na senha: ela vai dentro de uma URL
de conexão.

### `PGADMIN_PASSWORD`

O pgAdmin também só lê a variável na primeira inicialização — o valor fica no
volume `pgadmin_data`. Trocar exige recriar o container **e** o volume, ou mudar
a senha pela própria interface do pgAdmin. Como o pgAdmin não existe na stack
nova (`docker-compose.prod.yml`), a alternativa preferível é simplesmente
**parar de publicá-lo**: um administrador de banco exposto na internet é
superfície de ataque que `docker exec ... psql` substitui sem custo.

### `JWT_SECRET`

Trocar **invalida todos os tokens em circulação**: todo mundo é deslogado e
precisa entrar de novo. Não há erro visível no servidor — o usuário só recebe
401 e reclama. Avise antes.

Rotacionar quando houver suspeita de exposição. Gere com
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`;
o boot em produção recusa segredo com menos de 32 caracteres.

### `SMTP_PASS`

Revogue a senha de app antiga no provedor **antes** de gerar a nova (no Gmail:
`myaccount.google.com/apppasswords`). Atualize a variável e faça redeploy. Se
alguém já tiver salvo uma configuração pela tela de Configurações de E-mail, ela
**tem precedência** sobre a variável — nesse caso a troca precisa ser feita
também no painel.

## Pendência (não automatizável remotamente)

**Migrar os segredos sensíveis já em uso (`JWT_SECRET`, credenciais R2) para dentro da configuração de ambiente do Stack no Portainer**, removendo qualquer cópia manual de `.env` que ainda exista fora do Git. Isso exige acesso direto ao painel do Portainer na VPS — não é executável remotamente nesta sessão. Passos para quem tiver acesso:

1. Abrir o Stack do TelaHub no Portainer → aba "Environment variables".
2. Cadastrar `JWT_SECRET`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` ali (não em arquivo).
3. Remover qualquer `.env` de produção copiado manualmente no servidor, se existir.
4. Validar com `docker compose config` (ou redeploy) que o container sobe corretamente lendo as variáveis do Portainer.
