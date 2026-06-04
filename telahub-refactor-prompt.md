# Prompt — Refatoração Visual do TelaHub Dashboard

Refatore o dashboard principal do TelaHub (`/`) seguindo **exatamente** as especificações abaixo. Não altere nenhuma lógica, hook, contexto ou chamada de API — apenas a camada visual (JSX + classes Tailwind + estilos inline quando necessário).

---

## 1. Ordem dos elementos na página

A ordem vertical dos blocos deve ser:

1. `<Header>` — logo, botões de ação
2. `<Nav>` — barra de módulos
3. `<SectionHeader>` — título "Suas Telas" + chips de filtro
4. `<DisplayGrid>` — grid de cards das telas ← **sobe para cima**
5. `<StatsRow>` — 4 métricas compactas ← **desce para baixo**

---

## 2. Fundo global (body / layout raiz)

Aplique no elemento raiz do layout (ou no `body` via `globals.css`):

```css
background: radial-gradient(ellipse 120% 60% at 50% -10%, #091338 0%, #04081c 40%, #010208 100%) fixed;
background-color: #010208;
```

Adicione dois pseudo-elementos para profundidade:

```css
/* grade de linhas finas */
::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* grain de ruído */
::after {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

Todo conteúdo deve ter `position: relative; z-index: 1` para ficar acima dos pseudo-elementos.

---

## 3. Tokens de design (adicione ao CSS global ou como variáveis Tailwind)

```css
:root {
  --card:        rgba(8, 13, 32, 0.78);
  --border:      rgba(255, 255, 255, 0.065);
  --border-hover:rgba(14, 165, 233, 0.28);
  --accent:      #0ea5e9;
  --accent2:     #2563eb;
  --accent-dim:  rgba(14, 165, 233, 0.12);
  --txt:         #eaf2ff;
  --txt2:        rgba(185, 210, 245, 0.6);
  --txt3:        rgba(155, 185, 225, 0.35);
  --scanline:    rgba(255, 255, 255, 0.012);
}
```

---

## 4. Tipografia

Adicione via `next/font/google` ou `<link>` no `_document`:

```
Exo 2 — pesos 400, 500, 600, 700, 800 → UI geral
JetBrains Mono — pesos 400, 500 → IDs e dados técnicos (ex: "ID: DEMO")
```

Aplique `font-family: 'Exo 2'` no `body`. Use `font-family: 'JetBrains Mono'` apenas nos elementos de ID dos cards.

---

## 5. Header

```
- background: var(--card) + backdrop-filter: blur(20px) saturate(160%)
- border: 1px solid var(--border)
- border-radius: 18px
- padding: 13px 20px
- margin-bottom: 12px
```

**Logo:**
- Grid 2×2 de quadradinhos (36×36px, gap 3px)
  - Célula 1: `#0ea5e9` (accent)
  - Célula 2 e 3: `rgba(14,165,233,0.35)`
  - Célula 4: `#2563eb`
- Nome: `TELA` normal + `HUB` em `color: #0ea5e9`, font-weight 800
- Subtítulo: "Bem-vindo, admin" em `var(--txt3)`, 10.5px, letter-spacing 0.06em

**Botões de ação (direita):**

| Botão | Estilo |
|---|---|
| Vincular TV | Ghost: `bg rgba(255,255,255,0.04)` + border `var(--border)` + cor `var(--txt2)` |
| + Nova Tela | Primary: `background: linear-gradient(135deg, #0ea5e9, #2563eb)` + `box-shadow: 0 2px 12px rgba(14,165,233,0.25)` |
| Ícone Refresh | `34×34px`, ghost igual ao Vincular TV |
| Ícone Sair | Idem |

Hover do Primary: `filter: brightness(1.12)` + `box-shadow: 0 4px 20px rgba(14,165,233,0.4)` + `transform: translateY(-1px)`

---

## 6. Nav (barra de módulos)

```
- background: var(--card) + backdrop-filter: blur(20px) saturate(160%)
- border: 1px solid var(--border)
- border-radius: 14px
- height: 46px
- padding: 5px 16px
- margin-bottom: 16px
```

Label "MÓDULOS": `font-size: 9.5px`, uppercase, letter-spacing 0.12em, `var(--txt3)`, separado por `border-right: 1px solid var(--border)`.

Cada item de nav:
- `font-size: 11.5px`, uppercase, letter-spacing 0.04em, font-weight 600
- Hover: `background rgba(255,255,255,0.05)` + `color var(--txt2)`
- **Ativo**: `background var(--accent-dim)` + `color var(--accent)` + `border: 1px solid rgba(14,165,233,0.22)` + ponto de 6px na cor accent à esquerda

