# 🎨 TELAHUB — Design System & Brand Guidelines

> **Contexto:** Este documento contém todas as cores, tipografia, espaçamentos, bordas, sombras e padrões visuais usados na plataforma **TelaHub** (SaaS de Sinalização Digital). Use-o como referência absoluta para manter consistência visual em qualquer página, landing page ou material relacionado.

---

## 1. 🎯 Identidade Visual

| Atributo         | Valor                                                    |
|------------------|----------------------------------------------------------|
| **Nome**         | TelaHub                                                  |
| **Estilo**       | B2B SaaS Premium Corporativo — Dark Mode                 |
| **Geometria**    | Suavizada (cantos amplamente arredondados)                |
| **Mood**         | Confiança, Sofisticação, Tecnologia, Controle             |
| **Modo**         | Dark Mode Only (não há Light Mode)                       |

---

## 2. 🎨 Paleta de Cores

### Cores Primárias (Brand)

| Token                  | Hex         | HSL                        | Tailwind CSS v4         | Uso                                            |
|------------------------|-------------|----------------------------|-------------------------|-------------------------------------------------|
| **Deep Navy (Fundo)**  | `#111827`   | `222.2° 47.4% 11.2%`      | `bg-gray-900`           | Background principal do sistema inteiro          |
| **Slate Surface**      | `#1f2937`   | `215.4° 25% 17.1%`        | `bg-gray-800`           | Cards, sidebar, modais, superfícies elevadas     |
| **Sky Blue (Accent)**  | `#0ea5e9`   | `198.6° 92.8% 48.4%`      | `bg-sky-500`            | Botões primários, links ativos, ícones de ação   |
| **Sky Blue Hover**     | `#0284c7`   | `198.6° 93.2% 39.4%`      | `bg-sky-600`            | Hover de botões primários                        |
| **Sky Blue Soft**      | `#38bdf8`   | `198° 93.2% 59.6%`        | `text-sky-400`          | Textos de destaque, badges ativas, labels        |

### Cores de Texto

| Token                  | Hex         | Tailwind CSS v4            | Uso                                            |
|------------------------|-------------|----------------------------|-------------------------------------------------|
| **Texto Principal**    | `#ffffff`   | `text-white`               | Títulos, headings, textos de alta hierarquia      |
| **Texto Secundário**   | `#94a3b8`   | `text-slate-400`           | Subtítulos, metadados, labels, placeholders       |
| **Texto Terciário**    | `#64748b`   | `text-slate-500`           | Textos de apoio, dicas, legendas                  |
| **Texto Muted**        | `#475569`   | `text-slate-600`           | Separadores textuais, notas de rodapé             |

### Cores de Estado/Feedback

| Token                  | Hex         | Tailwind CSS v4            | Uso                                            |
|------------------------|-------------|----------------------------|-------------------------------------------------|
| **Sucesso (Online)**   | `#10b981`   | `text-emerald-500`         | Status online, confirmações, badges verdes        |
| **Erro/Perigo**        | `#f43f5e`   | `text-rose-500`            | Erros de formulário, alertas críticos             |
| **Erro Background**    | —           | `bg-rose-500/10`           | Fundo de alertas de erro                          |
| **Erro Borda**         | —           | `border-rose-500/20`       | Borda de alertas de erro                          |
| **Warning/Offline**    | `#f97316`   | `text-orange-500`          | ⚠️ USO RESTRITO: somente para status offline e avisos críticos |
| **Amber (Info leve)**  | `#f59e0b`   | `text-amber-500`           | Badges de informação, estados pendentes           |

### Cores de Borda

| Token                  | Tailwind CSS v4            | Uso                                            |
|------------------------|----------------------------|-------------------------------------------------|
| **Borda Padrão**       | `border-slate-700`         | Bordas de inputs, cards e separadores            |
| **Borda Sutil**        | `border-slate-700/50`      | Bordas de cards elevados (login, modais)          |
| **Borda Hover**        | `border-sky-500/50`        | Hover em cards flutuantes                         |
| **Borda Ativa/Focus**  | `border-sky-500`           | Focus de inputs                                   |
| **Borda Ultra-sutil**  | `border-white/10`          | Cards com glassmorphism                           |
| **Borda Dashed**       | `border-dashed border-slate-800` | Áreas vazias, drop zones                    |

---

## 3. ✏️ Tipografia

### Fontes Carregadas (Google Fonts)

```
Geist (100-900) — Fonte principal do sistema
Geist Mono (100-900) — Código e dados monoespaçados
Inter (300-700) — Fallback sans-serif / widgets de texto
Outfit (300-700) — Fallback secundário
Space Grotesk (300-700) — Títulos alternativos / branding
JetBrains Mono (400-700) — Código / terminais
Orbitron (400-900) — Display digital / relógios
Rajdhani (300-700) — Widgets de contagem / cronômetros
Manrope (300-700) — Labels técnicos
Share Tech Mono (400) — Monospace alternativo / dados
Syncopate (400-700) — Headlines impactantes
```

