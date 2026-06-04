# 📺 TelaHub — Resumo Completo do Projeto

> **Plataforma de Digital Signage** para gerenciamento e exibição remota de conteúdo em TVs, totems e monitores.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura Técnica](#arquitetura-técnica)
- [Credenciais de Acesso](#credenciais-de-acesso)
- [Telas e Funcionalidades](#telas-e-funcionalidades)
- [Biblioteca de Widgets (23 tipos)](#biblioteca-de-widgets-23-tipos)
- [Sistema de Devices (TVs)](#sistema-de-devices-tvs)
- [Central de Programação (Broadcasts)](#central-de-programação-broadcasts)
- [Player (Reprodutor na TV)](#player-reprodutor-na-tv)
- [Gestão de Usuários e Permissões](#gestão-de-usuários-e-permissões)
- [Biblioteca de Mídia](#biblioteca-de-mídia)
- [Configurações do Sistema](#configurações-do-sistema)
- [Infraestrutura e Deploy](#infraestrutura-e-deploy)
- [Banco de Dados](#banco-de-dados)
- [API — Rotas do Backend](#api--rotas-do-backend)
- [Mapa de Arquivos do Projeto](#mapa-de-arquivos-do-projeto)

---

## Visão Geral

O **TelaHub** é uma plataforma completa de **Digital Signage** (sinalização digital) que permite:

1. **Criar layouts visuais** compostos por widgets arrastáveis (imagens, vídeos, relógio, clima, RSS, documentos, etc.)
2. **Exibir esses layouts remotamente** em TVs e monitores via um **Player web** que atualiza em tempo real (SSE + Polling)
3. **Agendar programações** temporárias ou permanentes que injetam conteúdo automaticamente em múltiplas telas
4. **Parear dispositivos** (TVs) com código de 6 dígitos, sem necessidade de login na TV
5. **Gerenciar usuários** com sistema de convites por e-mail e permissões hierárquicas

### Público-alvo
- Empresas com TVs corporativas (recepções, salas de espera, vitrines)
- Restaurantes exibindo cardápios digitais
- Escolas e universidades com painéis informativos
- Qualquer cenário que demande displays informativos remotos

---

## Arquitetura Técnica

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (React + Vite)             │
│   • Dashboard (gerenciamento)                         │
│   • Editor (construção visual drag-and-drop)          │
│   • Scheduler (agendamento de programações)           │
│   • Player (reprodução na TV - rota pública)          │
│   • Login / Reset de Senha                            │
│                                                       │
│   Tech: React 18 · TypeScript · Tailwind CSS v4       │
│         react-grid-layout · Recharts · Motion          │
│         Radix UI · Lucide Icons                        │
│   Servido por: Nginx (container Docker)               │
│   Porta: 3025                                         │
└───────────────────────┬──────────────────────────────┘
                        │ HTTP (REST API)
                        ▼
┌──────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express 5)       │
│   • Auth (JWT)                                        │
│   • CRUD Displays, Devices, Broadcasts, Users         │
│   • Upload de Mídia (local ou Cloudflare R2)          │
│   • Configurações SMTP                                │
│   • SSE (Server-Sent Events) para push em tempo real  │
│                                                       │
│   Tech: Express 5 · Prisma ORM · bcryptjs · JWT       │
│         multer · nodemailer · @aws-sdk/client-s3       │
│   Porta: 3001 (interno) → 3027 (host)                │
└───────────────────────┬──────────────────────────────┘
                        │ Prisma Client
                        ▼
┌──────────────────────────────────────────────────────┐
│               BANCO DE DADOS (PostgreSQL 15)          │
│   • Users · Displays · Devices · Broadcasts           │
│   • Settings · PasswordReset                          │
│   Porta: 5432                                         │
└──────────────────────────────────────────────────────┘
```

### Stack Resumida

| Camada     | Tecnologia                                                                 |
|------------|---------------------------------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite 6, Tailwind CSS v4, Motion (Framer), Radix UI |
| Backend    | Node.js 20, Express 5, Prisma ORM, JWT, Multer, Nodemailer               |
| Banco      | PostgreSQL 15 (produção) / SQLite (dev local)                             |
| Infra      | Docker Compose, Nginx (reverse proxy frontend), pgAdmin                   |
| Tempo Real | Server-Sent Events (SSE) + Polling como fallback                         |

---

## Credenciais de Acesso

### 🔐 TelaHub (Painel Administrativo)

| Usuário    | Senha       | Role   | URL                                    |
|------------|-------------|--------|----------------------------------------|
| `admin`    | `mudar@123` | master | [http://localhost:3025](http://localhost:3025) |
| `jackson`  | `Mudar123`  | admin  | [http://localhost:3025](http://localhost:3025) |

### 🔐 pgAdmin (Gerenciador de Banco)

| E-mail             | Senha                | URL                                    |
|--------------------|----------------------|----------------------------------------|
| `admin@admin.com`  | `admin_password_123` | [http://localhost:5053](http://localhost:5053) |

### 🔐 Banco PostgreSQL

| Usuário        | Senha                 | Banco        |
|----------------|----------------------|--------------|
| `display_user` | `display_password_123` | `display_db` |

---

## Telas e Funcionalidades

### 1. 🔐 Login (`/login`)

- Tela de autenticação com design dark mode premium
- Campo unificado aceita **e-mail ou username**
- Autenticação via JWT armazenado no localStorage
- Links para "Esqueci minha senha" e reset por e-mail
- Componente: `Login.tsx` (23 KB)

### 2. 🔑 Esqueci a Senha (`/forgot-password`)

- Formulário para envio de link de redefinição por e-mail
- Depende do SMTP estar configurado
- Componente: `ForgotPassword.tsx` (6.6 KB)

### 3. 🔄 Redefinir Senha (`/reset-password`)

- Página pública acessada pelo link enviado por e-mail
- Validação de token + nova senha com confirmação
- Componente: `ResetPassword.tsx` (9.6 KB)

### 4. 🏠 Dashboard (`/`) — **Tela Principal**

A tela central de gerenciamento. Contém diversas seções e modais:

#### Seção: Displays (Telas)
- **Listagem** de todas as telas criadas em cards visuais
- **Criar nova tela** com nome + escolha de orientação (Horizontal 16:9 ou Vertical 9:16)
- **Editar** → abre o Editor drag-and-drop
- **Duplicar** tela existente
- **Renomear** tela via modal
- **Definir capa** com imagem da biblioteca de mídia
- **Excluir** tela com confirmação
- **Copiar link do Player** para compartilhar com TVs
- **Abrir Player** em nova aba
- **Card dropdown menu** com opções: Editar, Renomear, Definir Capa, Configurações, Excluir

#### Seção: Dispositivos (TVs)
- **Listagem** de dispositivos pareados com status (online/offline)
- **Vincular TV** via código de pareamento de 6 dígitos
- **Desvincular** dispositivo
- **Alterar display** vinculado a um dispositivo
- **Polling automático** a cada 30 segundos para atualizar status

#### Seção: Gestão de Usuários (Modal)
- **Convidar** novos usuários por e-mail (gera senha automática)
- **Excluir** usuários
- **Reenviar convite**
- **Enviar link de reset de senha** para um usuário
- **Permissões**: user / admin / master
- **Indicador** visual se o usuário já fez login

#### Seção: Configurações da Conta (Modal)
- **Alterar nome** do usuário logado
- **Alterar e-mail**
- **Alterar senha** (senha atual + nova + confirmação)
- **Solicitar reset por e-mail**

#### Seção: Configurações SMTP (Modal)
- **Configurar e-mail SMTP** (user + senha de app)
- **Testar conexão** SMTP
- Alerta visual quando SMTP não está configurado

#### Seção: Biblioteca de Mídia (Modal)
- Acesso rápido à galeria de arquivos enviados

#### Outros
- **Toast notifications** com ícones (sucesso/erro/info)
- **Logout** com limpeza de token
- Componente: `Dashboard.tsx` (100 KB)

### 5. ✏️ Editor (`/edit/:id`) — **Construtor Visual**

O editor drag-and-drop completo para montar layouts nas telas:

#### Funcionalidades Principais
- **Canvas visual** com grid de 48 colunas proporcional 16:9 ou 9:16
- **Drag & drop** de widgets com react-grid-layout
- **Biblioteca de widgets** na sidebar esquerda (23 tipos organizados em 4 categorias)
- **Painel de propriedades** na sidebar direita (configurações do widget selecionado)
- **Multi-cenas (Páginas)**: cada tela pode ter múltiplas cenas com duração individual
- **Transições entre cenas**: fade, slide-left, slide-right, slide-up, slide-down
- **Fundo da cena**: imagem, vídeo (YouTube/MP4), ou animação (12 tipos)
- **Camadas (z-index)**: modal de camadas com drag-and-drop para reordenar sobreposição
- **Fullscreen mode**: expandir widget selecionado para ocupar tela inteira
- **Limpar todos os widgets** da cena
- **Salvar** com feedback visual (toast)
- **Upload de mídia** direto pelo editor
- **Biblioteca de mídia** integrada
- **Responsivo**: sidebars colapsáveis em mobile

#### Fundos Animados Disponíveis (12 tipos)
1. Automático (clima) — muda com o tempo da cidade
2. Fluxo Gradiente — suave e colorido
3. Céu e Nuvens — calmo e relaxante
4. Chuva Digital — dark mode com chuva
5. Neve Caindo — inverno suave
6. Chamas — intenso e quente
7. Grid Tech — futurista e técnico
8. Alerta Vermelho — avisos urgentes
9. Pulso Azul — tecnológico suave
10. Pulso Verde — status positivo
11. Aurora Boreal — místico e elegante
12. Nenhum — sem animação

- Componente: `Editor.tsx` (231 KB)

### 6. 📅 Central de Programação (`/scheduler`) — **Agendamento**

Sistema de agendamento mestre para distribuir conteúdo em múltiplas telas:

#### Funcionalidades
- **Criar programação** com editor visual embutido (mesmo do Editor)
- **Nome** da programação
- **Horário de início e término** (ou marcar como permanente)
- **Selecionar telas-alvo**: escolher em quais displays a programação será exibida
- **"Todas as Telas"**: botão para avisos urgentes que distribuem para todos os displays
- **Ativar/Desativar** programação
- **Orientação** horizontal ou vertical
- **Editor de cena** completo (mesma biblioteca de 23 widgets)
- **Injeção automática**: ao salvar, a página da programação é injetada diretamente nos displays selecionados com metadados de horário
- **Remoção automática**: ao excluir, remove a página injetada de todos os displays afetados
- Componente: `Scheduler.tsx` (100 KB)

### 7. 📺 Player (`/player` ou `/player/:slug`) — **Reprodução na TV**

O reprodutor final que roda nas TVs/monitores. É uma **rota pública** (não requer login):

#### Modos de Operação

1. **Modo Slug Direto** (`/player/nome-do-display`):
   - Acessa o display pelo slug na URL
   - Ideal para links compartilhados

2. **Modo Pareamento** (`/player`):
   - Gera um **código de 6 dígitos** na tela
   - O admin digita esse código no Dashboard para vincular uma tela ao dispositivo
   - Após vinculação, carrega automaticamente o display atribuído
   - **UUID persistente** no localStorage para identificar o dispositivo

#### Funcionalidades do Player
- **Rotação automática** de cenas com duração configurável por página
- **Transições animadas** (fade, slide-left/right/up/down)
- **Atualização em tempo real** via SSE (Server-Sent Events) com fallback para polling
- **Heartbeat** a cada 2 minutos para manter status "online"
- **Filtragem temporal** de broadcasts (mostra apenas programações dentro do horário)
- **Fundo automático por clima** — sincroniza animação com o tempo real da cidade
- **Renderização completa** de todos os 23 tipos de widget
- **Suporte a orientação** horizontal (16:9) e vertical (9:16)
- **Reconexão automática** SSE em caso de queda de conexão
- Componente: `Player.tsx` (156 KB)

---

## Biblioteca de Widgets (23 tipos)

Organizados em 4 categorias no editor:

### Básicos (5)

| Widget     | Tipo Enum          | Descrição                                                             |
|------------|--------------------|-----------------------------------------------------------------------|
| 📷 Imagem  | `IMAGE`            | Exibe imagens (PNG, JPG, SVG) com objectFit configurável              |
| 🎬 Vídeo   | `VIDEO`            | YouTube ou vídeo direto (MP4). Autoplay, loop, mute, qualidade        |
| ✏️ Texto   | `TEXT`              | Caixa de texto com fonte, cor, tamanho, alinhamento e animações       |
| 🎞️ GIF     | `GIF`              | Animações GIF com ajuste de fit                                       |
| 🌐 Web     | `IFRAME`           | Incorpora sites externos. Modo interativo ou somente visualização     |

### Utilitários (5)

| Widget     | Tipo Enum          | Descrição                                                             |
|------------|--------------------|-----------------------------------------------------------------------|
| 🕐 Relógio | `CLOCK`            | Relógio digital sincronizado por cidade. Modelos: standard, minimal   |
| ☁️ Clima   | `WEATHER`          | Previsão do tempo em tempo real (Open-Meteo API). Modelos: simple, detailed |
| 📊 Completo | `FULL_INFO`       | Painel integrado: relógio + clima + fundo HD                          |
| 📰 RSS    | `RSS`              | Feeds de notícias. Layouts: full-image, split, ticker. Feeds pré-configurados (G1, CNN, ESPN, etc.) |
| 📅 Agenda | `CALENDAR`         | Google Agenda embedado com temas (light, dark, glass, minimal, neon)  |

### Interativos (5)

| Widget       | Tipo Enum          | Descrição                                                           |
|--------------|--------------------|---------------------------------------------------------------------|
| 📝 Notas     | `NOTES`            | Mural com temas: glass, yellow-sticky, purple-haze, neon-glow       |
| ✅ Tarefas   | `TODO`             | Lista de tarefas com checkboxes e progresso visual                  |
| ⏱️ Contador  | `COUNTDOWN`        | Cronômetro regressivo. Temas: neon, glass, minimal, bold-gradient   |
| 🧹 Deveres   | `CHORES`           | Quadro semanal de tarefas com responsáveis                          |
| 🍽️ Cardápio  | `MEAL_PLAN`        | Planejador de refeições semanais por dia                            |

### Integrações (8)

| Widget          | Tipo Enum            | Descrição                                                        |
|-----------------|----------------------|------------------------------------------------------------------|
| 📈 Bolsa        | `MARKET_WATCH`       | Cotações financeiras (ações + cripto). Layouts: grid, list, ticker |
| 📸 Snapshot     | `BROWSER_SNAPSHOT`   | Capturas periódicas de páginas web                               |
| 📄 Google Docs  | `GOOGLE_DOCS`        | Documentos, planilhas, slides do Google Workspace                |
| 📘 Office Docs  | `OFFICE_DOCS`        | Word, Excel, PowerPoint do Office 365                            |
| 📊 Power BI     | `POWER_BI`           | Dashboards e relatórios do Microsoft Power BI                    |
| 🗃️ Airtable     | `AIRTABLE`          | Bases de dados e visualizações do Airtable                       |
| 📄 PDF          | `PDF_DOCUMENT`       | Documentos PDF embedados                                         |
| 💻 HTML         | `EMBED_HTML`         | Código HTML/CSS/JS livre e customizado                           |

### Propriedades Comuns dos Widgets

Cada widget possui configurações gerais:
- **Posição** (x, y) e **Tamanho** (w, h) no grid
- **z-index** para sobreposição de camadas
- **fillContainer** — preencher todo o espaço do widget
- **contentAlignment** — alinhamento do conteúdo (start, center, end, stretch)
- **fitContainerMode** — modo de ajuste (none, cover, contain, stretch)
- **Fundo animado** individual por widget (12 tipos)
- **Imagem de fundo** por widget
- **Padding e margin** customizáveis
- **Modo fullscreen** — ocupar a tela inteira

---

## Sistema de Devices (TVs)

### Fluxo de Pareamento

```
TV acessa /player
    │
    ├─ Gera UUID único (salvo no localStorage)
    ├─ Gera código de 6 dígitos
    ├─ Registra no backend (POST /api/devices/register)
    ├─ Exibe código na tela com UI premium
    │
    │   [TV aguardando pareamento - polling a cada 10s]
    │
Admin no Dashboard
    ├─ Clica em "Vincular TV"
    ├─ Digita código de 6 dígitos + nome + display
    ├─ POST /api/devices/link
    │
    │   [TV detecta vinculação]
    │
TV carrega display automaticamente
    ├─ SSE para atualizações em tempo real
    ├─ Heartbeat a cada 2 minutos
    └─ Polling de conteúdo a cada 60s (fallback)
```

### Estados do Device

| Status        | Descrição                                     |
|---------------|-----------------------------------------------|
| `pending`     | Registrado, aguardando vinculação              |
| `linked`      | Vinculado a um display, reproduzindo conteúdo  |

### Indicadores de Status no Dashboard

- **Online**: dispositivo enviou heartbeat nos últimos 5 minutos
- **Offline**: sem heartbeat recente

---

## Central de Programação (Broadcasts)

### Conceito

Broadcasts são **programações agendadas** que injetam uma cena temporária diretamente nos displays selecionados. Ideal para:
- Avisos urgentes em todas as telas
- Promoções com hora de início e fim
- Conteúdo sazonal permanente

### Campos de uma Programação

| Campo          | Tipo       | Descrição                                     |
|----------------|------------|-----------------------------------------------|
| `name`         | string     | Nome da programação                           |
| `page`         | Page       | A cena (layout com widgets)                   |
| `start_time`   | ISO string | Data/hora de início                           |
| `end_time`     | ISO string | Data/hora de término                          |
| `is_permanent` | boolean    | Se `true`, ignora `end_time`                  |
| `display_ids`  | string[]   | IDs dos displays-alvo                         |
| `active`       | boolean    | Se a programação está ativa                   |
| `orientation`  | string     | horizontal ou vertical                        |
| `created_by`   | string     | ID do usuário que criou                       |

### Fluxo de Funcionamento

1. Admin cria broadcast no Scheduler com editor visual
2. Ao salvar, o backend injeta a `page` diretamente nos `pages[]` de cada display selecionado, com metadados (`broadcast_id`, `start_time`, `end_time`, `is_permanent`)
3. O Player filtra as páginas com base no horário atual
4. Ao excluir um broadcast, as páginas injetadas são removidas dos displays

---

## Player (Reprodutor na TV)

### Atualização em Tempo Real

O Player implementa uma estratégia de 3 camadas para manter o conteúdo atualizado:

| Método                     | Intervalo | Descrição                                        |
|----------------------------|-----------|--------------------------------------------------|
| **SSE (Server-Sent Events)** | Instantâneo | Canal push do backend → player                |
| **Version Check (Polling)**  | 60s       | Verifica se houve mudança (~20 bytes)           |
| **Full Reload (Fallback)**   | Sob demanda | Recarrega display completo quando versão muda |

### Economia de Bandwidth

- **Version check** retorna apenas o timestamp de atualização (~20 bytes)
- **304 Not Modified** quando não há mudanças
- Heartbeat a cada **2 minutos** (não 30 segundos)
- Polling de conteúdo a cada **60 segundos** (economia de ~96% de egress)

---

## Gestão de Usuários e Permissões

### Roles (Papéis)

| Role     | Permissões                                                           |
|----------|----------------------------------------------------------------------|
| `master` | Acesso total. Gerencia SMTP, usuários, displays, devices, broadcasts |
| `admin`  | Gerencia displays, devices, broadcasts, convida usuários              |
| `user`   | Visualiza e edita displays atribuídos                                 |

### Fluxo de Convite

1. Admin preenche e-mail + role no modal de Gestão de Usuários
2. Backend gera senha aleatória + cria o usuário
3. Envia credenciais por e-mail via SMTP configurado
4. Novo usuário faz login e pode alterar a senha

---

## Biblioteca de Mídia

- **Upload** de imagens e vídeos via formulário ou drag-and-drop
- **Listagem** com preview de arquivos
- **Exclusão** individual ou em lote
- **Seleção** integrada no Editor (ao configurar imagens de widgets ou fundos)
- **Armazenamento**: local (pasta `uploads/`) ou Cloudflare R2 (quando configurado)
- Componente: `MediaLibrary.tsx` (16.8 KB)

---

## Configurações do Sistema

### SMTP (E-mail)

- Configurável via modal no Dashboard (apenas master/admin)
- Campos: e-mail do remetente + senha de app
- Botão de **teste de conexão**
- Quando não configurado, exibe alerta visual no gerenciamento de usuários
- Endpoints: `GET /api/settings/smtp`, `POST /api/settings/smtp`, `POST /api/settings/smtp/test`

---

## Infraestrutura e Deploy

### Docker Compose — Serviços

| Serviço      | Imagem                   | Porta Interna | Porta Host | Descrição                        |
|-------------|--------------------------|---------------|------------|----------------------------------|
| `db`        | `postgres:15-alpine`     | 5432          | 5432       | Banco de dados PostgreSQL        |
| `backend`   | Build local              | 3001          | 3027       | API Node.js + Express            |
| `frontend`  | Build local (Nginx)      | 3025          | 3025       | React buildado servido por Nginx |
| `pgadmin`   | `dpage/pgadmin4:latest`  | 80            | 5053       | Interface visual do PostgreSQL   |

### Volumes Persistentes

| Volume         | Função                          |
|----------------|---------------------------------|
| `pgdata`       | Dados do PostgreSQL             |
| `pgadmin_data` | Configurações do pgAdmin        |
| `uploads_data` | Arquivos de mídia enviados       |

### Comandos Úteis

```bash
# Subir tudo
docker compose up --build -d

# Ver logs em tempo real
docker compose logs -f

# Parar tudo
docker compose down

# Resetar banco (cuidado!)
docker compose down -v
docker compose up --build -d

# Rodar seed manualmente
docker compose exec backend npx prisma db seed
```

---

## Banco de Dados

### Schema Prisma (PostgreSQL)

#### `User`
| Campo       | Tipo     | Descrição                    |
|-------------|----------|------------------------------|
| `id`        | UUID     | Chave primária               |
| `username`  | String   | Login único                  |
| `name`      | String?  | Nome de exibição             |
| `email`     | String   | E-mail único                 |
| `password`  | String   | Hash bcrypt                  |
| `role`      | String   | master / admin / user        |
| `createdAt` | DateTime | Data de criação              |
| `lastLogin` | DateTime? | Último login                |

#### `Display`
| Campo        | Tipo     | Descrição                       |
|--------------|----------|---------------------------------|
| `id`         | UUID     | Chave primária                  |
| `name`       | String   | Nome da tela                    |
| `slug`       | String   | Identificador de URL (único)    |
| `pages`      | String   | JSON com array de cenas/widgets |
| `coverImage` | String?  | URL da imagem de capa           |
| `updatedAt`  | DateTime | Timestamp de atualização        |
| `devices`    | Device[] | Relação 1:N com devices         |

#### `Device`
| Campo         | Tipo     | Descrição                    |
|---------------|----------|------------------------------|
| `id`          | UUID     | Chave primária               |
| `pairingCode` | String?  | Código de 6 dígitos (único) |
| `displayId`   | String?  | FK para Display              |
| `status`      | String   | pending / linked             |
| `lastSeen`    | DateTime | Último heartbeat             |
| `name`        | String?  | Nome do dispositivo          |

#### `Broadcast`
| Campo        | Tipo     | Descrição                        |
|--------------|----------|----------------------------------|
| `id`         | UUID     | Chave primária                   |
| `name`       | String   | Nome da programação              |
| `page`       | String   | JSON com a cena                  |
| `startTime`  | String   | Início da exibição               |
| `endTime`    | String   | Fim da exibição                  |
| `isPermanent`| Boolean  | Sem horário de término           |
| `displayIds` | String   | IDs dos displays (serializado)   |
| `active`     | Boolean  | Programação ativa/inativa        |
| `createdAt`  | DateTime | Data de criação                  |
| `createdBy`  | String?  | ID do criador                    |

#### `Setting`
| Campo       | Tipo     | Descrição                    |
|-------------|----------|------------------------------|
| `key`       | String   | Chave da configuração (PK)   |
| `value`     | String   | Valor da configuração        |
| `updatedAt` | DateTime | Última alteração             |

#### `PasswordReset`
| Campo       | Tipo     | Descrição                    |
|-------------|----------|------------------------------|
| `id`        | UUID     | Chave primária               |
| `email`     | String   | E-mail do solicitante        |
| `token`     | String   | Token único de reset         |
| `expiresAt` | DateTime | Validade do token            |
| `used`      | Boolean  | Se já foi utilizado          |

---

## API — Rotas do Backend

### Autenticação (`/api/auth`)
| Método | Rota         | Descrição                        |
|--------|--------------|----------------------------------|
| POST   | `/login`     | Autenticar com e-mail + senha    |
| GET    | `/me`        | Retornar dados do usuário logado |

### Displays (`/api/displays`)
| Método | Rota                              | Descrição                             |
|--------|-----------------------------------|---------------------------------------|
| GET    | `/`                               | Listar todos os displays              |
| GET    | `/:id`                            | Buscar display por ID                 |
| GET    | `/slug/:slug`                     | Buscar display por slug               |
| GET    | `/slug/:slug/version`             | Verificar versão (ultra-leve)         |
| GET    | `/slug/:slug/live`                | SSE: stream de atualizações           |
| GET    | `/player/:id`                     | Buscar display por ID (público)       |
| POST   | `/`                               | Criar ou atualizar display (upsert)   |
| DELETE | `/:id`                            | Excluir display                       |

### Devices (`/api/devices`)
| Método | Rota                          | Descrição                           |
|--------|-------------------------------|-------------------------------------|
| GET    | `/`                           | Listar todos os dispositivos        |
| GET    | `/:id/status`                 | Verificar status de um device       |
| GET    | `/player/:id/live`            | SSE: stream para dispositivo        |
| POST   | `/register`                   | Registrar novo dispositivo          |
| POST   | `/link`                       | Vincular dispositivo a display      |
| PATCH  | `/:id/display`                | Alterar display de um device        |
| PATCH  | `/:id/heartbeat`              | Registrar heartbeat (keep-alive)    |
| DELETE | `/:id`                        | Desvincular/excluir dispositivo     |

### Broadcasts (`/api/broadcasts`)
| Método | Rota       | Descrição                      |
|--------|------------|--------------------------------|
| GET    | `/`        | Listar todas as programações   |
| POST   | `/`        | Criar ou atualizar broadcast   |
| DELETE | `/:id`     | Excluir broadcast              |

### Users (`/api/users`)
| Método | Rota                       | Descrição                              |
|--------|----------------------------|----------------------------------------|
| GET    | `/`                        | Listar todos os usuários               |
| POST   | `/invite`                  | Convidar novo usuário por e-mail       |
| POST   | `/:id/resend-invite`       | Reenviar convite                       |
| POST   | `/:id/send-reset`          | Enviar link de reset de senha          |
| POST   | `/forgot-password`         | Solicitar reset (público)              |
| POST   | `/reset-password`          | Executar reset com token               |
| PUT    | `/me/email`                | Atualizar e-mail do usuário logado     |
| PUT    | `/me/password`             | Alterar senha do usuário logado        |
| PUT    | `/me/name`                 | Alterar nome do usuário logado         |
| DELETE | `/:id`                     | Excluir usuário                        |

### Media (`/api/media`)
| Método | Rota                   | Descrição                    |
|--------|------------------------|------------------------------|
| GET    | `/`                    | Listar arquivos de mídia     |
| POST   | `/upload`              | Upload de arquivo (multer)   |
| DELETE | `/:fileName`           | Excluir arquivo de mídia     |

### Settings (`/api/settings`)
| Método | Rota                | Descrição                     |
|--------|---------------------|-------------------------------|
| GET    | `/smtp`             | Obter configurações SMTP      |
| GET    | `/smtp/status`      | Verificar se SMTP está ativo  |
| POST   | `/smtp`             | Salvar configurações SMTP     |
| POST   | `/smtp/test`        | Testar conexão SMTP           |

### Outros
| Método | Rota           | Descrição           |
|--------|----------------|---------------------|
| GET    | `/api/health`  | Health check da API |

---

## Mapa de Arquivos do Projeto

```
TelaHub/
├── .env                          # Variáveis de ambiente (Docker Compose)
├── docker-compose.yml            # Orquestração de containers
├── docker-compose.override.yml   # Overrides locais
├── check-env.js                  # Script de diagnóstico do ambiente
├── package.json                  # Scripts raiz (build/start/seed)
│
├── backend/
│   ├── .env                      # Variáveis do backend
│   ├── package.json              # Dependências do backend
│   ├── tsconfig.json             # Config TypeScript
│   ├── Dockerfile                # Build da imagem Docker
│   ├── dev.db                    # Banco SQLite (dev local)
│   ├── prisma/
│   │   ├── schema.prisma         # Schema do banco de dados
│   │   ├── seed.ts               # Seed para desenvolvimento
│   │   ├── seed-prod.js          # Seed para produção (Docker)
│   │   └── dev.db                # Banco SQLite alternativo
│   ├── src/
│   │   ├── server.ts             # Entry point do Express
│   │   ├── routes/               # 7 arquivos de rotas
│   │   │   ├── auth.routes.ts
│   │   │   ├── displays.routes.ts
│   │   │   ├── devices.routes.ts
│   │   │   ├── broadcasts.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── media.routes.ts
│   │   │   └── settings.routes.ts
│   │   ├── middlewares/          # Middleware de erros, auth, etc.
│   │   ├── repositories/        # Camada de acesso a dados (Prisma)
│   │   ├── services/             # Lógica de negócio
│   │   └── lib/                  # Utilitários
│   ├── uploads/                  # Arquivos de mídia enviados
│   └── icones-do-sistema/        # Assets do sistema (logo, ícones)
│
├── frontend/
│   ├── .env                      # VITE_API_URL
│   ├── package.json              # Dependências do frontend
│   ├── tsconfig.json             # Config TypeScript
│   ├── vite.config.ts            # Config Vite
│   ├── index.html                # HTML principal
│   ├── index.css                 # Estilos globais + animações (17 KB)
│   ├── index.tsx                 # Entry point React
│   ├── App.tsx                   # Router principal
│   ├── types.ts                  # Tipagens TypeScript (257 linhas)
│   ├── Dockerfile                # Build multi-stage (Node → Nginx)
│   ├── nginx.conf                # Configuração do Nginx
│   ├── vercel.json               # Config para deploy na Vercel
│   ├── components/
│   │   ├── Dashboard.tsx         # Tela principal (100 KB)
│   │   ├── Editor.tsx            # Editor visual drag-and-drop (231 KB)
│   │   ├── Scheduler.tsx         # Central de programação (100 KB)
│   │   ├── Player.tsx            # Reprodutor na TV (156 KB)
│   │   ├── Login.tsx             # Tela de login (24 KB)
│   │   ├── ForgotPassword.tsx    # Esqueci a senha
│   │   ├── ResetPassword.tsx     # Redefinir senha
│   │   ├── MediaLibrary.tsx      # Galeria de mídia (17 KB)
│   │   ├── SceneEditor.tsx       # Editor de cena reutilizável (96 KB)
│   │   ├── SmartCanvasBackground.tsx  # Fundos inteligentes
│   │   ├── SizeInput.tsx         # Input de dimensões
│   │   ├── TelemetryWidget.tsx   # Widget de telemetria
│   │   ├── TrafficMapWidget.tsx  # Widget de mapa de tráfego
│   │   ├── RealtimeBroadcastBanner.tsx # Banner de broadcast
│   │   └── ui/                   # Componentes UI base (Radix)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       └── tabs.tsx
│   ├── services/
│   │   └── storage.ts            # Camada de serviço API (328 linhas)
│   ├── libs/
│   │   └── api.ts                # Cliente HTTP com interceptors
│   └── public/                   # Assets estáticos (logo, ícones 3D)
│
└── .agents/                      # AG Kit (agentes de IA para dev)
    ├── ARCHITECTURE.md
    ├── agent/                    # 20 agentes especialistas
    ├── skills/                   # 44 skills modulares
    ├── workflows/                # 13 slash commands
    ├── scripts/                  # Scripts de validação
    └── memory/                   # Memória persistente
```

---

> **Última atualização:** Junho 2026
