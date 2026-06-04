# 🎨 TelaHub — Relatório de Atualização Visual (Design & Layout)

Este documento resume as especificações técnicas de design, paleta de cores, proporções de componentes e micro-interações aplicadas na última rodada de polimento visual do **TelaHub**. Ele serve como ponto de referência para os designers do projeto manterem a consistência visual em futuras iterações.

---

## 🧭 1. Conceito Estético Geral

O conceito visual evoluiu para **"Dark Premium Fluid"**, refinando a atmosfera de telemetria corporativa e removendo elementos que causavam rigidez ou ruído visual.

*   **Identidade Principal**: Foco em grades geométricas precisas, hairline borders de alta definição e efeitos glassmorphic com contrastes acentuados de azul tecnológico.
*   **Composição de Tela**: Transição de superfícies sólidas e opacas para layouts com profundidade em camadas (depth mapping), onde o conteúdo "flutua" sobre um gradiente azul orgânico.

---

## 🎨 2. Paleta de Cores e Fundo Gradiente

A paleta de cores e o mapeamento de variáveis de marca foram corrigidos para restabelecer a identidade visual predominante do produto.

### 🌌 Fundo Gradiente (Body Background)
Definimos um gradiente radial fixo aplicado diretamente na base da aplicação (`body`). As páginas e wrappers de rota agora utilizam `bg-transparent` para permitir a sobreposição harmoniosa deste fundo:
*   **Gradiente**: `radial-gradient(circle at 50% 0%, #091338 0%, #04081c 55%, #010208 100%) no-repeat fixed`
*   **Efeito**: Um "glow" sutil de azul tecnológico emerge do topo da tela, suavizando para azul-escuro e preto na base.

### 🔵 Azul Predominante (Brand Accent Color)
Restauramos o tom azul vibrante original nas variáveis fundamentais do tema (`--accent`, `--primary` e `--ring`) no CSS global:
*   **Hex/HSL**: `#0ea5e9` (`hsl(198.6 92.8% 48.4%)`)
*   **Mapeamento**:
    *   `--brand-accent`: `#0ea5e9` (Sky Blue)
    *   `--primary`: `198.6 92.8% 48.4%`
    *   `--accent`: `198.6 92.8% 48.4%`
*   **Aplicação**: Esta cor é o guia de atenção do usuário. Deve ser usada estritamente em botões primários, ícones ativos, marcadores de status *ONLINE*, links importantes e halos de foco ativo (focus rings).

---

## 📐 3. Grid e Densidade de Informação

Corrigimos a escala gigante que os elementos haviam tomado, aplicando uma maior densidade de informação para telas de monitoramento (telemetria).

### 🎴 Cards de Displays (`DisplayCard.tsx`)
Reduzimos as dimensões estruturais para criar um visual muito mais compacto, compacto e alinhado com dashboards profissionais:

1.  **Miniatura/Capa**: Altura reduzida de `160px` (`h-40`) para **`128px` (`h-32`)**.
2.  **Mockups de Visualização (TV/Monitor)**: Redesenhados proporcionalmente para se encaixarem na área de capa:
    *   *Modo Horizontal (16:9)*: Reduzido de `124x80px` para **`100x65px`** (Ícone central do Monitor = `22px`).
    *   *Modo Vertical (9:16)*: Reduzido de `80x124px` para **`58x90px`** (Ícone central da TV = `18px`).
3.  **Padding Interno (`CardContent`)**: Espaçamento reduzido de `24px` (`p-6`) para **`16px` (`p-4`)**.
4.  **Margem da Legenda (ID)**: Reduzida de `20px` (`mb-5`) para **`12px` (`mb-3`)**.
5.  **Cor do Card**: Uso do fundo translúcido escuro **`bg-[#0a0f24]/70`** com `backdrop-filter: blur(12px)` e bordas finas com opacidade reduzida (`border-white/5` ou `border-border`).

### 📊 Painel de Métricas (`StatsRow.tsx`)
Ajustamos a fileira de indicadores para acompanhar a nova linha visual:
*   **Fundo**: Transição para o azul-escuro translúcido `bg-[#0a0f24]/70` com blur.
*   **Paddings**: Reduzido de `p-5` para **`p-4`** (16px), tornando a fileira de estatísticas do topo mais discreta.

### 📐 Grade e Espaçamento (`DisplayGrid.tsx`)
*   O espaçamento entre os cartões no grid de displays foi encurtado de `gap-6` (24px) para **`gap-4` (16px)**, aumentando a quantidade de conteúdo visível sem necessidade de scroll.

---

## ⚡ 4. Botões e Elementos Interativos

Eliminamos paddings sobressalentes que deformavam a escala geométrica dos botões.

*   **Botões de Ação Principal**: Removida a classe customizada de espaçamento vertical `py-5`. Passamos a adotar as especificações de altura nativas do design system (`size="lg"` para o CTA principal de 36px, e `size="default"` para botões de cópia/visualização de 32px).
*   **Cantos Arredondados**: Padronização estrita de cantos com **`rounded-lg`** (8px) para botões de controle, contrastando com os cantos mais suaves dos cards (`rounded-2xl` / 14px).
*   **Micro-interações**:
    *   *Cards*: Mantido o efeito spring de elevação vertical suave ao passar o mouse (`whileHover={{ y: -6 }}`).
    *   *Efeito Glow*: Botões ativos e halos de seleção usam um gradiente linear que vai de `--accent` (azul céu) a `--accent-2` (`#2563eb` - azul ação), com sombra de brilho difusa ativa no hover (`shadow-glow`).