### Stack de Fontes (CSS)

```css
/* Sistema Principal */
--font-sans: 'Geist', 'Outfit', 'Inter', sans-serif;

/* Código / Mono */
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
```

### Escala Tipográfica

| Elemento               | Tamanho             | Peso              | Classe Tailwind                          |
|------------------------|---------------------|--------------------|------------------------------------------|
| **Título Principal**   | 24px - 30px         | 800 (Extra Bold)   | `text-2xl font-extrabold`               |
| **Título Seção**       | 18px - 20px         | 700 (Bold)         | `text-lg font-bold`                     |
| **Subtítulo**          | 14px - 16px         | 600 (Semibold)     | `text-sm font-semibold`                 |
| **Corpo**              | 13px - 14px         | 400 (Regular)      | `text-sm font-normal`                   |
| **Label/Meta**         | 11px - 12px         | 500 - 600          | `text-xs font-medium`                   |
| **Micro Text**         | 9px - 10px          | 700 (Bold)         | `text-[9px] font-bold`                  |
| **Badge/Tag**          | 10px                | 600 (Semibold)     | `text-[10px] font-semibold uppercase tracking-widest` |

---

## 4. 📐 Espaçamento & Layout

### Sistema de Grid

| Propriedade            | Valor                                                   |
|------------------------|---------------------------------------------------------|
| **Base Unit**          | 4px (múltiplos de 4)                                     |
| **Padding Cards**      | 16px - 24px (`p-4` a `p-6`)                             |
| **Gap entre Items**    | 8px - 16px (`gap-2` a `gap-4`)                           |
| **Margin Seções**      | 24px - 32px (`mb-6` a `mb-8`)                            |
| **Sidebar Width**      | 280px - 320px (`w-72` a `w-80`)                          |

### Border Radius (Arredondamento)

| Elemento               | Raio                | Classe Tailwind    |
|------------------------|---------------------|--------------------|
| **Modais/Diálogos**    | 16px - 24px         | `rounded-2xl` / `rounded-3xl` |
| **Cards Principais**   | 12px - 16px         | `rounded-xl` / `rounded-2xl`  |
| **Sub-containers**     | 12px                | `rounded-xl`                   |
| **Inputs/Botões**      | 8px                 | `rounded-lg`                   |
| **Badges/Tags**        | 6px - 9999px        | `rounded-md` / `rounded-full`  |
| **Base do Sistema**    | 8px                 | `--radius: 8px`                |

---

## 5. 🌟 Sombras & Efeitos

### Sombras

| Elemento               | Classe / CSS                                                   |
|------------------------|----------------------------------------------------------------|
| **Cards Elevados**     | `shadow-2xl`                                                   |
| **Botão Primário**     | `shadow-md` → hover: `shadow-[0_0_20px_rgba(56,189,248,0.4)]` |
| **Glow Neon Azul**     | `box-shadow: 0 0 25px rgba(14, 165, 233, 0.35)`               |
| **Sombra Sutil**       | `shadow-lg`                                                    |
| **Cards Login (Glass)**| `shadow-2xl` + `backdrop-blur-md`                              |

### Glassmorphism (usado nos cards flutuantes do Login)

```css
background: rgba(31, 41, 55, 0.4);    /* bg-gray-800/40 */
border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
backdrop-filter: blur(12px);           /* backdrop-blur-md */
box-shadow: 0 25px 50px rgba(0,0,0,0.25); /* shadow-2xl */
border-radius: 12px;                   /* rounded-xl */
```

---

## 6. 🎬 Animações & Transições

### Transições Padrão

```css
/* Transição base para todos os elementos interativos */
transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

/* Transição suave para cores */
transition: all 0.3s ease-out;

/* Active/Click feedback */
active:scale-[0.98]
```

### Efeitos de Hover

| Elemento               | Efeito                                                         |
|------------------------|----------------------------------------------------------------|
| **Botão Primário**     | `hover:bg-sky-600` + neon glow `shadow-[0_0_20px_rgba(56,189,248,0.4)]` |
| **Cards**              | `hover:border-sky-500/50` + `hover:shadow-sky-500/5`          |
| **Links/Textos**       | `hover:text-sky-400`                                           |
| **Cards com Elevação** | `hover:drop-shadow-xl` + borda iluminada com azul              |
| **Botão Secundário**   | `hover:border-white` + `hover:bg-slate-400/8`                 |

### Animações Personalizadas (Framer Motion)

