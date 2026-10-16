# ==============================
# Stage 1: build do app
# ==============================
#
# CONTEXTO DE BUILD = RAIZ DO MONOREPO (`docker build -f apps/checkout/Dockerfile .`).
# O checkout importa arquivos de `packages/`, fora da pasta dele. Em produção
# quem compila e serve o checkout é o gateway (apps/gateway/Dockerfile); esta
# imagem avulsa só serve a stack 119 durante a transição.
FROM node:22-alpine AS build

WORKDIR /repo/apps/checkout

COPY apps/checkout/package.json apps/checkout/package-lock.json ./
RUN npm ci --production=false

# Wildcard em `packag[e]s`: se a pasta não existir no commit, o COPY não falha.
COPY packag[e]s/ /repo/packages/
COPY apps/checkout/ ./
# Contato exibido no checkout. Vem da stack (Portainer), não do repositório.
ARG VITE_CONTACT_EMAIL=""
ENV VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npm run build

# ==============================
# Stage 2: servir com Nginx
# ==============================
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY apps/checkout/nginx.conf /etc/nginx/conf.d/default.conf
# O build tem `base: '/checkout/'`: os arquivos ficam na pasta checkout/.
COPY --from=build /repo/apps/checkout/dist /usr/share/nginx/html/checkout

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
