# syntax=docker/dockerfile:1
#
# CONTEXTO DE BUILD = RAIZ DO MONOREPO (`docker build -f apps/painel/Dockerfile .`).
# O painel importa arquivos de `packages/`, fora da pasta dele. Em produção
# quem compila e serve o painel é o gateway (apps/gateway/Dockerfile); esta
# imagem avulsa serve o painel sozinho, também em /app/.
FROM node:20-alpine AS builder

WORKDIR /repo/apps/painel

# 1. Instala deps — camada cacheada: só re-executa se package.json mudar
COPY apps/painel/package.json apps/painel/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# 2. Copia o resto e faz o build. Wildcard em `packag[e]s`: se a pasta não
# existir no commit, o COPY não falha.
COPY packag[e]s/ /repo/packages/
COPY apps/painel/ ./

# Recebe a URL da API no momento do build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Endereços dos outros dois apps (site de vendas e checkout). Omitir é seguro:
# `libs/external-urls.ts` usa caminhos relativos do domínio único (/ e
# /checkout). Nunca apontar para `telahub.`, que é a stack antiga.
ARG VITE_SITE_URL
ARG VITE_CHECKOUT_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_CHECKOUT_URL=$VITE_CHECKOUT_URL
RUN npm run build

# ── Imagem final: só Nginx + dist ────────────────────────────
FROM nginx:alpine

# O build tem `base: '/app/'`: os arquivos ficam na pasta app/ do nginx.
COPY --from=builder /repo/apps/painel/dist /usr/share/nginx/html/app
COPY apps/painel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3025
CMD ["nginx", "-g", "daemon off;"]
