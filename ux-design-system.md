# TelaHub — UX Design System & Style Guide

> **Versão:** 2.0 — Off-White B2B Corporativo  
> **Data:** Junho 2026  
> **Autor:** UX Designer & Frontend Specialist  
> **Tipo:** Landing Page SaaS B2B — Digital Signage  

---

## 1. Filosofia de Design

### Princípio Central
> *"Cada pixel tem propósito. Restrição é luxo. A psicologia do usuário direciona as decisões."*

### Identidade Visual
- **Estilo:** Swiss Grade / Editorial Corporativo
- **Geometria:** Cantos vivos e nítidos (0–4px border-radius)
- **Modo:** Light Mode exclusivo — proibido dark mode, neon, glow, cyberpunk
- **Tipografia:** Satoshi (display/títulos) + Space Grotesk (corpo)
- **Personalidade:** Confiança, Profissionalismo, Eficiência, Tecnologia Madura

### Anti-Padrões Proibidos
| ❌ Proibido | Razão |
|-------------|-------|
| Fundo branco puro (#FFFFFF) no body | Causa fadiga visual e glare em monitores IPS |
| Dark mode / Neon glow | Não condiz com público B2B tradicional |
| Efeitos glassmorphism | Clichê de IA, reduz legibilidade |
| Mesh/Aurora gradients | Poluição visual sem propósito funcional |
| Roxo/Violeta como cor primária | Clichê de IA #1 — Purple Ban ativo |
| Border-radius entre 4–8px | "Zona morta" genérica — escolher extremos |

---

## 2. Paleta de Cores

### 2.1 Sistema de Fundos (Off-White Layered)

A estratégia de fundos usa uma escala de cinzas quentes progressivos para criar **hierarquia visual por camadas** sem branco puro, que causa desconforto em sessões prolongadas.

| Token CSS | Hex | Uso | WCAG CR vs #111827 |
|-----------|-----|-----|---------------------|
| `--bg-primary` | `#FAFAFA` | Fundo base do body | 15.0:1 ✅ AAA |
| `--bg-secondary` | `#F3F4F6` | Seções alternadas (zebra) | 14.4:1 ✅ AAA |
| `--bg-tertiary` | `#E5E7EB` | Superfícies inset, tooltips | 12.8:1 ✅ AAA |
| `--bg-card` | `#FFFFFF` | Cards e modais (branco puro para "pop") | 15.4:1 ✅ AAA |
| `--bg-card-hover` | `#F9FAFB` | Hover state de cards | 14.8:1 ✅ AAA |

#### Por que Off-White (#FAFAFA) em vez de Branco Puro (#FFFFFF)?

| Critério | #FFFFFF | #FAFAFA |
|----------|---------|---------|
| Fadiga visual em telas IPS | Alta (emite mais luz azul) | Reduzida (menor luminância) |
| Contraste texto (#111827) | 15.4:1 | 15.0:1 |
| Diferença perceptual | Nula em ambient lighting | Sutil, confortável |
| Cards se destacam? | Não (tudo é igual) | Sim (#FFFFFF "flutua" sobre #FAFAFA) |
| Referência de mercado | Linear, Notion, Stripe 2024+ | Apple, Vercel, Figma 2025+ |

### 2.2 Cor de Ação / Destaque

| Token CSS | Hex | Uso | WCAG CR vs branco |
|-----------|-----|-----|---------------------|
| `--cyan` (Azul Corporativo) | `#2563EB` | CTAs primários, links, badges ativos | 4.6:1 ✅ AA |
| `--cyan-dim` | `rgba(37,99,235,0.05)` | Backgrounds sutis de ícones/badges | — |
| Hover (manual) | `#1D4ED8` | Hover em botões primários | 5.5:1 ✅ AA |

### 2.3 Cores de Status

| Token CSS | Hex | Uso | Significado |
|-----------|-----|-----|-------------|
| `--emerald` | `#10B981` | Online, sucesso, ativo | Tela conectada / Operação OK |
| `--emerald-dim` | `rgba(16,185,129,0.08)` | Background de badges de sucesso | — |
| `--slate` | `#64748B` | Offline, inativo | Tela desconectada |
| `--slate-dim` | `rgba(100,116,139,0.08)` | Background de badges offline | — |
| Alerta (inline) | `#FBBF24` | Estrelas de avaliação / ratings | Âmbar quente |

### 2.4 Tipografia de Cores

| Token CSS | Hex | Uso | WCAG CR vs #FAFAFA |
|-----------|-----|-----|---------------------|
| `--text-primary` | `#111827` | Títulos, headings, texto principal | 15.0:1 ✅ AAA |
| `--text-secondary` | `#4B5563` | Parágrafos, subtextos | 7.3:1 ✅ AA |
| `--text-muted` | `#9CA3AF` | Labels, metadados, timestamps | 3.4:1 ⚠️ (apenas decorativo) |

### 2.5 Bordas

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--border` | `#E5E7EB` | Separadores, bordas de cards, divisores |
| `--border-active` | `#2563EB` | Borda em foco, seleção ativa |

---

## 3. Tipografia

### 3.1 Font Stack

```css
--font:       'Satoshi', 'Space Grotesk', system-ui, -apple-system, sans-serif;
--font-title: 'Satoshi', 'Space Grotesk', system-ui, sans-serif;
```

- **Satoshi**: Display typeface moderna, geométrica, boa legibilidade em grandes tamanhos
- **Space Grotesk**: Corpo técnico, monoespacial-adjacente, ideal para dados e métricas

### 3.2 Escala Tipográfica (Clamp Responsivo)

| Elemento | CSS `font-size` | `font-weight` | `line-height` | Uso |
|----------|-----------------|---------------|----------------|-----|
| `h1` | `clamp(2.2rem, 3.8vw, 3.4rem)` | 800 | 1.15 | Hero headline única |
| `h2` | `clamp(1.7rem, 2.8vw, 2.2rem)` | 750 | 1.15 | Títulos de seção |
| `h3` | `clamp(1.1rem, 1.8vw, 1.35rem)` | 650 | 1.15 | Subtítulos de card/tab |
| `h4` | `1.0rem` | 600 | 1.15 | Labels de card |
| Body | `0.9–1rem` | 400 | 1.6–1.7 | Parágrafos |
| Small | `0.78–0.85rem` | 400–600 | 1.5 | Metadados, badges |
| Micro | `0.65–0.72rem` | 600–700 | 1.4 | Labels técnicos |

### 3.3 Regras de Legibilidade

- **Largura máxima de leitura**: 45–75 caracteres (480–600px de `max-width`)
- **Letter-spacing de headings**: `-0.025em` (compacto, moderno)
- **Letter-spacing de labels**: `0.1–0.12em` (UPPERCASE espaçado)
- **Smooth rendering**: `-webkit-font-smoothing: antialiased`

---

## 4. Grade e Espaçamento

### 4.1 Sistema de 8pt Grid

```
4px   — Micro (half-step)
8px   — Small
12px  — Small+
16px  — Medium
20px  — Medium+
24px  — Large
32px  — XL
40px  — XXL
48px  — Section inner
64px  — Section gap
80px  — Section padding
```

### 4.2 Container

```css
.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
}
```

### 4.3 Breakpoints Responsivos (Mobile-First)

| Breakpoint | Comportamento |
|------------|---------------|
| `< 600px` | Stacking total, botões full-width, headings menores |
| `< 768px` | Mobile dock ativado, cards em coluna |
| `< 900px` | Grids colapsam para 1 coluna, bento swiper horizontal |
| `> 900px` | Layout desktop completo, grids de 2–3 colunas |

---

## 5. Geometria (Border Radius)

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--radius-sm` | `0px` | Inputs, botões, badges — estilo suíço nítido |
| `--radius-md` | `2px` | Cards pequenos, tags |
| `--radius-lg` | `2px` | Cards grandes, tab panels |
| `--radius-xl` | `4px` | Molduras de TV bezel (acabamento premium) |
| Labels (exception) | `99px` | Pill shape para badges de seção |

---

## 6. Sombras e Elevação

### Hierarquia de Profundidade

| Nível | Sombra CSS | Uso |
|-------|-----------|-----|
| Flat (0) | `none` | Elementos base |
| Sutil (1) | `0 2px 8px rgba(0,0,0,0.04)` | Botões primários em repouso |
| Card (2) | `0 8px 24px rgba(0,0,0,0.05)` | Floating badges |
| Elevado (3) | `0 12px 32px rgba(0,0,0,0.03)` | Cards em hover |
| Modal (4) | `0 20px 48px rgba(0,0,0,0.08)` | Modais de lead |
| TV Bezel (5) | Multicamada (12px, 4px, inset) | Molduras físicas de TV |

---

## 7. Componentes Visuais

### 7.1 Simulação de TV (Bezel System)

A simulação física de duas TVs lado a lado (16:9 e 9:16) comunica a flexibilidade do produto de forma imediata e visceral.

```
┌──────────────────────────────┐  ┌──────────────┐
│ ┌──────────────────────────┐ │  │ ┌──────────┐ │
│ │                          │ │  │ │          │ │
│ │  TELA HORIZONTAL 16:9    │ │  │ │ VERTICAL │ │
│ │  (Recepção / Cardápio)   │ │  │ │  9:16    │ │
│ │                          │ │  │ │          │ │
│ └──────────────────────────┘ │  │ │          │ │
│            🟢                │  │ │          │ │
└──────────────────────────────┘  │ └──────────┘ │
                                  │      🟢      │
                                  └──────────────┘
```

| Elemento | Estilo |
|----------|--------|
| Moldura (bezel) | Gradient carvão escuro `#1F2937 → #111827` |
| Borda da moldura | `1px solid #374151` |
| Padding da moldura | `6px 6px 14px 6px` (base mais espessa) |
| LED de energia | `#10B981` com glow sutil (5px, border-radius 50%) |
| Tela interior | `aspect-ratio: 16/9` ou `9/16` com `background-size: cover` |
| Badge de proporção | Semi-transparente escuro, `9px`, uppercase |

### 7.2 Botões

| Tipo | Background | Cor | Borda | Hover |
|------|-----------|-----|-------|-------|
| Primary | `#2563EB` | `#FFFFFF` | none | `#1D4ED8` + translateY(-1px) |
| Ghost | transparent | `--text-secondary` | `1px solid --border` | `#F3F4F6` background |
| Plan Featured | `#2563EB` | `#FFFFFF` | none | `#1D4ED8` |
| Plan Outline | transparent | `--text-secondary` | `1px solid --border` | `#F3F4F6` |

### 7.3 Cards

| Tipo | Background | Borda | Hover |
|------|-----------|-------|-------|
| Padrão | `#FFFFFF` (--bg-card) | `1px solid #E5E7EB` | border-color → `--border-active`, translateY(-2px) |
| Destaque (Featured) | `rgba(37,99,235,0.02)` | `1px solid #2563EB` | box-shadow amplificado |
| Testimunho | `#FFFFFF` | `1px solid #E5E7EB` | — |

---

## 8. Animações e Micro-Interações

### 8.1 Transições Base

```css
--transition: 0.2s cubic-bezier(0.16, 1, 0.3, 1);
```

- **Ease-out spring**: Desaceleração natural, sensação de resposta física
- **GPU-only**: Animamos apenas `transform` e `opacity`

### 8.2 Padrões de Animação

| Elemento | Animação | Duração |
|----------|----------|---------|
| Botões hover | `translateY(-1px)` + shadow | 0.2s |
| Cards hover | `translateY(-2px)` a `-4px` + shadow | 0.2s |
| TV bezels hover | `translateY(-3px)` + shadow amplificada | 0.2s |
| Modal entrada | `scale(0.95) → 1` + `opacity: 0 → 1` | 0.4s spring |
| Mobile dock | `translateY(50px) → 0` | 0.7s spring |
| Float badge | `translateY(0) → (-8px)` loop | 4s ease-in-out infinite |
| Active press | `scale(0.98)` | 0.08s spring |

### 8.3 Redução de Movimento (WCAG)

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 9. Grid de Padrão Sutil (Body Background)

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: 
    radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
  opacity: 1;
}
```

Este grid de pontos ultrassutil adiciona textura tátil ao fundo sem competir com o conteúdo, reforçando a estética de "blueprint técnico" que transmite engenharia e precisão.

---

## 10. Checklist de Acessibilidade (WCAG 2.1 AA)

| Critério | Status | Implementação |
|----------|--------|---------------|
| Contraste de texto primário | ✅ AAA (15:1) | `#111827` sobre `#FAFAFA` |
| Contraste de texto secundário | ✅ AA (7.3:1) | `#4B5563` sobre `#FAFAFA` |
| Contraste de CTA | ✅ AA (4.6:1) | Branco sobre `#2563EB` |
| Touch targets mínimos | ✅ 44×44px | Botões mobile com `min-height: 44px` |
| Navegação por teclado | ✅ | `role="tab"`, `aria-selected`, `tabindex` |
| Redução de movimento | ✅ | `prefers-reduced-motion` implementado |
| Landmarks semânticos | ✅ | `<section>`, `<nav>`, `<footer>`, `aria-labelledby` |
| Alt text em imagens | ✅ | `role="img"` + `aria-label` em simulações de TV |

---

## 11. Mapeamento de Ativos de Imagem

| Nome do Arquivo | Proporção Original | Uso no Projeto |
|-----------------|-------------------|----------------|
| `recepcao_boas_vindas.png` | Landscape | TV 16:9 em Condomínios e Corporativo |
| `aviso_condominio.png` | Portrait | TV 9:16 em todas as abas |
| `cardapio_digital.png` | Landscape | TV 16:9 em Varejo & Alimentação |
| `painel_rh.png` | Landscape | TV 16:9 em Endomarketing & RH |
| `dashboard-hero.png` | Landscape | Mockup do hero (dashboard) |

---

## 12. Resumo da Regra 60-30-10

```
60% → #FAFAFA (Off-White base — calma, profissional)
30% → #FFFFFF / #F3F4F6 (Cards e seções alternadas — hierarquia)
10% → #2563EB (Azul Corporativo — ação, destaque, CTAs)
```

---

*Documento de referência para equipes de design, desenvolvimento e QA do TelaHub.*
