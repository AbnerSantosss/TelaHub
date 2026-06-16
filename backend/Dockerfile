# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# 1. Instala deps — só re-executa se package.json mudar
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline

# 2. Copia o resto, gera Prisma e compila TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Imagem final leve ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/icones-do-sistema ./icones-do-sistema

# Garante que a pasta de uploads existe
RUN mkdir -p /app/uploads

EXPOSE 3001

# O comando de start será sobrescrito no docker-compose para rodar as migrações antes
CMD ["npm", "start"]
