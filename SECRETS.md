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
| SMTP (user/pass) | backend (`email.service.ts`, via `settingsService.getSmtpConfig()`) | Configurado em runtime pela tela de Configurações (banco), não por env var |
| `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | backend (`media.service.ts`) | Stack do Portainer (produção) / `.env` local (dev) |

## Pendência (não automatizável remotamente)

**Migrar os segredos sensíveis já em uso (`JWT_SECRET`, credenciais R2) para dentro da configuração de ambiente do Stack no Portainer**, removendo qualquer cópia manual de `.env` que ainda exista fora do Git. Isso exige acesso direto ao painel do Portainer na VPS — não é executável remotamente nesta sessão. Passos para quem tiver acesso:

1. Abrir o Stack do TelaHub no Portainer → aba "Environment variables".
2. Cadastrar `JWT_SECRET`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` ali (não em arquivo).
3. Remover qualquer `.env` de produção copiado manualmente no servidor, se existir.
4. Validar com `docker compose config` (ou redeploy) que o container sobe corretamente lendo as variáveis do Portainer.
