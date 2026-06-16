# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Instala deps — camada cacheada: só re-executa se package.json mudar
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline

# 2. Copia o resto e faz o build
COPY . .

# Recebe a URL da API no momento do build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Imagem final: só Nginx + dist ────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3025
CMD ["nginx", "-g", "daemon off;"]
