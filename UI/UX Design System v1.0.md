---
name: ui-ux-design-system
description: >
  Skill mestre de UI/UX Design profissional para web e mobile. Baseada em
  Material Design 3 (Google, 2025), Apple Human Interface Guidelines (2025),
  WCAG 2.2, web.dev e dados reais de dispositivos modernos. Cobre tipografia,
  escala de tipos, breakpoints, grid, espaçamento, componentes responsivos,
  touch targets, animações, motion, dark mode, acessibilidade e performance.
  Use como referência canônica em qualquer projeto web ou app.
version: 1.0.0
fontes: Material Design 3 (m3.material.io), Apple HIG, web.dev, WCAG 2.2
audience: agente de codificação (Antigravity) + desenvolvedor front-end
language: pt-BR
atualizado: Junho 2025
---

# 🎨 Skill — UI/UX Design System Profissional (Desktop + Mobile)

> **Como usar.** Cole este documento como contexto para o agente. Cada seção
> termina com `✅ Regras para o agente` — instruções diretas de implementação.
> Valores das tabelas são definitivos e baseados em fontes oficiais de 2025.
> Este documento vence decisões locais, exceto se o projeto tiver design system
> aprovado.

---

## 📑 Sumário

1. [Fundamentos de Tipografia](#1-fundamentos-de-tipografia)
2. [Escala de Tipos — Tamanhos por Plataforma](#2-escala-de-tipos--tamanhos-por-plataforma)
3. [Breakpoints e Viewports Modernos](#3-breakpoints-e-viewports-modernos)
4. [Grid System e Layout](#4-grid-system-e-layout)
5. [Espaçamento (Spacing System)](#5-espaçamento-spacing-system)
6. [Componentes por Breakpoint](#6-componentes-por-breakpoint)
7. [Touch Targets e Áreas de Interação](#7-touch-targets-e-áreas-de-interação)
8. [Estados de Componentes](#8-estados-de-componentes)
9. [Animações e Motion Design](#9-animações-e-motion-design)
10. [Cores e Temas (Dark / Light Mode)](#10-cores-e-temas-dark--light-mode)
11. [Imagens, Ícones e Mídia Responsiva](#11-imagens-ícones-e-mídia-responsiva)
12. [Formulários e Inputs](#12-formulários-e-inputs)
13. [Navegação Responsiva](#13-navegação-responsiva)
14. [Cards, Listas e Tabelas](#14-cards-listas-e-tabelas)
15. [Acessibilidade (WCAG 2.2)](#15-acessibilidade-wcag-22)
16. [Performance de UI](#16-performance-de-ui)
17. [Checklist Final de Qualidade](#17-checklist-final-de-qualidade)

---

## 1. Fundamentos de Tipografia

> **Fonte oficial:** Apple HIG (2025) define tamanhos mínimos por plataforma.
> Material Design 3 usa a escala Major Second (1.125) com base em 14sp.

### 1.1 Tamanhos mínimos por plataforma (Apple HIG, 2025)

| Plataforma | Tamanho padrão | Tamanho mínimo |
|---|---|---|
| **iOS / iPadOS** | **17pt** | 11pt |
| **macOS** | **13pt** | 10pt |
| **tvOS** | 29pt | 23pt |
| **visionOS** | 17pt | 12pt |
| **watchOS** | 16pt | 12pt |
| **Web (browsers)** | **16px** | **12px** |

> ⚠️ **Regra absoluta:** NUNCA use `font-size` abaixo de **12px** em qualquer
> elemento visível. O tamanho padrão do corpo de texto em web deve ser **16px (1rem)**.
> Textos menores que 12px são invisíveis para grande parte dos usuários.

### 1.2 Propriedades fundamentais de legibilidade

| Propriedade | Valor ideal | Observação |
|---|---|---|
| `font-size` base | `16px` / `1rem` | Padrão de todos os browsers modernos |
| `line-height` corpo | `1.5` a `1.6` | Garante respiração entre linhas |
| `line-height` headlines | `1.1` a `1.25` | Headlines são compactas |
| `letter-spacing` corpo | `0` a `+0.01em` | Não apertar texto de leitura |
| `letter-spacing` display | `-0.02em` a `-0.03em` | Compensação óptica em textos grandes |
| `max-width` parágrafo | `60–75ch` (ideal: `65ch`) | Legibilidade: 10 palavras/linha (web.dev) |
| `font-weight` corpo | `400` | Regular — padrão de leitura |
| `font-weight` ênfase inline | `600` | Semibold — nunca `700` inline |
| `font-weight` headline | `600`–`700` | Semibold a Bold |
| Contraste mínimo (WCAG AA) | `4.5:1` normal / `3:1` grande | Texto ≥18px regular ou ≥14px bold = "grande" |

### 1.3 Fontes recomendadas (máximo 2 famílias)

| Categoria | Fontes (Google Fonts — gratuitas) | Quando usar |
|---|---|---|
| **Sans-serif UI** (padrão) | **Inter**, Plus Jakarta Sans, DM Sans, Geist Sans, Outfit | Qualquer produto digital moderno |
| **Sans-serif geométrica** | Space Grotesk, Manrope, Sora, Urbanist | Tech, fintech, SaaS |
| **Serif editorial** | Fraunces, Playfair Display, Lora | Landing pages, editoriais, premium |
| **Monospace** | JetBrains Mono, Fira Code, Geist Mono | Código, dados numéricos, dashboards |
| **System stack** (zero carregamento) | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | Quando performance é prioridade máxima |

### 1.4 Setup base de tipografia (CSS)

```css
/* ===== TYPOGRAPHY FOUNDATION — cole em todo projeto ===== */
:root {
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  --line-height-tight:   1.15;   /* headlines */
  --line-height-snug:    1.35;   /* subheadings */
  --line-height-normal:  1.55;   /* corpo padrão */
  --line-height-relaxed: 1.65;   /* leitura longa */

  --paragraph-max-width: 65ch;   /* legibilidade ideal */
}

html {
  font-size: 16px; /* nunca altere isso — afeta todos os rem */
}

body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: var(--line-height-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

p, li, blockquote, dd {
  max-width: var(--paragraph-max-width);
}

/* ANTI-PATTERN: nunca justified sem hyphens */
p { text-align: left; }       /* ✅ */
/* p { text-align: justify; } ❌ */

/* Respeitar preferência de movimento do sistema */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 1ms !important;
    animation-delay: -1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: -1ms !important;
    scroll-behavior: auto !important;
  }
}
```

✅ **Regras para o agente:**
- Sempre incluir `-webkit-font-smoothing: antialiased` no body.
- Sempre incluir o bloco `prefers-reduced-motion`.
- Sempre declarar `font-size: 16px` no `html` (nunca em `px` no body).
- Nunca usar `font-size` menor que `0.75rem` (12px) em qualquer elemento.

---

## 2. Escala de Tipos — Tamanhos por Plataforma

> Material Design 3 usa a escala **Major Second (×1.125)** com base em **14** como
> tamanho-chave do corpo. O web usa `rem`; iOS/Android usa `sp`/`pt`.
> **Conversão:** `sp ÷ 16 = rem` (ex: 24sp = 1.5rem).

### 2.1 Escala completa de tipos para web

Valores em `rem` (base 16px). Coluna Mobile = ajuste para ≤640px.
**Títulos reduzem. Corpo NÃO reduz.**

| Token CSS | Uso | Desktop | Mobile (≤640px) | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| `--text-display-2xl` | Hero de landing page | `5rem` (80px) | `3rem` (48px) | 800 | 1.0 | −0.04em |
| `--text-display-xl` | Título hero principal | `4rem` (64px) | `2.5rem` (40px) | 700–800 | 1.05 | −0.03em |
| `--text-display-lg` | Título de página | `3.5rem` (56px) | `2.25rem` (36px) | 700 | 1.08 | −0.025em |
| `--text-display-md` | H1 de seção grande | `2.75rem` (44px) | `2rem` (32px) | 700 | 1.1 | −0.02em |
| `--text-display-sm` | H1 padrão | `2.25rem` (36px) | `1.75rem` (28px) | 600–700 | 1.15 | −0.015em |
| `--text-heading-xl` | H2 | `1.875rem` (30px) | `1.5rem` (24px) | 600 | 1.2 | −0.01em |
| `--text-heading-lg` | H3 | `1.5rem` (24px) | `1.25rem` (20px) | 600 | 1.25 | −0.01em |
| `--text-heading-md` | H4 | `1.25rem` (20px) | `1.125rem` (18px) | 600 | 1.3 | −0.005em |
| `--text-heading-sm` | H5 / Label de seção | `1.125rem` (18px) | `1rem` (16px) | 600 | 1.35 | 0 |
| `--text-title` | H6 / Título de card | `1rem` (16px) | `1rem` (16px) | 600 | 1.4 | 0 |
| `--text-body-lg` | Lead / Subtítulo | `1.125rem` (18px) | `1.0625rem` (17px) | 400 | 1.65 | 0 |
| `--text-body-md` | **Corpo padrão** ⭐ | `1rem` (16px) | `1rem` (16px) | 400 | 1.55 | 0 |
| `--text-body-sm` | Corpo secundário | `0.875rem` (14px) | `0.875rem` (14px) | 400 | 1.5 | +0.005em |
| `--text-caption` | Legendas, meta, timestamps | `0.8125rem` (13px) | `0.8125rem` (13px) | 400–500 | 1.45 | +0.01em |
| `--text-overline` | Labels de categoria, eyebrows | `0.75rem` (12px) | `0.75rem` (12px) | 500–600 | 1.4 | +0.06em (uppercase) |
| `--text-micro` | Badges, contadores, tooltips | `0.6875rem` (11px) | `0.6875rem` (11px) | 500 | 1.3 | +0.02em |

> 🚫 **NUNCA reduza** `--text-body-md` no mobile. O corpo de texto deve ser
> sempre ≥16px em qualquer viewport. Reduzir o corpo **destrói** a leitura.

### 2.2 Implementação CSS com `clamp()` (fluid type)

O `clamp()` cria transições suaves entre mobile e desktop **sem media queries**.
Use em títulos; não use em corpo de texto.

```css
/* ===== ESCALA DE TIPOS FLUIDA ===== */
:root {
  /* Fórmula: clamp(MIN-mobile, VIEWPORT-RELATIVO, MAX-desktop) */
  --text-display-2xl: clamp(3rem, 6vw + 1.5rem, 5rem);
  --text-display-xl:  clamp(2.5rem, 5vw + 1rem, 4rem);
  --text-display-lg:  clamp(2.25rem, 4vw + 1rem, 3.5rem);
  --text-display-md:  clamp(2rem, 3vw + 0.75rem, 2.75rem);
  --text-display-sm:  clamp(1.75rem, 2.5vw + 0.75rem, 2.25rem);
  --text-heading-xl:  clamp(1.5rem, 2vw + 0.75rem, 1.875rem);
  --text-heading-lg:  clamp(1.25rem, 1.5vw + 0.625rem, 1.5rem);
  --text-heading-md:  clamp(1.125rem, 1vw + 0.75rem, 1.25rem);
  --text-heading-sm:  clamp(1rem, 0.5vw + 0.875rem, 1.125rem);

  /* Corpo: FIXO — não usa clamp */
  --text-title:    1rem;
  --text-body-lg:  1.125rem;
  --text-body-md:  1rem;        /* ← tamanho mínimo aceitável */
  --text-body-sm:  0.875rem;
  --text-caption:  0.8125rem;
  --text-overline: 0.75rem;
  --text-micro:    0.6875rem;
}

/* ===== CLASSES UTILITÁRIAS ===== */
.text-display-2xl { font-size: var(--text-display-2xl); font-weight: 800; line-height: 1.0; letter-spacing: -0.04em; }
.text-display-xl  { font-size: var(--text-display-xl);  font-weight: 700; line-height: 1.05; letter-spacing: -0.03em; }
.text-display-lg  { font-size: var(--text-display-lg);  font-weight: 700; line-height: 1.08; letter-spacing: -0.025em; }
.text-display-md  { font-size: var(--text-display-md);  font-weight: 700; line-height: 1.1;  letter-spacing: -0.02em; }
.text-display-sm  { font-size: var(--text-display-sm);  font-weight: 600; line-height: 1.15; letter-spacing: -0.015em; }
.text-heading-xl  { font-size: var(--text-heading-xl);  font-weight: 600; line-height: 1.2;  letter-spacing: -0.01em; }
.text-heading-lg  { font-size: var(--text-heading-lg);  font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
.text-heading-md  { font-size: var(--text-heading-md);  font-weight: 600; line-height: 1.3; }
.text-heading-sm  { font-size: var(--text-heading-sm);  font-weight: 600; line-height: 1.35; }
.text-title       { font-size: var(--text-title);       font-weight: 600; line-height: 1.4; }
.text-body-lg     { font-size: var(--text-body-lg);     font-weight: 400; line-height: 1.65; }
.text-body-md     { font-size: var(--text-body-md);     font-weight: 400; line-height: 1.55; }
.text-body-sm     { font-size: var(--text-body-sm);     font-weight: 400; line-height: 1.5;  letter-spacing: 0.005em; }
.text-caption     { font-size: var(--text-caption);     font-weight: 400; line-height: 1.45; letter-spacing: 0.01em; }
.text-overline    { font-size: var(--text-overline);    font-weight: 600; line-height: 1.4;  letter-spacing: 0.06em; text-transform: uppercase; }
.text-micro       { font-size: var(--text-micro);       font-weight: 500; line-height: 1.3;  letter-spacing: 0.02em; }
```

### 2.3 Equivalência Tailwind CSS

```js
// tailwind.config.js — fontSize com lineHeight e letterSpacing embutidos
module.exports = {
  theme: {
    extend: {
      fontSize: {
        'micro':        ['0.6875rem', { lineHeight: '1.3',  letterSpacing: '0.02em',  fontWeight: '500' }],
        'overline':     ['0.75rem',   { lineHeight: '1.4',  letterSpacing: '0.06em',  fontWeight: '600' }],
        'caption':      ['0.8125rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        'body-sm':      ['0.875rem',  { lineHeight: '1.5',  letterSpacing: '0.005em' }],
        'body-md':      ['1rem',      { lineHeight: '1.55' }],
        'body-lg':      ['1.125rem',  { lineHeight: '1.65' }],
        'title':        ['1rem',      { lineHeight: '1.4',  fontWeight: '600' }],
        'heading-sm':   ['1.125rem',  { lineHeight: '1.35', fontWeight: '600' }],
        'heading-md':   ['1.25rem',   { lineHeight: '1.3',  fontWeight: '600' }],
        'heading-lg':   ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'heading-xl':   ['1.875rem',  { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
        'display-sm':   ['2.25rem',   { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md':   ['2.75rem',   { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-lg':   ['3.5rem',    { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-xl':   ['4rem',      { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-2xl':  ['5rem',      { lineHeight: '1.0',  letterSpacing: '-0.04em' }],
      },
    },
  },
}
```

✅ **Regras para o agente:**
- `clamp()` em todos os títulos (display + heading). Corpo: fixo.
- Nunca `font-size` abaixo de `0.75rem` em texto visível.
- Toda headline longa usa `letter-spacing` negativo.
- Parágrafos sempre com `max-width: 65ch`.

---

## 3. Breakpoints e Viewports Modernos

> **Fonte oficial:** Material Design 3 (maio 2026) define 5 breakpoints:
> Compact, Medium, Expanded, Large, Extra-large.
> Tailwind e a maioria dos frameworks usam 6 breakpoints compatíveis.

### 3.1 Breakpoints oficiais — Material Design 3 (2025/2026)

| Nome | Largura (dp/px) | Dispositivos típicos | Panes | Navegação |
|---|---|---|---|---|
| **Compact** | `< 600px` | Smartphone (portrait) | 1 | Bottom nav bar |
| **Medium** | `600–839px` | Tablet portrait, foldável | 1 (recom.) ou 2 | Nav bar + nav rail colapsado |
| **Expanded** | `840–1199px` | Tablet landscape, laptop | 2 (recom.) | Nav rail colapsado/expandido |
| **Large** | `1200–1599px` | Desktop | 2 (recom.) | Nav rail expandido |
| **Extra-large** | `≥ 1600px` | Ultrawide, monitores externos | 2–3 | Nav rail expandido |

### 3.2 Breakpoints de implementação web (CSS)

```css
/* ===== BREAKPOINTS — sistema de 6 pontos ===== */
/*
  xs  → < 480px   (smartphone pequeno, iPhone SE)
  sm  → 480–639px (smartphone grande, iPhone Plus)
  md  → 640–767px (tablet pequeno, Material "Medium" início)
  lg  → 768–1023px (tablet, Material "Medium" / "Expanded" início)
  xl  → 1024–1279px (laptop pequeno, Material "Expanded")
  2xl → 1280–1535px (desktop, Material "Large")
  3xl → ≥ 1536px  (ultrawide, Material "Extra-large")
*/

/* Mobile-first: escreva o estilo base para mobile,
   depois SOBREPONHA para telas maiores */

/* xs — base (mobile first, sem media query) */
/* sm — smartphone largo */
@media (min-width: 480px)  { /* sm  */ }
/* md — tablet pequeno */
@media (min-width: 640px)  { /* md  */ }
/* lg — tablet / laptop pequeno */
@media (min-width: 768px)  { /* lg  */ }
/* xl — laptop */
@media (min-width: 1024px) { /* xl  */ }
/* 2xl — desktop */
@media (min-width: 1280px) { /* 2xl */ }
/* 3xl — ultrawide */
@media (min-width: 1536px) { /* 3xl */ }
```

### 3.3 Dispositivos modernos — referência de tamanhos reais (2024/2025)

| Dispositivo | Resolução física | Viewport CSS aproximado | Breakpoint |
|---|---|---|---|
| iPhone SE (3ª geração) | 750×1334 @2x | 375×667px | xs |
| iPhone 15 | 1179×2556 @3x | 393×852px | xs |
| iPhone 15 Plus | 1290×2796 @3x | 430×932px | sm |
| iPhone 15 Pro Max | 1290×2796 @3x | 430×932px | sm |
| Samsung Galaxy S24 | 1080×2340 @2.6x | 412×915px | sm |
| iPad Mini (6ª gen) | 1488×2266 @2x | 744×1133px | lg |
| iPad Air (M2) | 1640×2360 @2x | 820×1180px | lg |
| iPad Pro 13" | 2064×2752 @2x | 1032×1376px | xl |
| MacBook Air 13" | 2560×1664 @2x | 1280×832px | 2xl |
| MacBook Pro 14" | 3024×1964 @2x | 1512×982px | 2xl / 3xl |
| iMac 27" | 5120×2880 @2x | 2560×1440px | 3xl |
| Dell XPS 15 | 3840×2400 @2.5x | 1536×960px | 3xl |

### 3.4 `meta viewport` — obrigatório

```html
<!-- Obrigatório em TODA página web/PWA — sem isso, mobile não funciona -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- NÃO adicione maximum-scale ou user-scalable=no — viola acessibilidade -->
<!-- ❌ <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"> -->
```

### 3.5 Detectar tipo de input (touch vs pointer)

```css
/* Adapta UI baseado no tipo de input real, não no tamanho da tela */
@media (any-pointer: coarse) {
  /* Usuário com tela touch — aumente áreas clicáveis */
  .btn, .link, .interactive { min-height: 48px; padding: 0.75rem 1.5rem; }
}

@media (any-pointer: fine) {
  /* Mouse / trackpad — pode usar densidades maiores */
  .btn { min-height: 36px; }
}

@media (hover: hover) {
  /* Dispositivo com hover real (mouse) — pode usar hover effects */
  .card:hover { transform: translateY(-2px); }
}

@media (hover: none) {
  /* Touch — sem hover; use active/focus */
  .card:active { opacity: 0.85; }
}
```

✅ **Regras para o agente:**
- Sempre `mobile-first`: estilos base = mobile; media queries adicionam.
- Sempre incluir `<meta name="viewport">` sem `user-scalable=no`.
- Usar `any-pointer: coarse` para adaptar touch targets, não só largura de tela.
- Layout padrão: 1 coluna → 2 colunas → 3 colunas conforme breakpoint cresce.

---

## 4. Grid System e Layout

### 4.1 Grid por breakpoint (Material Design 3 oficial)

| Breakpoint | Colunas | Calha (gutter) | Margem lateral |
|---|---|---|---|
| Compact `< 600px` | **4** colunas | `16px` | `16px` |
| Medium `600–839px` | **8** colunas | `24px` | `24px` |
| Expanded `840–1199px` | **12** colunas | `24px` | `24px` |
| Large `1200–1599px` | **12** colunas | `24px` | `24px` |
| Extra-large `≥ 1600px` | **12** colunas | `24px` | `24px` |

### 4.2 Implementação com CSS Grid

```css
/* ===== GRID RESPONSIVO — Mobile First ===== */
.grid-container {
  display: grid;
  width: 100%;
  padding-inline: 1rem;        /* 16px margem lateral — compact */
  gap: 1rem;                   /* 16px gutter — compact */
  grid-template-columns: repeat(4, 1fr);  /* 4 colunas — compact */
}

@media (min-width: 640px) {   /* Medium */
  .grid-container {
    padding-inline: 1.5rem;   /* 24px */
    gap: 1.5rem;              /* 24px */
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (min-width: 840px) {   /* Expanded */
  .grid-container {
    grid-template-columns: repeat(12, 1fr);
  }
}

/* Largura máxima do conteúdo — evita layouts muito largos */
.content-wrapper {
  max-width: 1440px;
  margin-inline: auto;
  width: 100%;
  padding-inline: clamp(1rem, 5vw, 2rem);
}

/* Largura máxima para leitura */
.prose { max-width: 65ch; }
```

### 4.3 Padrão de layout por breakpoint

```css
/* Componente que vira de 1 → 2 → 3 colunas */
.card-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;              /* mobile: 1 coluna */
}

@media (min-width: 640px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }  /* tablet: 2 */
}

@media (min-width: 1024px) {
  .card-grid { grid-template-columns: repeat(3, 1fr); }  /* desktop: 3 */
}

@media (min-width: 1280px) {
  .card-grid { grid-template-columns: repeat(4, 1fr); }  /* wide: 4 */
}
```

### 4.4 Sidebar + Content (layout adaptativo)

Seguindo Material Design 3: compact = 1 painel, expanded = 2 painéis.

```css
.app-layout {
  display: flex;
  flex-direction: column;
}

/* Sidebar escondida no mobile (vira bottom nav ou drawer) */
.sidebar { display: none; }

@media (min-width: 840px) {  /* Expanded — revela sidebar */
  .app-layout {
    flex-direction: row;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;           /* collapsed rail: 80px / expanded: 240px */
    min-height: 100dvh;
    flex-shrink: 0;
  }
  .main-content { flex: 1; min-width: 0; }
}
```

✅ **Regras para o agente:**
- Compact = 4 cols / Medium = 8 cols / Expanded+ = 12 cols.
- Margem lateral: 16px em compact, 24px em medium+.
- `max-width: 1440px` no wrapper principal.
- Sidebar oculta no mobile — vira bottom navigation.

---

## 5. Espaçamento (Spacing System)

> Material Design 3: usa uma **escala de 8dp** como base.
> Todos os espaçamentos devem ser múltiplos de 4 ou 8px.

### 5.1 Escala de espaçamento (tokens)

| Token | Valor | Pixels | Uso típico |
|---|---|---|---|
| `--space-0` | `0` | 0 | Reset |
| `--space-0-5` | `0.125rem` | 2px | Micro-ajustes |
| `--space-1` | `0.25rem` | 4px | Gap entre ícone e label; badges |
| `--space-1-5` | `0.375rem` | 6px | Padding interno de badges |
| `--space-2` | `0.5rem` | 8px | Padding mínimo; espaço entre itens |
| `--space-3` | `0.75rem` | 12px | Padding de botão pequeno; espaço interno |
| `--space-4` | `1rem` | 16px | **Espaçamento padrão** — margem de seção pequena |
| `--space-5` | `1.25rem` | 20px | Gap entre componentes |
| `--space-6` | `1.5rem` | 24px | Padding de card; gap de grid |
| `--space-8` | `2rem` | 32px | Seções dentro de página |
| `--space-10` | `2.5rem` | 40px | Separação de blocos |
| `--space-12` | `3rem` | 48px | Seções grandes |
| `--space-16` | `4rem` | 64px | Espaçamento entre seções de landing page |
| `--space-20` | `5rem` | 80px | Seções hero, sections de marketing |
| `--space-24` | `6rem` | 96px | Espaçamento max de landing |
| `--space-32` | `8rem` | 128px | Seções com muito respiro |

```css
:root {
  --space-0:    0;
  --space-0-5:  0.125rem;  /* 2px */
  --space-1:    0.25rem;   /* 4px */
  --space-1-5:  0.375rem;  /* 6px */
  --space-2:    0.5rem;    /* 8px */
  --space-3:    0.75rem;   /* 12px */
  --space-4:    1rem;      /* 16px */
  --space-5:    1.25rem;   /* 20px */
  --space-6:    1.5rem;    /* 24px */
  --space-8:    2rem;      /* 32px */
  --space-10:   2.5rem;    /* 40px */
  --space-12:   3rem;      /* 48px */
  --space-16:   4rem;      /* 64px */
  --space-20:   5rem;      /* 80px */
  --space-24:   6rem;      /* 96px */
  --space-32:   8rem;      /* 128px */
}

/* Espaçamento de seção — fluido */
.section {
  padding-block: clamp(var(--space-12), 8vw, var(--space-24));
}
.section-sm {
  padding-block: clamp(var(--space-8), 5vw, var(--space-16));
}
```

### 5.2 Hierarquia de espaçamento (regra de proximidade)

```
Conteúdo relacionado = espaçamento PEQUENO (4–8px)
Grupos de conteúdo   = espaçamento MÉDIO  (16–24px)
Seções diferentes    = espaçamento GRANDE (48–96px)

Nunca coloque dois itens com o mesmo espaçamento acima e abaixo —
isso destrói a hierarquia visual. O elemento deve "pertencer" ao
grupo mais próximo dele.
```

✅ **Regras para o agente:**
- Todos os espaçamentos = múltiplos de 4px ou 8px. Nunca valores aleatórios.
- Padding de botão padrão: `0.625rem 1.25rem` (10px 20px) mínimo; `0.75rem 1.5rem` preferido.
- Gap de grid: `1rem` (compact) / `1.5rem` (medium+).
- Seções de landing page: `clamp(3rem, 8vw, 6rem)` padding vertical.

---

## 6. Componentes por Breakpoint

> Seguindo Material Design 3: o comportamento e até o componente **muda** por
> breakpoint — não apenas o tamanho.

### 6.1 Botões

```css
/* Botão — fundação */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;                 /* espaço ícone → label */
  font-size: var(--text-body-md);
  font-weight: 500;
  line-height: 1;
  border-radius: 0.5rem;       /* 8px — padrão; ajuste p/ marca */
  border: none;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 150ms ease, box-shadow 150ms ease,
              transform 100ms ease, opacity 150ms ease;

  /* Touch target mínimo — 48×48px (web.dev / Apple HIG) */
  min-height: 48px;
  min-width: 48px;
  padding-inline: 1.5rem;      /* 24px */
}

/* Desktop — pode ser menor (mouse é preciso) */
@media (any-pointer: fine) {
  .btn {
    min-height: 40px;
    padding-inline: 1.25rem;
  }
  .btn-sm {
    min-height: 32px;
    font-size: var(--text-body-sm);
    padding-inline: 1rem;
  }
}

/* Variantes de tamanho */
.btn-lg {
  min-height: 56px;
  font-size: var(--text-body-lg);
  padding-inline: 2rem;
}

/* Estados */
.btn:hover    { filter: brightness(1.08); }
.btn:active   { transform: scale(0.97); }
.btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}
```

### 6.2 Inputs / campos de formulário

```css
.input {
  width: 100%;
  font-size: var(--text-body-md);   /* NUNCA < 16px — iOS faz zoom automático */
  font-family: inherit;
  line-height: 1.5;
  padding: 0.75rem 1rem;           /* 12px 16px */
  min-height: 48px;                /* touch target */
  border: 1.5px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-input-bg);
  color: var(--color-text);
  transition: border-color 150ms ease, box-shadow 150ms ease;
  -webkit-appearance: none;        /* remove estilo iOS padrão */
  appearance: none;
}

/* CRÍTICO: iOS faz zoom automático se font-size < 16px em inputs */
/* Nunca use font-size: 14px ou menor em inputs */

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha20);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-disabled-bg);
}
```

> ⚠️ **Regra crítica para iOS:** se o `font-size` de um `<input>` for menor que
> **16px**, o iOS Safari **faz zoom automático** na página ao focar o campo.
> SEMPRE use `font-size: 1rem` (16px) ou maior em inputs.

### 6.3 Cards

```css
.card {
  background: var(--color-surface);
  border-radius: clamp(0.5rem, 2vw, 1rem);   /* 8–16px fluido */
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: box-shadow 200ms ease, transform 200ms ease;
}

/* Compact: card full-width ou com gap pequeno */
.card { padding: var(--space-4); }   /* 16px */

@media (min-width: 640px) {
  .card { padding: var(--space-6); }  /* 24px */
}

/* Card interativo — hover só em dispositivos com ponteiro fino (mouse) */
@media (hover: hover) and (pointer: fine) {
  .card-interactive:hover {
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    transform: translateY(-2px);
  }
}
/* Touch — usa active state no lugar de hover */
.card-interactive:active {
  opacity: 0.92;
}
```

### 6.4 Modais e dialogs

| Breakpoint | Comportamento | Largura | Posição |
|---|---|---|---|
| Compact (`<640px`) | **Full-screen** ou bottom sheet | `100%` | Bottom / full |
| Medium (`640px+`) | Dialog centralizado | `min(90%, 480px)` | Center |
| Large (`1024px+`) | Dialog centralizado | `min(80%, 640px)` | Center |

```css
.dialog-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;      /* mobile: bottom */
  justify-content: center;
  z-index: 50;
}

.dialog {
  background: var(--color-surface);
  width: 100%;
  border-radius: 1.5rem 1.5rem 0 0;   /* mobile: bottom sheet */
  padding: var(--space-6);
  max-height: 90dvh;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .dialog-overlay { align-items: center; }
  .dialog {
    width: min(90%, 480px);
    border-radius: 1rem;      /* desktop: dialog normal */
    max-height: 85dvh;
  }
}
```

✅ **Regras para o agente:**
- Input `font-size` NUNCA < `1rem` (16px) — iOS zoom issue.
- Cards interativos: hover **apenas** em `hover: hover` — não em touch.
- Modais mobile = bottom sheet; desktop = dialog centralizado.
- Botões touch: `min-height: 48px` com `any-pointer: coarse`.

---

## 7. Touch Targets e Áreas de Interação

> **Fonte oficial:** web.dev — "Tamanho mínimo recomendado: 48px × 48px.
> Espaçamento mínimo entre alvos: 8px." (Material Design 3 e Apple HIG concordam.)

### 7.1 Regras de touch target

| Plataforma | Tamanho mínimo | Espaçamento mínimo entre targets |
|---|---|---|
| **Web (mobile)** | **48×48px** | **8px** |
| **iOS (Apple HIG)** | **44×44pt** (≈ 44px @1x) | — |
| **Android (Material)** | **48×48dp** | 8dp |
| **WCAG 2.5.8 (AA)** | **24×24px** | Suficiente p/ não sobrepor |
| **WCAG 2.5.5 (AAA)** | **44×44px** | — |

```css
/* Técnica: "ghost tap area" — aumenta área sem mudar visual */
.icon-btn {
  position: relative;
  width: 24px;   /* visual: ícone 24px */
  height: 24px;
}

.icon-btn::before {
  content: '';
  position: absolute;
  /* Expande área de toque para 48x48px */
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  /* Sem background — área invisível */
}

/* Alternativa: padding para atingir 48px */
.icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px;            /* 24 + 12+12 = 48px de área */
  border-radius: 50%;
  -webkit-tap-highlight-color: transparent;
}
```

```css
/* Todos os elementos interativos em touch */
@media (any-pointer: coarse) {
  a, button, [role="button"], input, select, textarea, label {
    min-height: 48px;
    min-width: 48px;
  }
  /* Links inline em texto ficam de fora — 
     aumentar quebraria o layout do parágrafo */
  p a, li a, span a { min-height: unset; min-width: unset; }
}
```

### 7.2 Safe Areas (notch, home indicator — iOS)

```css
/* Suporte a áreas seguras — iPhone com notch/Dynamic Island */
body {
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top);
}

/* Bottom navigation bar — deve ficar acima do home indicator */
.bottom-nav {
  padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Viewport height correta em mobile (sem a barra do browser) */
.full-height {
  min-height: 100dvh;   /* dvh = dynamic viewport height — melhor que 100vh */
}
```

> ⚠️ Use sempre `100dvh` (dynamic viewport height) em vez de `100vh` para
> elementos full-screen no mobile. `100vh` inclui a barra do browser e causa
> scroll indesejado.

✅ **Regras para o agente:**
- Todos os botões/links = `min-height: 48px` em dispositivos touch.
- Usar `100dvh` (não `100vh`) em elementos full-screen.
- Sempre incluir `env(safe-area-inset-*)` em navbars e elementos posicionados.
- `tap-highlight-color: transparent` em elementos touch customizados.

---

## 8. Estados de Componentes

> Material Design 3 define 6 estados visuais. Cada estado deve ter
> **dois indicadores** para garantir acessibilidade.

### 8.1 Os 6 estados (Material Design 3)

| Estado | Quando ocorre | Indicador visual obrigatório |
|---|---|---|
| **1. Enabled** | Componente interativo disponível | Visual padrão do componente |
| **2. Disabled** | Não pode ser usado | `opacity: 0.38` + cursor não-interativo |
| **3. Hover** | Cursor sobre o elemento (mouse) | Mudança de cor/sombra + cursor pointer |
| **4. Focused** | Teclado/voz focou no elemento | **Outline de foco visível** (ring de 2px) |
| **5. Pressed** | Clique/toque ativo | Scale down + mudança de cor |
| **6. Dragged** | Arrastar (drag and drop) | Elevação + opacidade reduzida |

### 8.2 Implementação dos estados

```css
/* ===== ESTADOS DE COMPONENTE — template universal ===== */

/* Estado 1: Enabled — definido pelo componente */

/* Estado 2: Disabled */
[disabled], [aria-disabled="true"] {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

/* Estado 3: Hover — SOMENTE em devices com hover real */
@media (hover: hover) {
  .interactive:hover {
    /* Aplique um dos: filter, background-color, box-shadow, border-color */
    filter: brightness(1.06);
  }
}

/* Estado 4: Focus — NUNCA remova outline sem substituir */
/* ❌ PROIBIDO: :focus { outline: none; } */
/* ✅ CORRETO: */
:focus { outline: none; }    /* remove outline padrão feio */
:focus-visible {             /* adiciona outline bonito APENAS via teclado */
  outline: 2px solid var(--color-focus, #3b82f6);
  outline-offset: 2px;
  border-radius: inherit;
}

/* Estado 5: Pressed */
.interactive:active {
  transform: scale(0.97);
  transition: transform 80ms ease;
}

/* Estado 6: Dragged */
[draggable="true"]:active,
.dragging {
  opacity: 0.75;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  cursor: grabbing;
}

/* Ring de foco acessível — utilitário global */
.focus-ring {
  transition: box-shadow 150ms ease;
}
.focus-ring:focus-visible {
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-focus);
}
```

> ⚠️ **Regra absoluta:** nunca use `outline: none` ou `outline: 0` sozinho
> num seletor `:focus`. Sempre substitua por `:focus-visible` com outline
> visível. Usuários de teclado e leitores de tela dependem disso.

✅ **Regras para o agente:**
- `:focus` remove outline padrão; `:focus-visible` adiciona outline customizado.
- Hover effects APENAS dentro de `@media (hover: hover)`.
- Disabled = `opacity: 0.38` + `pointer-events: none`.
- Pressed = `transform: scale(0.97)` — sutil, universal.

---

## 9. Animações e Motion Design

> **Fonte oficial:** Material Design 3 Motion Physics System (maio 2025).
> web.dev: `prefers-reduced-motion` é **obrigatório** para acessibilidade.

### 9.1 Princípios de motion

| Princípio | Regra |
|---|---|
| **Propósito** | Cada animação deve servir um propósito funcional (feedback, orientação, contexto) |
| **Velocidade** | Rápida o suficiente para não atrasar; lenta o suficiente para ser percebida |
| **Naturalidade** | Springs são preferidos a curvas lineares — parecem físicos |
| **Reduzido** | Sempre respeitar `prefers-reduced-motion` |
| **Não distrai** | Animações decorativas devem ser sutis e opcionais |

### 9.2 Durações e easings padrão

| Categoria | Duração | Easing | Quando usar |
|---|---|---|---|
| **Micro** | `80–100ms` | `ease-out` | Pressed, ripple, toggle |
| **Rápida** | `150–200ms` | `ease-out` | Hover, tooltip show, focus ring |
| **Padrão** | `200–300ms` | `cubic-bezier(0.2, 0, 0, 1)` | Fade, color transition, expand |
| **Entrance** | `250–350ms` | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` | Elementos entrando na tela |
| **Exit** | `150–200ms` | `cubic-bezier(0.3, 0, 1, 1)` | Elementos saindo da tela |
| **Emphasis** | `400–500ms` | `cubic-bezier(0.2, 0, 0, 1)` | Bottom sheet, modal, drawer |
| **Longa** | `500–700ms` | Spring-like | Full-screen transition, page change |

```css
:root {
  /* Easings */
  --ease-standard:   cubic-bezier(0.2, 0, 0, 1);
  --ease-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);  /* entrada */
  --ease-accelerate: cubic-bezier(0.3, 0, 1, 1);           /* saída */
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);   /* spring com bounce */
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);

  /* Durações */
  --duration-micro:    80ms;
  --duration-fast:     150ms;
  --duration-normal:   250ms;
  --duration-entrance: 300ms;
  --duration-exit:     200ms;
  --duration-emphasis: 450ms;
}
```

### 9.3 Animações de entrada (entrance)

```css
/* Fade + slide up — para cards e conteúdo entrando */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Fade simples — para overlays e tooltips */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Scale in — para modais e cards */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Slide up — para bottom sheets */
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* Aplicação */
.card-animate    { animation: fadeSlideUp var(--duration-entrance) var(--ease-decelerate) both; }
.modal-animate   { animation: scaleIn     var(--duration-emphasis) var(--ease-decelerate) both; }
.overlay-animate { animation: fadeIn      var(--duration-normal)   var(--ease-out) both; }
.sheet-animate   { animation: slideUp     var(--duration-emphasis) var(--ease-decelerate) both; }

/* Stagger — múltiplos cards entrando em sequência */
.card-grid .card:nth-child(1) { animation-delay: 0ms; }
.card-grid .card:nth-child(2) { animation-delay: 50ms; }
.card-grid .card:nth-child(3) { animation-delay: 100ms; }
.card-grid .card:nth-child(4) { animation-delay: 150ms; }
/* Não passe de 200ms de delay total — parece lento */
```

### 9.4 `prefers-reduced-motion` — obrigatório (web.dev)

```css
/* OBRIGATÓRIO em todo projeto — respeita configuração do sistema */
@media (prefers-reduced-motion: reduce) {
  /* Remove todas as animações e transições não essenciais */
  *, ::before, ::after {
    animation-duration: 1ms !important;
    animation-delay: -1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: -1ms !important;
    scroll-behavior: auto !important;
  }

  /* Mantém transições de visibilidade (importantes para acessibilidade) */
  .overlay-animate,
  .modal-animate,
  .sheet-animate {
    animation: fadeIn 1ms both;
  }
}
```

```js
// JavaScript — verificar preferência antes de animar
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  element.animate([
    { opacity: 0, transform: 'translateY(12px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 300, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)', fill: 'both' });
} else {
  element.style.opacity = '1'; // sem animação
}
```

### 9.5 Micro-interações por componente

| Componente | Animação | Duração | Notas |
|---|---|---|---|
| **Botão (pressed)** | `scale(0.97)` | 80ms ease-out | Instantâneo ao toque |
| **Botão (hover)** | `brightness(1.06)` | 150ms ease-out | Só em mouse |
| **Toggle/Switch** | Slide do thumb + color | 200ms spring | Bounce sutil |
| **Checkbox** | Check icon scale-in | 150ms ease-out | — |
| **Tooltip** | `fadeIn` + `translateY(-4px)` | 150ms ease-out | Delay de 300ms antes de mostrar |
| **Toast/Snackbar** | `slideUp` → `slideDown` | 300ms / 250ms | Auto-dismiss em 4s |
| **Dropdown** | `scaleIn` + `fadeIn` | 200ms decelerate | Origem no trigger |
| **Accordion** | `height: auto` via JS | 250ms ease-standard | Não anima `height: auto` diretamente |
| **Skeleton** | `shimmer` pulse | 1.5s linear infinite | Para com conteúdo carregado |
| **Ripple** | `scale(0→2.5)` + fade | 400ms ease-out | Nasce no ponto de toque |

```css
/* Skeleton shimmer */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-skeleton-base)   25%,
    var(--color-skeleton-shine)  50%,
    var(--color-skeleton-base)   75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
  border-radius: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: var(--color-skeleton-base); }
}
```

✅ **Regras para o agente:**
- Sempre incluir `prefers-reduced-motion` block CSS.
- Duração máxima de micro-interação: 150ms. Transitions de UI: 200–300ms.
- Nenhuma animação infinita sem pausa no `prefers-reduced-motion`.
- Stagger de listas: máx. 50ms por item, 200ms total.
- Usar `transform` e `opacity` para animações (GPU — não causam reflow).
- NUNCA animar `width`, `height`, `margin`, `padding` diretamente — causa reflow.

---

## 10. Cores e Temas (Dark / Light Mode)

### 10.1 Estrutura de tokens de cor

```css
/* ===== TOKEN SYSTEM — Light + Dark mode ===== */
:root {
  /* Primárias */
  --color-primary:         #3b82f6;  /* blue-500 */
  --color-primary-hover:   #2563eb;  /* blue-600 */
  --color-primary-light:   #dbeafe;  /* blue-100 */
  --color-primary-alpha20: rgba(59, 130, 246, 0.2);

  /* Superfície */
  --color-bg:              #ffffff;
  --color-bg-subtle:       #f8fafc;   /* slate-50 */
  --color-surface:         #ffffff;
  --color-surface-raised:  #f1f5f9;   /* slate-100 */
  --color-overlay:         rgba(0, 0, 0, 0.5);

  /* Texto */
  --color-text:            #0f172a;   /* slate-950 — alto contraste */
  --color-text-secondary:  #475569;   /* slate-600 */
  --color-text-tertiary:   #94a3b8;   /* slate-400 */
  --color-text-disabled:   #cbd5e1;   /* slate-300 */
  --color-text-inverse:    #ffffff;

  /* Bordas */
  --color-border:          #e2e8f0;   /* slate-200 */
  --color-border-strong:   #94a3b8;   /* slate-400 */

  /* Feedback */
  --color-success:         #22c55e;   /* green-500 */
  --color-warning:         #f59e0b;   /* amber-500 */
  --color-error:           #ef4444;   /* red-500 */
  --color-info:            #3b82f6;   /* blue-500 */

  /* Input */
  --color-input-bg:        #ffffff;
  --color-focus:           #3b82f6;

  /* Skeleton */
  --color-skeleton-base:   #f1f5f9;
  --color-skeleton-shine:  #e2e8f0;

  /* Disabled */
  --color-disabled-bg:     #f8fafc;
}

/* ===== DARK MODE ===== */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary:         #60a5fa;   /* blue-400 */
    --color-primary-hover:   #93c5fd;   /* blue-300 */
    --color-primary-light:   #1e3a5f;

    --color-bg:              #0f172a;   /* slate-950 */
    --color-bg-subtle:       #1e293b;   /* slate-800 */
    --color-surface:         #1e293b;
    --color-surface-raised:  #334155;   /* slate-700 */

    --color-text:            #f8fafc;
    --color-text-secondary:  #94a3b8;
    --color-text-tertiary:   #475569;
    --color-text-disabled:   #334155;
    --color-text-inverse:    #0f172a;

    --color-border:          #334155;
    --color-border-strong:   #475569;

    --color-input-bg:        #1e293b;
    --color-focus:           #60a5fa;

    --color-skeleton-base:   #1e293b;
    --color-skeleton-shine:  #334155;
    --color-disabled-bg:     #1e293b;
  }
}

/* Classe manual para toggle de tema */
[data-theme="dark"] {
  /* mesmos valores do @media dark acima */
  color-scheme: dark;
}
[data-theme="light"] {
  color-scheme: light;
}
```

### 10.2 Contraste mínimo (WCAG 2.2)

| Tipo de texto | Contraste mínimo | Meta |
|---|---|---|
| Texto normal (< 18px regular / < 14px bold) | **4.5:1** (AA) | 7:1 (AAA) |
| Texto grande (≥ 18px regular ou ≥ 14px bold) | **3:1** (AA) | 4.5:1 (AAA) |
| UI / componentes / borders | **3:1** (AA) | — |
| Texto decorativo / logotipo | Sem requisito | — |

```
Checar contraste: https://webaim.org/resources/contrastchecker/

Exemplo de pares que PASSAM WCAG AA:
✅ #0f172a sobre #ffffff = 19.1:1
✅ #1e3a5f sobre #dbeafe = 7.0:1
✅ #475569 sobre #ffffff = 5.9:1

Exemplo de pares que REPROVAM:
❌ #94a3b8 sobre #ffffff = 2.5:1 (muito comum — NÃO use como texto principal)
❌ #aaaaaa sobre #ffffff = 2.3:1
```

✅ **Regras para o agente:**
- Usar tokens CSS de cor (não hardcode `#hex` em componentes).
- Sempre incluir `@media (prefers-color-scheme: dark)` com tokens redefinidos.
- `color-scheme: dark/light` no root para elementos do sistema (scrollbars, inputs).
- Checar contraste antes de usar qualquer cor de texto.

---

## 11. Imagens, Ícones e Mídia Responsiva

### 11.1 Imagens responsivas

```html
<!-- Imagem básica responsiva — SEMPRE width + height para evitar layout shift -->
<img
  src="hero.webp"
  alt="Descrição clara do conteúdo"
  width="1200"
  height="630"
  loading="lazy"
  decoding="async"
  style="max-width: 100%; height: auto;"
/>

<!-- Imagem com srcset para diferentes densidades de tela -->
<img
  src="photo-400.webp"
  srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w"
  sizes="(max-width: 640px) 100vw,
         (max-width: 1024px) 50vw,
         33vw"
  alt="Descrição"
  width="1200"
  height="800"
  loading="lazy"
/>

<!-- Hero image — carregue com priority (eager) -->
<img
  src="hero.webp"
  alt="Hero"
  loading="eager"
  fetchpriority="high"
  width="1440" height="720"
/>
```

```css
/* Regras globais de imagem */
img, video, svg {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Container com aspect ratio fixo (sem CLS) */
.media-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 0.5rem;
  background: var(--color-skeleton-base);  /* placeholder enquanto carrega */
}

.media-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 11.2 Ícones responsivos

| Tamanho | Quando usar |
|---|---|
| `16px` (1rem) | Ícones inline em texto, badges |
| `20px` (1.25rem) | Ícones em botões pequenos, labels |
| `24px` (1.5rem) | **Padrão** — botões, nav, listas |
| `32px` (2rem) | Feature icons, cards |
| `48px` (3rem) | Ícones hero de seção |
| `64px+` | Ilustrações, empty states |

```css
/* Ícone sempre com tamanho explícito — evita layout shift */
.icon {
  width: 1.5rem;   /* 24px padrão */
  height: 1.5rem;
  flex-shrink: 0;  /* não encolhe em flex containers */
}
.icon-sm { width: 1.25rem; height: 1.25rem; }  /* 20px */
.icon-lg { width: 2rem;    height: 2rem; }     /* 32px */
```

✅ **Regras para o agente:**
- Sempre `loading="lazy"` em imagens abaixo do fold; `loading="eager"` no hero.
- Sempre `width` e `height` em tags `<img>` — evita CLS (layout shift).
- Sempre `alt` descritivo (não vazio para imagens de conteúdo).
- Formato preferido: **WebP** com fallback para JPEG/PNG.
- Ícones: sempre `width` e `height` definidos; `flex-shrink: 0` em flex containers.

---

## 12. Formulários e Inputs

### 12.1 Estrutura de campo acessível

```html
<!-- SEMPRE: label + input associados, nunca placeholder como substituto de label -->
<div class="field">
  <label for="email" class="field-label">
    E-mail
    <span aria-label="obrigatório">*</span>
  </label>
  <input
    id="email"
    type="email"
    name="email"
    placeholder="seu@email.com"
    autocomplete="email"
    required
    aria-describedby="email-error"
    class="input"
  />
  <!-- Mensagem de erro — sempre associada ao input via aria-describedby -->
  <span id="email-error" class="field-error" role="alert" aria-live="polite">
    <!-- Vazio quando sem erro -->
  </span>
</div>
```

```css
.field { display: flex; flex-direction: column; gap: 0.375rem; }

.field-label {
  font-size: var(--text-body-sm);
  font-weight: 500;
  color: var(--color-text);
}

.input {
  font-size: 1rem;              /* CRÍTICO: ≥ 16px — iOS não faz zoom */
  padding: 0.75rem 1rem;
  min-height: 48px;
  border: 1.5px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-input-bg);
  color: var(--color-text);
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input:focus-visible {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha20);
  outline: none;
}

.input[aria-invalid="true"] {
  border-color: var(--color-error);
}

.field-error {
  font-size: var(--text-caption);
  color: var(--color-error);
  display: none;
}

.field-error:not(:empty) { display: block; }
```

### 12.2 Comportamento por breakpoint

| Breakpoint | Campos por linha | Botão submit |
|---|---|---|
| Compact | 1 campo full-width | Full-width |
| Medium | 1–2 campos (conforme contexto) | Full-width ou 50% |
| Large | 2–3 campos | Alinhado à direita ou fixed width |

```css
.form-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;   /* mobile: 1 coluna */
}

@media (min-width: 640px) {
  .form-grid { grid-template-columns: 1fr 1fr; }  /* desktop: 2 colunas */
  .form-grid .field-full { grid-column: 1 / -1; }  /* campo full-width */
}
```

✅ **Regras para o agente:**
- Sempre `<label>` associado a cada input — nunca substitua por `placeholder`.
- `font-size: 1rem` (16px) em todos os inputs — regra do iOS.
- Mensagem de erro: `role="alert"` + `aria-live="polite"` + `aria-describedby`.
- `autocomplete` em todos os campos relevantes (melhora UX em mobile).

---

## 13. Navegação Responsiva

> Seguindo Material Design 3: o **tipo** de navegação muda por breakpoint —
> não apenas o tamanho.

### 13.1 Padrão de navegação por breakpoint

| Breakpoint | Padrão de nav | Componente | Itens visíveis |
|---|---|---|---|
| Compact (`< 640px`) | **Bottom Navigation Bar** | Barra fixa no bottom | 3–5 ícones + label |
| Medium (`640–839px`) | **Navigation Rail** (colapsado) | Barra lateral estreita | Ícones somente |
| Expanded (`840–1199px`) | **Navigation Rail** (expandido) | Barra lateral com labels | Ícones + labels |
| Large (`1200px+`) | **Navigation Drawer** (permanente) | Sidebar completa | Ícones + labels + seções |

```css
/* ===== NAVEGAÇÃO ADAPTATIVA ===== */

/* Bottom Navigation — compact */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 40;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0.75rem 0.5rem;
  min-height: 56px;
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 150ms ease;
}

.bottom-nav-item.active { color: var(--color-primary); }
.bottom-nav-item .icon { width: 24px; height: 24px; }

/* Navigation Rail — medium+ */
.nav-rail {
  display: none;   /* oculto em compact */
}

@media (min-width: 640px) {
  .bottom-nav { display: none; }   /* oculto em medium+ */

  .nav-rail {
    display: flex;
    flex-direction: column;
    width: 80px;                    /* colapsado */
    padding: 1rem 0.5rem;
    border-right: 1px solid var(--color-border);
    height: 100dvh;
    position: sticky;
    top: 0;
    gap: 0.5rem;
  }
}

/* Navigation Drawer — large+ */
@media (min-width: 1200px) {
  .nav-rail {
    width: 280px;                   /* expandido */
    padding: 1.5rem 1rem;
    align-items: flex-start;
  }

  .nav-rail .nav-label { display: block; }  /* mostra labels */
}
```

### 13.2 Header / Topbar

```css
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  /* Blur suave — visual moderno */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(var(--color-surface-rgb), 0.85);
}

.header-inner {
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 2rem);
  height: 64px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Menu hamburger — compact */
.menu-toggle { display: flex; }

@media (min-width: 768px) {
  .menu-toggle { display: none; }
  .nav-links   { display: flex; gap: 0.25rem; }
}
```

✅ **Regras para o agente:**
- Compact → Bottom Nav; Medium → Nav Rail; Large → Nav Drawer.
- Header: `position: sticky; top: 0` + backdrop-filter blur.
- Bottom Nav: sempre com `padding-bottom: env(safe-area-inset-bottom)`.
- Itens de nav: 3–5 máximo em bottom nav.

---

## 14. Cards, Listas e Tabelas

### 14.1 Card — comportamentos por breakpoint

```css
.card-list {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;               /* compact: stack vertical */
}

@media (min-width: 640px) {
  .card-list { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .card-list { grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
}

@media (min-width: 1280px) {
  .card-list { grid-template-columns: repeat(4, 1fr); }
}
```

### 14.2 Tabela responsiva — padrão "stack"

Tabelas são o maior desafio de responsividade. Não use `overflow-x: scroll`
como única solução — é péssimo UX. Use o padrão "stack em mobile":

```css
/* Tabela vira "cards" no mobile */
.responsive-table { width: 100%; border-collapse: collapse; }

/* Mobile: cada linha vira um card */
@media (max-width: 639px) {
  .responsive-table thead { display: none; }  /* esconde headers */

  .responsive-table tbody tr {
    display: block;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .responsive-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;
    border: none;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--text-body-sm);
  }

  .responsive-table td:last-child { border-bottom: none; }

  /* Mostra label antes do valor */
  .responsive-table td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: var(--text-caption);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 1rem;
    flex-shrink: 0;
  }
}

/* Desktop: tabela normal */
@media (min-width: 640px) {
  .responsive-table th, .responsive-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
  .responsive-table th {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-text-secondary);
  }
}
```

✅ **Regras para o agente:**
- Tabelas: padrão "stack" no mobile (não só scroll horizontal).
- Usar `data-label` no HTML para o conteúdo aparecer no mobile.
- Cards: grid `auto-fill` ou breakpoints explícitos conforme quantidade de itens.

---

## 15. Acessibilidade (WCAG 2.2)

### 15.1 Critérios essenciais

| Critério | Nível | Implementação |
|---|---|---|
| Contraste de cor | AA | ≥ 4.5:1 para texto, ≥ 3:1 para UI |
| Tamanho de texto | AA | Pode ser aumentado até 200% sem perda |
| Foco visível | AA | `:focus-visible` outline sempre visível |
| Touch target | AA (2.5.8) | ≥ 24×24px; idealmente 44×44px |
| Label de formulário | A | Todo input com `<label>` associado |
| Alt text de imagem | A | `alt` descritivo em imagens de conteúdo |
| Navegação por teclado | A | Tab order lógica; sem armadilhas |
| Skip link | A | "Pular para o conteúdo" no topo |
| Landmarks ARIA | A | `<main>`, `<nav>`, `<header>`, `<footer>` |
| Animação reduzida | AA | Respeitar `prefers-reduced-motion` |
| Idioma da página | A | `<html lang="pt-BR">` |
| Nome acessível de botão ícone | A | `aria-label` em botões sem texto |

### 15.2 HTML semântico base

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Título da Página — Nome do Site</title>
</head>
<body>

  <!-- Skip link — PRIMEIRO elemento no body -->
  <a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>

  <header role="banner">
    <nav aria-label="Navegação principal">
      <ul>
        <li><a href="/" aria-current="page">Início</a></li>
        <li><a href="/sobre">Sobre</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" tabindex="-1">
    <h1>Título principal — apenas UM h1 por página</h1>
    <!-- Hierarquia: h1 → h2 → h3, sem pular níveis -->
  </main>

  <footer role="contentinfo">
    <nav aria-label="Navegação do rodapé">...</nav>
  </footer>

</body>
</html>
```

```css
/* Skip link — visível apenas no foco (teclado) */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 600;
  border-radius: 0 0 0.5rem 0.5rem;
  z-index: 100;
  text-decoration: none;
  transition: top 150ms ease;
}
.skip-link:focus { top: 0; }
```

### 15.3 Botões com apenas ícone

```html
<!-- ❌ Errado -->
<button><svg>...</svg></button>

<!-- ✅ Correto -->
<button aria-label="Fechar modal">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- ✅ Alternativa com visually-hidden text -->
<button>
  <svg aria-hidden="true" focusable="false">...</svg>
  <span class="sr-only">Fechar modal</span>
</button>
```

```css
/* Visually hidden — oculto visualmente mas lido por screen readers */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

✅ **Regras para o agente:**
- Skip link é o PRIMEIRO elemento do body.
- `<html lang="pt-BR">` sempre.
- Um único `<h1>` por página. Hierarquia de h's sem pulos.
- `aria-label` em todo botão que contém apenas ícone.
- `aria-hidden="true"` em ícones decorativos.
- `aria-current="page"` no link ativo de navegação.

---

## 16. Performance de UI

### 16.1 Core Web Vitals — metas

| Métrica | Meta boa | Meta aceitável |
|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms |

### 16.2 Práticas de performance visual

```html
<!-- Fontes com preconnect e font-display: swap -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">

<!-- LCP image: preload + priority -->
<link rel="preload" as="image" href="hero.webp" fetchpriority="high">
```

```css
/* Evitar layout shift em fontes (FOUT) */
@font-face {
  font-family: 'Inter';
  src: url('inter.woff2') format('woff2');
  font-display: swap;    /* swap = mostra fallback até carregar */
  font-weight: 400 700;
}

/* CLS: reservar espaço para imagens antes de carregar */
img { aspect-ratio: attr(width) / attr(height); }

/* Animations que não causam reflow (use GPU) */
/* ✅ OK: transform, opacity, filter */
/* ❌ Causa reflow: width, height, top, left, margin, padding */

/* will-change apenas quando necessário */
.animating-element { will-change: transform; }
.animating-element.done { will-change: auto; }  /* limpar depois */

/* Contain — melhora perf em listas longas */
.list-item {
  contain: layout style;
}
```

✅ **Regras para o agente:**
- Fontes: `font-display: swap` e `preconnect`.
- Hero image: `loading="eager" fetchpriority="high"`.
- Imagens below fold: `loading="lazy"`.
- Sempre `width` e `height` em `<img>` para evitar CLS.
- Animações apenas com `transform` e `opacity`.
- Nunca `will-change: transform` em todos os elementos — use com moderação.

---

## 17. Checklist Final de Qualidade

Use este checklist antes de considerar qualquer UI pronta.

### Tipografia
- [ ] `font-size: 16px` no `html`; nenhum texto abaixo de `12px`
- [ ] Body text `max-width: 65ch`
- [ ] `line-height: 1.5+` no corpo; `1.1-1.25` em headlines
- [ ] `letter-spacing` negativo em displays grandes (≥ 32px)
- [ ] Input `font-size: 1rem` — evitar zoom iOS
- [ ] `font-display: swap` nas fontes web

### Responsividade
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` presente
- [ ] Mobile-first: estilos base = mobile; media queries adicionam
- [ ] Sem scroll horizontal em nenhum breakpoint
- [ ] Imagens com `max-width: 100%; height: auto`
- [ ] Tabelas responsivas (stack ou scroll consciente)
- [ ] `100dvh` em vez de `100vh`

### Touch & Interação
- [ ] Touch targets ≥ 48px (com `any-pointer: coarse`)
- [ ] `env(safe-area-inset-*)` em navbars fixas
- [ ] Hover effects apenas em `@media (hover: hover)`
- [ ] `-webkit-tap-highlight-color: transparent` em elementos customizados

### Animações
- [ ] `prefers-reduced-motion: reduce` desativa animações
- [ ] Animações com `transform` / `opacity` (não `height`/`width`)
- [ ] Durações razoáveis: micros 80-100ms; UI 150-300ms; max 500ms

### Acessibilidade
- [ ] `<html lang="pt-BR">` definido
- [ ] Um único `<h1>` por página; hierarquia sem pulos
- [ ] Skip link no topo do body
- [ ] Todo input com `<label>` associado
- [ ] `alt` em todas as imagens de conteúdo
- [ ] `aria-label` em botões ícone
- [ ] `:focus-visible` outline visível em TODOS os elementos interativos
- [ ] Contraste ≥ 4.5:1 em textos normais
- [ ] Landmarks: `<main>`, `<nav>`, `<header>`, `<footer>`

### Performance
- [ ] Hero image: `loading="eager" fetchpriority="high"`
- [ ] Imagens below fold: `loading="lazy"`
- [ ] `width` e `height` em todas as `<img>`
- [ ] `font-display: swap` nas fontes

### Dark Mode
- [ ] Tokens CSS (não hardcode de cores em componentes)
- [ ] `@media (prefers-color-scheme: dark)` com todos os tokens redefinidos
- [ ] Contraste checado em ambos os temas

---

## Apêndice A — CSS de Reset Completo

```css
/* ===== RESET PROFISSIONAL — cole no início de todo projeto ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

body {
  font-family: var(--font-body, system-ui, sans-serif);
  font-size: 1rem;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  min-height: 100dvh;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

img, video { height: auto; }

input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button { cursor: pointer; background: none; border: none; }

p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }

h1, h2, h3, h4, h5, h6 {
  line-height: 1.15;
  text-wrap: balance;    /* distribui palavras melhor em headlines */
}

p, li { text-wrap: pretty; }  /* evita widow (palavra sozinha na última linha) */

ul, ol { list-style: none; }

a { color: inherit; text-decoration: none; }
a:hover { text-decoration: underline; }

/* Remove outline padrão; usa focus-visible */
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--color-focus, #3b82f6);
  outline-offset: 2px;
}

/* Disabled states */
[disabled], [aria-disabled="true"] {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

/* Visually hidden */
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 1ms !important;
    animation-delay: -1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: -1ms !important;
  }
}
```

---

## Apêndice B — Tailwind Config Completo

```js
// tailwind.config.js — configuração profissional completa
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    screens: {
      'xs':  '480px',
      'sm':  '640px',   // Material: Medium
      'md':  '768px',
      'lg':  '1024px',  // Material: Expanded
      'xl':  '1280px',  // Material: Large
      '2xl': '1536px',  // Material: Extra-large
    },
    extend: {
      fontSize: {
        'micro':       ['0.6875rem', { lineHeight: '1.3',  letterSpacing: '0.02em',  fontWeight: '500' }],
        'overline':    ['0.75rem',   { lineHeight: '1.4',  letterSpacing: '0.06em',  fontWeight: '600' }],
        'caption':     ['0.8125rem', { lineHeight: '1.45', letterSpacing: '0.01em' }],
        'body-sm':     ['0.875rem',  { lineHeight: '1.5',  letterSpacing: '0.005em' }],
        'body-md':     ['1rem',      { lineHeight: '1.55' }],
        'body-lg':     ['1.125rem',  { lineHeight: '1.65' }],
        'heading-sm':  ['1.125rem',  { lineHeight: '1.35', fontWeight: '600' }],
        'heading-md':  ['1.25rem',   { lineHeight: '1.3',  fontWeight: '600' }],
        'heading-lg':  ['1.5rem',    { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'heading-xl':  ['1.875rem',  { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
        'display-sm':  ['2.25rem',   { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md':  ['2.75rem',   { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-lg':  ['3.5rem',    { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-xl':  ['4rem',      { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-2xl': ['5rem',      { lineHeight: '1.0',  letterSpacing: '-0.04em' }],
      },
      spacing: {
        '0.5':  '0.125rem',
        '1':    '0.25rem',
        '1.5':  '0.375rem',
        '2':    '0.5rem',
        '3':    '0.75rem',
        '4':    '1rem',
        '5':    '1.25rem',
        '6':    '1.5rem',
        '8':    '2rem',
        '10':   '2.5rem',
        '12':   '3rem',
        '16':   '4rem',
        '20':   '5rem',
        '24':   '6rem',
        '32':   '8rem',
      },
      maxWidth: {
        'prose': '65ch',
        'container': '1440px',
      },
      borderRadius: {
        'sm':  '0.25rem',   /* 4px */
        'md':  '0.5rem',    /* 8px */
        'lg':  '0.75rem',   /* 12px */
        'xl':  '1rem',      /* 16px */
        '2xl': '1.5rem',    /* 24px */
        '3xl': '2rem',      /* 32px */
      },
      transitionDuration: {
        'micro':    '80ms',
        'fast':     '150ms',
        'normal':   '250ms',
        'entrance': '300ms',
        'emphasis': '450ms',
      },
      transitionTimingFunction: {
        'standard':   'cubic-bezier(0.2, 0, 0, 1)',
        'decelerate': 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
        'spring':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in':        'fadeIn 250ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both',
        'fade-slide-up':  'fadeSlideUp 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both',
        'scale-in':       'scaleIn 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both',
        'slide-up':       'slideUp 450ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both',
        'shimmer':        'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeSlideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideUp:     { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        shimmer:     { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
```

---

> **Fim da Skill — UI/UX Design System v1.0**
>
> Fontes consultadas: Material Design 3 (m3.material.io, maio/2026),
> Apple Human Interface Guidelines (developer.apple.com, 2025),
> web.dev Responsive Web Design Basics, web.dev Accessible Tap Targets,
> web.dev prefers-reduced-motion.
>
> Use as caixas `✅ Regras para o agente` como instruções diretas de
> implementação ao orientar o agente fase a fase.