---

## 7. SectionHeader ("Suas Telas")

Posicionado **antes** do grid de cards, logo após a nav:

```
- display: flex, justify-content: space-between, align-items: center
- margin-bottom: 12px
```

Título:
- Ícone em caixa `26×26px`: `background var(--accent-dim)` + `border: 1px solid rgba(14,165,233,0.22)` + `border-radius: 6px`
- Texto: 15px, font-weight 700

**Chips de filtro** (Todos / Online / Offline / 16:9 / 9:16):
- `padding: 4px 12px`, border-radius 20px, font-size 10.5px, uppercase, font-weight 600
- Default: `border: 1px solid var(--border)`, `color: var(--txt3)`
- Ativo: `border-color: rgba(14,165,233,0.35)` + `background: var(--accent-dim)` + `color: var(--accent)`

---

## 8. DisplayGrid — grid de cards

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
gap: 12px;
```

> **Importante:** NÃO use colunas fixas como `grid-cols-3` ou `grid-cols-4`. O `auto-fill + minmax` cuida da responsividade automaticamente sem nenhum breakpoint.

---

## 9. DisplayCard

### Estrutura do card

```
<div class="card">
  <div class="preview">        ← área de capa (118px altura)
    <div class="prev-bg"/>     ← gradiente de fundo colorido
    <div class="prev-scan"/>   ← efeito scanlines
    <StatusBadge/>             ← "OFFLINE" ou "ONLINE"
    <MenuButton/>              ← ⋮ visível só no hover
    <MonitorMock/>             ← mock do monitor/tv
  </div>
  <div class="card-body">      ← área de conteúdo
    <TitleRow/>                ← nome + badge de proporção
    <IDText/>                  ← ID em JetBrains Mono
    <Actions/>                 ← botões
  </div>
</div>
```

### Estilos do card

```css
background: rgba(8, 13, 32, 0.78);
border: 1px solid rgba(255, 255, 255, 0.065);
backdrop-filter: blur(14px) saturate(140%);
border-radius: 14px;
overflow: hidden;
```

**Hover:**
```css
transform: translateY(-6px);
border-color: rgba(14, 165, 233, 0.28);
box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.1);
transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
```

> O `cubic-bezier(0.34, 1.56, 0.64, 1)` cria o efeito de mola (spring). Se usar Framer Motion: `whileHover={{ y: -6 }}` com `transition={{ type: "spring", stiffness: 300, damping: 18 }}`.

**Animação de entrada (stagger):**
```css
animation: fadeUp 0.45s ease both;
/* card:nth-child(n) { animation-delay: n * 55ms } */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Preview (área de capa, 118px)

Fundo por card — aplique via índice ou prop de cor:
```
card 1 (azul):   linear-gradient(155deg, #071435, #030b1e)
card 2 (verde):  linear-gradient(155deg, #061412, #030e0b)
card 3 (vermelho): linear-gradient(155deg, #160606, #0d0303)
card 4 (roxo):   linear-gradient(155deg, #100614, #08030b)
```

Cada fundo tem um glow radial no rodapé via `::after`:
```css
background: radial-gradient(circle at 50% 100%, rgba(VAR_COR, 0.13), transparent 70%);
```
Onde `VAR_COR` é: azul `14,165,233` / verde `34,197,94` / vermelho `239,68,68` / roxo `168,85,247`.

Scanlines (sobrepostos ao fundo):
```css
background: repeating-linear-gradient(
  0deg, transparent, transparent 3px,
  rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px
);
```

### Status badge

```
OFFLINE: background rgba(239,68,68,0.14) + border rgba(239,68,68,0.28) + color #fc8585
ONLINE:  background rgba(34,197,94,0.14) + border rgba(34,197,94,0.28) + color #4ade80
```
- `font-size: 8.5px`, uppercase, font-weight 800, letter-spacing 0.09em
- Ponto de 5px: ONLINE tem animação de `pulse` (escala + opacidade)
- Posição: `top: 9px, left: 9px`, z-index 3

### Botão de menu (⋮)

- `26×26px`, `border-radius: 6px`
- `background: rgba(6,10,24,0.72)` + `border: 1px solid var(--border)`
- `opacity: 0` → `opacity: 1` no hover do card
- Posição: `top: 8px, right: 8px`

### Monitor mock (dentro do preview)

Dimensões: `96×62px`