| Animação              | Uso                         | Configuração                              |
|-----------------------|-----------------------------|-------------------------------------------|
| **Flutuação**         | Cards de login              | `y: [0, -8, 0]` / duration 4-6s / repeat |
| **Fade-in + Slide**   | Modais e alertas            | `animate-in fade-in slide-in-from-top-2`  |
| **Zoom-in**           | Abertura de modais          | `animate-in zoom-in-95 duration-200`      |
| **Pulse**             | Indicadores de status online| `animate-ping` (emerald dot)              |
| **Gradient Flow**     | Backgrounds animados        | `gradient-x 6s ease infinite`             |
| **Pulse Glow**        | Brilho sutil em elementos   | `pulse-glow 2s ease-in-out infinite`      |

---

## 7. 🧩 Padrões de Componentes

### Botão Primário

```html
<button class="
  w-full bg-sky-500 hover:bg-sky-600 
  text-white font-black py-6 rounded-lg 
  shadow-md hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] 
  transition-all duration-300 ease-out 
  active:scale-[0.98] 
  border border-white/10 
  uppercase text-xs tracking-wider
">
  ACESSAR SISTEMA
</button>
```

### Input de Formulário

```html
<input class="
  w-full h-11 rounded-lg 
  bg-gray-900/60 
  border border-slate-700 
  text-white placeholder:text-slate-500
  focus:border-sky-500 focus:ring-1 focus:ring-sky-500 
  transition-all duration-300 ease-out
  pl-10 pr-4
" />
```

### Card Padrão

```html
<div class="
  bg-gray-800/50 
  border border-slate-700/50 
  shadow-2xl 
  p-6 rounded-2xl 
  transition-all duration-300 ease-out 
  hover:border-sky-500/30
">
  <!-- Conteúdo -->
</div>
```

### Badge de Status

```html
<!-- Online -->
<span class="text-[10px] font-semibold text-sky-400 uppercase tracking-widest bg-sky-500/10 px-3.5 py-1.5 border border-sky-500/20 rounded-full">
  ● Online
</span>

<!-- Erro -->
<div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center">
  Mensagem de erro
</div>
```

### Modal/Diálogo

```html
<!-- Overlay -->
<div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
  <!-- Container -->
  <div class="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-white flex items-center gap-2">
        Título do Modal
      </h3>
      <button class="text-slate-500 hover:text-white transition-colors">✕</button>
    </div>
    <!-- Conteúdo -->
  </div>
</div>
```

---

## 8. 📏 CSS Variables (Copiar para o projeto)

```css
:root {
  /* Fundos */
  --background: 222.2 47.4% 11.2%;     /* #111827 Deep Navy */
  --foreground: 210 40% 98%;            /* #f8fafc Branco suave */
  --card: 215.4 25% 17.1%;              /* #1f2937 Slate surface */
  --card-foreground: 210 40% 98%;
  
  /* Accent / Primary */
  --primary: 198.6 92.8% 48.4%;         /* #0ea5e9 Sky Blue */
  --primary-foreground: 222.2 47.4% 11.2%;
  --accent: 198.6 92.8% 48.4%;          /* #0ea5e9 Sky Blue */
  --accent-foreground: 210 40% 98%;
  --ring: 198.6 92.8% 48.4%;            /* #0ea5e9 Sky Blue */
  
  /* Secondary / Muted */
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;  /* #94a3b8 Slate 400 */
  
  /* Destrutivo */
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  /* Bordas e inputs */
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  
  /* Radius base */
  --radius: 8px;
  
  /* Brand Shortcuts */
  --brand-bg: #111827;
  --brand-surface: #1f2937;
  --brand-accent: #0ea5e9;
  --brand-text-high: #ffffff;
  --brand-text-sec: #94a3b8;
}
```

---

## 9. 🔗 Google Fonts — Import Direto

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

Ou via CSS:
```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
```

---

## 10. ⚠️ Regras Obrigatórias

1. **🚫 Laranja é RESTRITO** — Use laranja (`orange-500`) **exclusivamente** para status offline e avisos críticos. Nunca como cor de destaque ou botão.
2. **🚫 Sem Light Mode** — Todo o sistema opera em Dark Mode. Nunca use fundos brancos ou claros.
3. **✅ Sky Blue é a cor de ação** — Todo elemento clicável, ativo ou de destaque deve usar `sky-500` / `sky-400`.
4. **✅ Cantos arredondados** — Cards maiores usam `rounded-2xl`+, inputs usam `rounded-lg`. Nunca use cantos retos (`rounded-none`).
5. **✅ Transições em tudo** — Todo elemento interativo deve ter `transition-all duration-300 ease-out` no mínimo.
6. **✅ Hierarquia de texto** — Títulos em `text-white`, secundários em `text-slate-400`, terciários em `text-slate-500`.
7. **✅ Feedback visual** — Botões devem ter hover com glow azul e `active:scale-[0.98]`.

---

> **📋 Instruções para outra IA:** Aplique este Design System em todas as páginas e componentes. Mantenha a paleta **Deep Navy + Sky Blue**, geometria suavizada, e os padrões de tipografia e espaçamento definidos acima. A identidade visual deve ser consistente em 100% com o sistema TelaHub.
