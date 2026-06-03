# 🎨 TelaHub — Guia de Identidade Visual e Especificações de Design (UI/UX)

Este documento é o guia oficial de estilo, tokens visuais e diretrizes estéticas do **TelaHub**. Ele serve como especificação direta para designers e desenvolvedores frontend manterem a consistência visual em todo o ecossistema do produto.

---

## 🧭 1. Resumo da Linguagem Visual (Dupla Identidade)

O ecossistema divide-se em duas linguagens opostas que se complementam:

| Canal | Estética | Modo | Foco |
|---|---|---|---|
| **Landing Page (Vendas)** | Swiss Grid / Brutalismo B2B | ☀️ Light Mode | Transparência, técnica, blueprints e seriedade empresarial. |
| **Software (Dashboard & Player)** | Corporate Amethyst | 🌙 Dark Mode | Imersão, foco no conteúdo, tecnologia, glassmorphism e telemetria. |

---

## ☀️ 2. Site de Vendas (Landing Page) — Swiss Grid

Uma estética técnica inspirada nos grids de design suíço clássico e no brutalismo corporativo limpo.

### 🎨 Paleta de Cores (Light Mode Técnico)
*   **Fundo Base:** `#FFFFFF` (Branco Puro)
*   **Superfícies & Cartões:** `#F9FAFB` (Cinza Neutro Claro)
*   **Bordas & Divisores:** `#E5E7EB` (Cinza Sutil Nítido)
*   **Destaques e CTAs:** `#2563EB` (Azul Corporativo Sólido)
*   **Texto Principal:** `#111827` (Grafite Escuro / Quase Preto)
*   **Texto Secundário:** `#4B5563` (Cinza de Leitura)
*   **Online Status:** `#10B981` (Verde Esmeralda)
*   **Offline Status:** `#64748B` (Cinza ardósia)

### 📐 Geometria e Grid
*   **Bordas:** `1px` sólida, nítida. Evitar sombras difusas.
*   **Bordas Arredondadas (Border Radius):** Estrito entre **`0px` e `2px`** (Botões, inputs e blocos devem ter cantos perfeitamente retos).
*   **Padrão de Fundo:** Grid de pontos (Dot Grid) cinza claro (`rgba(156,163,175,0.15)`) espaçados em 24px.
*   **Layout:** Colunas assimétricas marcadas por linhas nítidas, simulando um blueprint técnico.

### ✍️ Tipografia
*   **Títulos Principais (H1, H2):** `Satoshi` (Moderna, geométrica e rígida).
*   **Corpo de Texto e Dados:** `Space Grotesk` (Visual mono-espaçado híbrido, excelente para leitura de dados).

---

## 🌙 3. O Software (Dashboard & Player) — Corporate Amethyst

Uma atmosfera Dark-Glassmorphism focada em tecnologia de ponta, telemetria em tempo real e visualização de mídia.

### 🎨 Paleta de Cores (Dark Mode Premium)
*   **Fundo Base:** `#1C1D22` (Cinza Corporativo Escuro)
*   **Superfícies (Cards/Modais):** `#2D3139` (Cinza Mineral de Contraste)
*   **Destaques e Elementos Ativos:** `#7C3AED` (Violeta Tecnológico / Amethyst)
*   **Bordas e Linhas de Grid:** `rgba(255, 255, 255, 0.08)` (Branco translúcido muito fino)
*   **Texto de Destaque:** `#FFFFFF` (Branco Puro)
*   **Texto Secundário:** `#9CA3AF` (Cinza Neutro)

### 📐 Geometria e Estilo de Cartões
*   **Bordas Arredondadas (Border Radius):** Entre **`4px` e `8px`** (Passa sensação de sofisticação moderna, mas mantém a seriedade técnica).
*   **Efeito Glassmorphism:** Superfícies com `backdrop-filter: blur(12px)` e fundo semi-transparente `rgba(45, 49, 57, 0.7)`.
*   **Glow/Brilho:** Sombras internas e externas usando o violeta `#7C3AED` com opacidade reduzida (`0.15` a `0.25`) para botões ativos e cards em foco.

### 🎬 Animações & Transições (Eldora UI + Framer Motion)
*   **Photon Beam (Fundo do Canvas):** Linhas de feixe de luz de neon violeta pulsando em caminhos SVG aleatórios atrás da grade de widgets. Opacidade fixa em `0.20` para não poluir visualmente.
*   **Word Pull Up (Alertas e Modais):** Entrada de textos importantes com palavras subindo de forma sequencial utilizando spring physics (`stiffness: 100`, `damping: 15`).
*   **Animated List (Mural de Logs/SSE):** Logs e telemetria que entram pelo topo e empurram os itens antigos com uma transição suave de deslocamento vetorial.
*   **Animated Badge (Status de Conexão):** Círculo de status online que pulsa continuamente entre 100% e 120% de escala com opacidade variante (`animate-ping` estilizado).

### ✍️ Tipografia
*   **Global no App:** `Space Grotesk` (Utilizada em headers, botões, dados de widgets e tabelas para passar o ar de "computação em tempo real").

---

## 🚫 4. Proibições Visuais (Guia Anti-Erros)

*   ❌ **Proibido usar Roxo/Violeta na Landing Page de vendas** (O azul corporativo sólido é o único destaque permitido ali).
*   ❌ **Proibido usar Azul/Cyan como cor de destaque no Dashboard** (O roxo `#7C3AED` é exclusivo de ações e marcação ativa no app).
*   ❌ **Proibido usar sombras escuras e esfumadas pesadas** (Todo elemento deve se apoiar em bordas de 1px e variações de cor de superfície).
*   ❌ **Proibido usar cantos arredondados (acima de 2px) na Landing Page** (O design Swiss Grid exige cantos retos e afiados).
*   ❌ **Proibido usar fontes serifadas clássicas** (Toda a comunicação do TelaHub deve usar fontes geométricas contemporâneas sans-serif).
