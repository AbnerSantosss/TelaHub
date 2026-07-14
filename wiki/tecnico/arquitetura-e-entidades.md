---
tipo: tecnico
atualizado: 2026-07-14
tags: [arquitetura, dominio, prisma]
sources: [raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md]
---

# Arquitetura e Entidades de Domínio — TelaHub

Levantamento feito por leitura direta do código (`backend/prisma/schema.prisma`, rotas do backend, `frontend/App.tsx` e componentes), sem execução — ponto de partida para qualquer nova feature.

## Modelo de domínio (Prisma)

- **User** — usuário do sistema (username, email, hash de senha, role `user`/`admin`/master, `lastLogin`). Não há organização/tenant — o modelo é **single-tenant por instância** (um deploy por cliente).
- **Display** — a "tela" lógica: nome, `slug` único (usado na URL pública do player), `pages` (JSON serializado com as cenas do editor), `coverImage`, `updatedAt` usado como versão para cache/SSE.
- **Device** — dispositivo físico pareado via `pairingCode`, vinculado opcionalmente a um `Display`, com `status` (pending/paired) e `lastSeen` (heartbeat).
- **Broadcast** — "anúncio"/interrupção temporária ou permanente que sobrescreve o conteúdo normal de displays (`displayIds`), com janela `startTime`/`endTime` e flag `active`.
- **Setting** — key-value genérico (usado para config SMTP).
- **PasswordReset** — tokens de recuperação de senha com expiração.

## Fluxos de usuário / telas (frontend)

Rotas (`App.tsx`): `/login`, `/forgot-password`, `/reset-password`, `/vendas` (landing pública), `/` (Dashboard), `/edit/:id` (Editor), `/scheduler`, `/player` e `/player/:slug` (públicas, para TVs).

- **Dashboard** — console de administração: CRUD de displays/devices/users, pairing de dispositivos, config de SMTP/conta.
- **Editor** (`/edit/:id`) — editor visual de cenas de um Display (grid 48 colunas via `react-grid-layout`, ~20 tipos de widget: imagem, texto, iframe, clima, relógio, vídeo, RSS, calendário, contagem regressiva, Power BI, Airtable, PDF, etc).
- **Scheduler** (`/scheduler`) — agendamento de broadcasts, reaproveita o `SceneEditor`.
- **Player** (`/player/:slug`) — cliente de exibição nas TVs: pareamento, heartbeat, SSE (`/live`) com fallback de polling, cache condicional por ETag/versão, aplica broadcasts sobre o conteúdo normal.
- **MediaLibrary** — upload/seleção de mídia, local (multer/disco) ou Cloudflare R2 conforme configuração.

## Backend — serviços

Rotas: `auth`, `displays`, `devices`, `broadcasts`, `media`, `settings`, `users`. JWT para autenticação, Nodemailer para reset de senha, SSE (`sse.service.ts`) para push em tempo real ao Player.

## Gaps técnicos identificados

1. **Armazenamento de mídia** — upload local (disco) ainda é o modo padrão sem R2 configurado; risco de perda de arquivos em restart de container. → [[Kanban-TelaHub|EPIC A]]
2. **Segurança de API** — sem rate limiting nem sanitização de entrada visíveis nas rotas. → [[Kanban-TelaHub|EPIC B]]
3. **Multi-loja** — não há entidade de Organização/Loja agrupando Displays; limita analytics/gestão multi-cliente num único deploy. → [[Kanban-TelaHub|EPIC C]]
4. **CI/CD e segredos** — deploy manual via Portainer/Cloudflare Tunnel, sem staging formalizado, sem gestão de segredos por ambiente. → [[Kanban-TelaHub|EPIC E]]
5. **Observabilidade** — heartbeat de `Device` existe no schema mas não há dashboard de saúde/alerta de display offline. → [[Kanban-TelaHub|EPIC F]]

Ver também: [[funcionalidades-produto]] (negócio), [[oportunidades-ux]] (UX).
