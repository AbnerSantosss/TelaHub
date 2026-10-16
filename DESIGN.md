---
name: TelaHub
description: Sinalização digital para TVs comuns, numa identidade clara só, da landing ao painel.
colors:
  papel: "#ffffff"
  papel-2: "#f4f7fb"
  papel-3: "#e9eff7"
  tinta: "#0a1223"
  tinta-2: "#33415c"
  tinta-3: "#55637d"
  marca: "#0369a1"
  marca-hover: "#025584"
  marca-fundo: "#e6f0f7"
  marca-borda: "#bfe0f2"
  noite: "#071426"
  noite-2: "#0c1e36"
  noite-texto: "#c5d3e6"
  noite-titulo: "#e9f0fa"
  luz: "#38bdf8"
  luz-2: "#7dd3fc"
  borda: "#dbe4ef"
  borda-2: "#c9d5e3"
  borda-3: "#7d8ca0"
  ok: "#0f7a5a"
  warn: "#a35a06"
  danger: "#b3261e"
  ok-fundo-solido: "#e7f2ee"
  warn-fundo-solido: "#fbf1e4"
  danger-fundo-solido: "#fbeceb"
  ok-tinta: "#0b5a43"
  warn-tinta: "#7a4305"
  danger-tinta: "#8c1e18"
typography:
  display:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 1.35rem + 2.6vw, 3.625rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  lead:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, Geist Variable, Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: "Geist Mono, Geist Mono Variable, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "'tnum' 1"
rounded:
  raio-4: "4px"
  raio-6: "6px"
  raio-8: "8px"
  raio-12: "12px"
  raio-16: "16px"
  raio-24: "24px"
  pilula: "999px"
spacing:
  grade: "20px"
  cabeca: "12px"
  secao: "96px"
  secao-compacta: "80px"
  secao-tablet: "64px"
  secao-celular: "44px"
  gutter-1440: "160px"
  gutter-1280: "80px"
  gutter-980: "40px"
  gutter-640: "20px"
  toque: "44px"
components:
  button-primary:
    backgroundColor: "{colors.marca}"
    textColor: "{colors.papel}"
    rounded: "{rounded.raio-8}"
    padding: "14px 24px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.marca-hover}"
    textColor: "{colors.papel}"
  button-fantasma:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.marca}"
    rounded: "{rounded.raio-8}"
    padding: "14px 24px"
    height: "52px"
  button-fantasma-hover:
    backgroundColor: "{colors.papel-2}"
    textColor: "{colors.marca-hover}"
  button-luz:
    backgroundColor: "{colors.luz}"
    textColor: "{colors.noite}"
    rounded: "{rounded.raio-8}"
    padding: "14px 24px"
    height: "52px"
  button-luz-hover:
    backgroundColor: "{colors.luz-2}"
    textColor: "{colors.noite}"
  button-desabilitado:
    backgroundColor: "{colors.papel-3}"
    textColor: "{colors.tinta-3}"
    rounded: "{rounded.raio-8}"
  input:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.raio-8}"
    padding: "10px 12px"
    height: "44px"
  chip:
    backgroundColor: "{colors.papel-2}"
    textColor: "{colors.marca}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "4px 12px"
    height: "28px"
  card:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.raio-16}"
  aviso-info:
    backgroundColor: "{colors.marca-fundo}"
    textColor: "{colors.tinta}"
    padding: "12px 14px"
  topbar:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.raio-16}"
    padding: "12px 20px"
---

# Design System: TelaHub

Fonte vigente da identidade: este arquivo, na raiz do monorepo; `apps/checkout/DESIGN.md` é histórico (anterior à marca única de 15/10/2026) e não vale mais.

## Overview

**Creative North Star: "Vitrine Acesa"**