```css
/* frame externo */
border: 1.5px solid VAR_COR_CARD;   /* ex: rgba(14,165,233,0.38) */
border-radius: 4px;
background: rgba(4, 8, 20, 0.92);
box-shadow: 0 0 18px VAR_GLOW_CARD; /* ex: rgba(14,165,233,0.14) */

/* tela interna: 78×50px */
/* barras de conteúdo simulado (3 barras de cor + 3 linhas finas) */
```

Suporte vertical (9:16): troque para `58×90px` e use ícone de TV.

Pedestal: `18×5px`, `border-radius: 0 0 3px 3px`, `background: rgba(14,165,233,0.15)`.

### Card body

```
padding: 11px 13px 13px
border-top: 1px solid var(--border)
```

**Linha de título:**
- Nome: `font-size: 13.5px`, font-weight 700, truncate com `text-overflow: ellipsis`
- Badge de proporção (16:9 / 9:16): `padding 2px 7px`, `border-radius 4px`, `background var(--accent-dim)`, `border: 1px solid rgba(14,165,233,0.2)`, `color var(--accent)`, `font-size 8.5px`

**ID:** `font-family: 'JetBrains Mono'`, `font-size: 9.5px`, `color: var(--txt3)`, `letter-spacing: 0.06em`, `margin-bottom: 11px`

**Botões:**

Botão principal "Abrir Designer" (largura total):
```css
background: rgba(14,165,233,0.1);
border: 1px solid rgba(14,165,233,0.22);
color: var(--accent);
border-radius: 6px; padding: 7px; font-size: 11px; font-weight: 600;
```
Hover: `background rgba(14,165,233,0.2)` + `border-color rgba(14,165,233,0.4)`

Botões secundários em grid 2 colunas ("Copiar URL" / "Visualizar"):
```css
background: rgba(255,255,255,0.033);
border: 1px solid var(--border);
color: var(--txt2);
border-radius: 6px; padding: 6px; font-size: 10.5px; font-weight: 600;
```
Hover: `background rgba(255,255,255,0.07)` + `border rgba(255,255,255,0.12)` + `color var(--txt)`

### Card "Nova Tela" (placeholder no final do grid)

```css
border-style: dashed;
border-color: rgba(14,165,233,0.18);
background: rgba(14,165,233,0.025);
```

Preview: anel circular tracejado `46×46px` com `+` centralizado + label "Nova Tela" abaixo.
Hover: anel e label ficam mais brilhantes, `box-shadow: 0 0 20px rgba(14,165,233,0.12)`.

---

## 10. StatsRow — métricas (rodapé)

Posicionado **após** o grid de cards.

```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 8px;
margin-top: 16px;
```

Cada stat card:
```css
background: var(--card);
border: 1px solid var(--border);
backdrop-filter: blur(16px);
border-radius: 10px;
padding: 10px 14px;
display: flex; align-items: center; justify-content: space-between;
```

Faixa colorida no topo via `::before`:
```css
content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
background: VAR_COR; /* azul / verde / vermelho / roxo */
```

| Stat | Cor | Ícone |
|---|---|---|
| Total de Telas | `#0ea5e9` | Monitor |
| Telas Online | `#22c55e` | WiFi |
| Telas Offline | `#ef4444` | WiFi-off |
| TVs Vinculadas | `#a855f7` | TV |

Label: `font-size: 8.5px`, uppercase, letter-spacing 0.12em, `var(--txt3)`
Valor: `font-size: 20px`, font-weight 800, `var(--txt)`

Ícone: caixa `30×30px`, `border-radius: 8px`, background com 10% de opacidade da cor do stat.

---

## 11. Responsividade

Não adicione media queries para o grid de cards — o `auto-fill minmax` já resolve.

Adicione apenas:
```css
@media (max-width: 1050px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 680px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  /* ocultar labels dos nav-items, manter só ícones */
  /* ocultar botão "Vincular TV" do header */
}
@media (max-width: 480px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
```

---

## 12. Checklist de validação

Antes de finalizar, confirme:

- [ ] Cards das telas aparecem **antes** das métricas na página
- [ ] Grid de cards usa `auto-fill minmax(215px, 1fr)` — sem colunas fixas
- [ ] Hover dos cards tem efeito de mola (spring), não linear
- [ ] Status ONLINE tem animação de pulso no ponto verde
- [ ] Botão ⋮ do card aparece **só** no hover
- [ ] IDs dos cards usam JetBrains Mono
- [ ] Stats têm faixa colorida de 2px no topo (via `::before`)
- [ ] Valores das stats têm `font-size: 20px` (não 32px)
- [ ] Nenhuma lógica/hook/API foi alterada
