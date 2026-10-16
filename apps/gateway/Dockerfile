# syntax=docker/dockerfile:1
#
# Gateway do domínio único (devtelahub.proxserverabner.site).
# Compila site, painel e checkout e serve os três atrás de um nginx só, com
# proxy de /api e /uploads para o backend. Ver nginx.conf.
#
# CONTEXTO DE BUILD = RAIZ DO MONOREPO (docker-compose.prod.yml usa
# `context: .`). Os apps importam arquivos de `packages/`, fora da pasta deles.
#
# Todos os VITE_* são lidos em tempo de BUILD e vão para dentro do bundle.
# Trocar um deles exige rebuild, não basta mudar a variável no Portainer.
# Os padrões são caminhos RELATIVOS ao domínio: o mesmo build funciona em
# qualquer nome de host apontado para este gateway.

# ─── Site (landing) ─────────────────────────────────────────────────────────
FROM node:22-alpine AS site
WORKDIR /repo/apps/site
COPY apps/site/package.json apps/site/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --production=false
# Wildcard de propósito: se `packages/` não existir no commit, o COPY não
# falha (nenhum arquivo casa e o passo segue).
COPY packag[e]s/ /repo/packages/
COPY apps/site/ ./
ARG VITE_CHECKOUT_URL=/checkout
ARG VITE_APP_URL=/app
ARG VITE_API_URL=/api
# Lida por scripts/fetch-plans.mjs no começo do build. Se não responder, o
# build segue com o snapshot de src/data/planos.json.
ARG PLANS_API_URL=https://devtelahub.proxserverabner.site/api
ENV VITE_CHECKOUT_URL=$VITE_CHECKOUT_URL \
    VITE_APP_URL=$VITE_APP_URL \
    VITE_API_URL=$VITE_API_URL \
    PLANS_API_URL=$PLANS_API_URL
RUN npm run build

# ─── Painel (base /app/) ────────────────────────────────────────────────────
FROM node:20-alpine AS painel
WORKDIR /repo/apps/painel
COPY apps/painel/package.json apps/painel/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline
COPY packag[e]s/ /repo/packages/
COPY apps/painel/ ./
ARG VITE_API_URL=/api
# "/" vira "" em libs/external-urls.ts: o link de preços fica "/#planos".
ARG VITE_SITE_URL=/
ARG VITE_CHECKOUT_URL=/checkout
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_CHECKOUT_URL=$VITE_CHECKOUT_URL
RUN npm run build

# ─── Checkout (base /checkout/) ─────────────────────────────────────────────
FROM node:22-alpine AS checkout
WORKDIR /repo/apps/checkout
COPY apps/checkout/package.json apps/checkout/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --production=false
COPY packag[e]s/ /repo/packages/
COPY apps/checkout/ ./
# Contato exibido no checkout. Vem da stack (Portainer), não do repositório.
ARG VITE_CONTACT_EMAIL=""
ENV VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npm run build

# ─── nginx ──────────────────────────────────────────────────────────────────
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY apps/gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/gateway/proxy-backend.inc /etc/nginx/telahub/proxy-backend.inc
COPY --from=site /repo/apps/site/dist /usr/share/nginx/html
COPY --from=painel /repo/apps/painel/dist /usr/share/nginx/html/app
COPY --from=checkout /repo/apps/checkout/dist /usr/share/nginx/html/checkout
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