Uma vitrine iluminada num dia claro: papel branco, tinta azul-marinho quase preta e um único azul de marca que carrega ação, link e seleção. A landing, as telas de entrar e cadastrar, o checkout e o painel importam o mesmo `packages/marca/tokens.css`, e quem passa de uma etapa à outra não troca de produto. A densidade vai de folgada na landing (seções de 96px, respiro lateral de 160px a 1440) a compacta no painel, sem mudar de cor, fonte ou raio.

O mundo tem dois climas e só dois. O claro (papel) é o chrome inteiro: venda, conta, pagamento, operação. O escuro (noite) aparece em faixas da landing, na moldura das TVs ilustradas e na própria TV: o Player e o canvas do editor vivem em `--noite`, com o azul-céu `--luz` como destaque, porque o que vai para a parede é visto de longe e não é a interface. Todo par de cor tem contraste medido e anotado no cabeçalho de `tokens.css`; cor nova entra lá primeiro, com a medida.

Movimento é sóbrio e só com mouse de verdade: o botão escurece um tom, sobe 1px e afunda em `scale(0.97)` ao toque; faixas de brilho e reflexo existem apenas com `(hover: hover) and (pointer: fine)` e somem com `prefers-reduced-motion`. Curva padrão `--ease-saida` (`cubic-bezier(0.22, 1, 0.36, 1)`).

**Key Characteristics:**
- Uma família tipográfica (Geist) em todo o chrome, com Geist Mono para código de pareamento, identificador e número tabular.
- Um azul de marca fixo, sem seletor de cor por conta.
- Claro por padrão; a família `--noite` é reservada para faixas escuras da landing e para a TV.
- Contraste medido em cada par, alvo de toque de 44px e corpo de 16px no celular.
- Estado com cor semântica e par sólido de fundo e tinta; verde é sucesso e "no ar", nunca botão de compra.

## Colors

Neutros frios de papel e tinta, um azul de marca de contraste AA e uma família noturna separada para a TV.

### Primary
- **Azul Vitrine** (marca): botão primário, link, item selecionado, anel de foco, logo. Branco sobre ele e ele sobre papel dão 5,4:1. Para transparências use `rgba(var(--marca-rgb), a)`; o anel de foco de campo é `--anel-marca` (`0 0 0 3px` da marca a 18%).
- **Azul Vitrine Fechado** (marca-hover): hover e pressão do primário.
- **Névoa da Marca** (marca-fundo): fundo de aviso informativo e de item selecionado; a marca sobre ele dá 5,1:1.
- **Contorno da Marca** (marca-borda): borda de caixa informativa. Decorativa (1,4:1), nunca texto.

### Secondary
- **Luz** (luz) e **Luz Clara** (luz-2): destaque e botão sobre `--noite` (9,8:1). Sobre papel dá 1,8:1: nunca texto em fundo claro.

### Neutral
- **Papel** (papel): superfície de cartão, campo, barra do topo, fundo da landing.
- **Papel Frio** (papel-2): fundo do painel, do checkout e das telas de conta; faixas alternadas da landing.
- **Papel Fechado** (papel-3): trilho, hover de fantasma, fundo de botão desabilitado.
- **Tinta** (tinta): títulos e texto principal (16,9:1).
- **Tinta Média** (tinta-2): texto de apoio e rótulo de campo (8,6:1).
- **Tinta Discreta** (tinta-3): legenda, placeholder, texto de desabilitado (5,7:1 no papel, 5,2:1 no papel-3).
- **Borda**, **Borda Média**, **Borda de Campo** (borda, borda-2, borda-3): divisória, contorno de cartão, contorno de campo. A de campo dá 3,4:1 e nunca é texto.
- **Noite**, **Noite Alta**, **Texto Noturno**, **Título Noturno** (noite, noite-2, noite-texto, noite-titulo): faixas escuras da landing, moldura de TV ilustrada, Player e canvas do editor.

### Estado
- **Verde No Ar**, **Âmbar Aviso**, **Vermelho Erro** (ok, warn, danger): ícone, texto curto e borda de estado sobre o fundo sólido do próprio estado (4,6 · 4,7 · 5,7:1).
- **Fundos de estado** (ok-fundo-solido, warn-fundo-solido, danger-fundo-solido): caixa e linha tingida do estado.
- **Tintas de estado** (ok-tinta, warn-tinta, danger-tinta): texto longo dentro da caixa do estado (7,2 · 7,1 · 7,9:1).

### Named Rules
**A Regra da Marca Única.** Existe um azul de marca, fixo. Não há seletor de cor por conta nem segundo matiz; os antigos `--th-accent*` e `violet` do painel apontam para `--marca`.

**A Regra do Hex na Marca.** Nenhum app escreve hex solto. Faltou um tom, ele entra em `packages/marca/tokens.css` primeiro, com o contraste medido no comentário. O conteúdo exibido na TV (fundos animados de widget) é o conteúdo do cliente, não o chrome, e fica fora desta regra.

**A Regra do Verde que Não Vende.** Verde é sucesso e tela no ar. O botão de compra é sempre a marca.

## Typography

**Display Font:** Geist (com Geist Variable, Inter, system-ui)
**Body Font:** Geist (a mesma)
**Label/Mono Font:** Geist Mono (com ui-monospace, Consolas)

**Character:** uma sans geométrica e neutra em tudo, que fica pesada (800, tracking negativo) só nos títulos da landing. A mono aparece onde o número precisa se alinhar ou ser copiado.

### Hierarchy
- **Display** (800, `clamp(2rem, 1.35rem + 2.6vw, 3.625rem)`, 1.03): título do herói da landing.
- **Headline** (800, `clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)`, 1.1): título de seção da landing.
- **Title** (500, 1rem, 1.375): título de cartão no painel e no checkout.
- **Lead** (400, `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)`, 1.6): subtítulo de seção, medida de 54ch.
- **Body** (400, 16px, 1.55): texto corrido em toda superfície.
- **Label** (600, 0.8125rem, 1.3, caixa normal): rótulo de campo e de grupo, chip, pílula de contagem.
- **Mono** (600, 0.875rem, numeral tabular): código de pareamento, identificador, dinheiro e contadores do checkout e da barra do painel.

### Named Rules
**A Regra dos 16 no Celular.** Texto de leitura tem 16px ou mais abaixo de 640px. Em Tailwind o padrão é `text-base sm:text-xs` ou `text-base sm:text-sm`; campo de formulário tem 16px no celular para o iOS não dar zoom.

**A Regra da Caixa Normal.** Rótulo fica em caixa normal e nunca vai acima de título. Não há eyebrow (rótulo em caixa alta espaçada acima do título): a seção se apresenta pelo próprio título.

**A Regra da Fonte da Parede.** Na superfície da TV (`html[data-superficie="tv"]` e `.superficie-tv`) a fonte é a do conteúdo exibido (Exo 2 e JetBrains Mono), não a do chrome. A cena do cliente não muda quando o painel muda.

## Layout

A landing é uma pilha de seções de largura total com respiro lateral variável (`--gutter`): 160px no artboard de 1440, 80px até 1280, 40px até 980, 20px até 640. A seção tem 96px de topo e base (80 na compacta), cai para 64px até 980 e 44px até 640; o espaço entre blocos da seção vai de 40 a 32 a 24px. Grades de 2 e 3 colunas com 20px de vão: a de 3 vira 2 abaixo de 900 e tudo vira 1 coluna abaixo de 640. O cabeçalho de seção limita a 760px.

O painel usa um contêiner de 1320px com respiro de 16, 24 e 32px (a partir de 640 e 1024). Checkout e conta são colunas estreitas sobre `--papel-2`.

Toda tela é conferida em 360, 390, 768, 1024, 1280 e 1440. Nenhuma seção empurra a página de lado: tabela larga rola dentro do próprio contêiner.

**A Regra dos 44.** Todo alvo de toque tem 44px ou mais no celular. Botão `default` e `lg` do painel ganham `max-md:min-h-11`; botão de ícone é `size-11` no celular e `size-9` a partir de `lg`.

**A Regra da Primitiva sem Display.** Primitiva compartilhada (classe de botão, pílula, ícone) não declara `display`. Quem usa decide: um `flex` na base vence o `hidden lg:flex` da tela e faz o elemento aparecer duas vezes no celular.

## Elevation & Depth

Híbrido discreto: as superfícies se separam por cor de papel e borda de 1px, e a sombra é curta e neutra, preta em baixa opacidade. O destaque de cartão é a borda de 2px na marca; a sombra só acompanha.

### Shadow Vocabulary
- **Cartão** (`0 10px 30px rgba(0, 0, 0, 0.08)`): cartão da landing e do checkout.
- **Navbar** (`0 6px 20px rgba(0, 0, 0, 0.07)`): barra do site e TopBar do painel.
- **Captura** (`0 6px 12px rgba(0, 0, 0, 0.14)`): moldura de print do produto.
- **Flutuante** (`0 6px 12px rgba(0, 0, 0, 0.18)`): menu e popover.
- **Modal** (`0 30px 70px rgba(0, 0, 0, 0.3)`): diálogo, sobre o véu `rgba(7, 20, 38, 0.55)`.
- **TV** (`0 12px 24px rgba(0, 0, 0, 0.22)`): TV ilustrada.
- **Destaque** (`0 6px 12px rgba(0, 0, 0, 0.1)`, forte `0 8px 12px rgba(0, 0, 0, 0.14)`): acompanha a borda de 2px do cartão em destaque.
- **Botão** (`--sombra-btn`, `0 8px 24px rgba(3, 105, 161, 0.22)`): primário do painel e do checkout. O site usa no lugar `0 2px 4px rgba(0, 0, 0, 0.2)`.

### Named Rules
**A Regra Sem Brilho.** Nada de glow, halo radial colorido ou anel de deslocamento zero como decoração. Sombra é deslocada, curta e neutra; o anel `--anel-marca` existe só para foco de campo.

## Shapes

Cantos suavemente arredondados numa escala fixa: 4px (foco, barra de rolagem), 6px, 8px (botão, campo e botão de texto no site e nas telas de conta), 12px (moldura de captura, cartão interno), 16px (cartão da landing, cartão e barra do painel), 24px (blocos grandes). Chip e pílula são totalmente arredondados. No Tailwind a ponte mapeia `rounded-sm` 6, `rounded-md` 8, `rounded-lg` 12, `rounded-xl` 16 e `rounded-2xl` 24.

Borda é de 1px, em `--borda` ou `--borda-2`; campo usa `--borda-3`. O logo é uma grade de quatro telas de canto 2 ligadas a um ponto central por traço tracejado, sempre na marca (ou branco sobre o quadrado da marca no favicon).

**A Regra do Cartão Plano.** Não há cartão dentro de cartão. Dentro de um cartão, aviso é faixa tingida sem borda nem raio, e o campo leva borda e fundo no próprio `<input>`, sem caixa em volta.

**A Regra da Borda Fina.** Borda lateral colorida maior que 1px não existe como acento de cartão, aviso ou item de lista.

## Components

### Buttons
Firmes e sóbrios: cor sólida, texto curto, aperto visível.
- **Shape:** cantos de 8px no site e nas telas de conta; o `rounded-lg` do painel e do checkout resolve em 12px.
- **Primary:** marca sólida com texto branco, peso 700 (600 no painel), 52px de altura no site (56 no grande), 48px nas telas de conta e no CTA do checkout, largura total no checkout e na conta.
- **Hover / Focus:** escurece para marca-hover e sobe 1px (só com mouse); pressão em `scale(0.97)`; foco com contorno de 2 a 3px na marca, afastado 2px.
- **Fantasma:** papel com texto na marca e borda de campo de 1,5px; no hover a borda vira a marca.
- **Luz:** sobre `--noite`, fundo luz e texto noite, sem sombra.
- **Texto:** link que é botão, 44px de alvo, sublinhado que nasce da esquerda no hover.
- **Desabilitado:** par sólido de tokens, fundo papel-3, borda borda e texto tinta-3 (5,2:1), sem sombra. Nunca `opacity`. Durante o envio o primário segue na marca com o spinner.

### Chips
- **Style:** pílula de 28px, papel-2 com borda de 1px, texto 13px peso 600 na marca, caixa normal. Sobre noite: fundo luz-fundo, texto luz.
- **Pílula de contagem do painel:** canto de 8px, papel-2, rótulo em tinta-2 e número em Geist Mono tabular.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** papel sobre papel-2 (painel, checkout) ou sobre papel (landing).
- **Shadow Strategy:** Cartão; destaque por borda de 2px na marca mais a sombra de Destaque.
- **Border:** 1px em borda-2 (landing) ou anel de 1px na tinta a 10% (painel); no hover com mouse a borda vai para borda-3.
- **Internal Padding:** 16px no painel (12px no tamanho pequeno).

### Inputs / Fields
- **Style:** papel, borda de 1px em borda-3, cantos de 8px (12px no checkout), 44px de altura mínima no celular, 16px de texto no celular e 14px a partir de 640.
- **Focus:** borda vira a marca e ganha o anel `--anel-marca`.
- **Error / Disabled:** borda em danger e mensagem abaixo com ícone e texto em danger, anunciada com `role="alert"`; nunca só cor. Ajuda fica visível abaixo do campo, não em tooltip.

### Navigation
- **Barra do site e TopBar do painel:** papel, borda fina, sombra Navbar. Marca à esquerda (quadrado da marca com a TV em traço branco, "TelaHub" em 800), contagens no centro, ações à direita. No celular a barra empilha e os botões de ícone ficam com 44px.

### Aviso
- **Style:** faixa tingida (marca-fundo para info, fundo sólido do estado para os demais), sem borda nem raio dentro de cartão, ícone no tom do estado, texto até 56ch, 16px no celular.

### Superfície da TV
O Player e o canvas do editor ficam em `--noite`, com título em noite-titulo e destaque em luz. O conteúdo da cena é do cliente e mantém fonte e fundo próprios.

## Do's and Don'ts

### Do:
- **Do** importar `packages/marca/tokens.css` (e `tailwind-theme.css` no painel e no checkout) e usar só os tokens dele.
- **Do** medir o contraste de qualquer tom novo e anotá-lo no cabeçalho de `tokens.css` antes de usar.
- **Do** dar 16px ao texto de leitura no celular (`text-base sm:text-xs` ou `text-base sm:text-sm`) e 44px a todo alvo de toque.
- **Do** desabilitar botão com o par sólido papel-3, borda e tinta-3.
- **Do** usar a família `--noite` e a luz na TV e nas faixas escuras da landing.
- **Do** restringir hover com movimento a `(hover: hover) and (pointer: fine)` e respeitar `prefers-reduced-motion`.

### Don't:
- **Don't** criar seletor de cor por conta nem um segundo matiz de destaque.
- **Don't** colocar eyebrow (rótulo em caixa alta acima do título).
- **Don't** usar gradiente em texto.
- **Don't** usar glow, halo radial colorido ou sombra azul difusa como decoração.
- **Don't** usar borda lateral colorida maior que 1px.
- **Don't** aninhar cartão dentro de cartão.
- **Don't** escrever hex solto fora de `packages/marca`.
- **Don't** desabilitar botão com `opacity`.
- **Don't** declarar `display` numa primitiva compartilhada.
- **Don't** usar luz como texto sobre papel.
- **Don't** usar verde em botão de compra.

### Dívida conhecida (não é padrão)
O editor do painel (`Scheduler`, `SceneEditor`, `WidgetLibrary`, e também `PropertiesPanel` e `LayersModal`) ainda tem microtipografia `text-[8px]` e `text-[9px]` com caixa alta espaçada e alguns hex soltos. É dívida a pagar, não modelo para tela nova.
