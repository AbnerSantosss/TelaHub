# Sistema de design — app de checkout

Derivado das referências enviadas pelo dono do produto em 2026-07-25 (capturas do
admin do Yampi: Início, Pedidos, Configurações e Novo produto).

## O que foi copiado e o que não foi

Copiamos **estrutura e padrões de interação** — hierarquia do shell, anatomia das
listas, comportamento dos formulários. **Não** copiamos a identidade visual: a
paleta e as fontes são as do TelaHub, porque o produto não pode parecer de outra
empresa. Nada de verde-limão e roxo do Yampi.

## Decisão de tema: o painel do checkout é CLARO

O painel do TelaHub (`frontend/`) é escuro, porque é ferramenta de operação usada
por sessões longas. Este app é claro, por dois motivos concretos:

1. As referências escolhidas pelo dono são claras — é a expectativa dele.
2. Aqui se lê **dinheiro e dado de lead**. Fundo claro com texto quase preto dá
   o maior contraste possível para números, e é o que torna a tela imprimível e
   legível em tela de loja com reflexo.

O checkout público (`/c/:token`) também é claro, pela mesma razão de confiança —
é o momento em que a pessoa decide pagar.

## Tokens

Fundo levemente quente (não branco puro) para não brilhar, como nas referências.

| Papel | Valor | Uso |
|---|---|---|
| `--bg-app` | `#F6F5F2` | fundo do conteúdo |
| `--bg-surface` | `#FFFFFF` | cards, tabelas, campos |
| `--bg-nav` | `#17181B` | topo escuro e ativo da sidebar |
| `--bg-sidebar` | `#FFFFFF` | sidebar clara |
| `--ink` | `#16181D` | texto principal |
| `--ink-muted` | `#5B6472` | rótulo, descrição |
| `--ink-subtle` | `#646B78` | metadado, tempo relativo (era `#8B93A4`, 2.8:1; agora 4.9:1 sobre `--app`) |
| `--line` | `#E4E3DE` | divisória e borda de card |
| `--accent` | `#0EA5E9` | foco, ícone, barra de gráfico (mesmo do painel e do site). **Não** é fundo de botão com texto branco: 2.8:1 |
| `--accent-strong` | `#0369A1` (hover `#025584`) | fundo do botão primário do painel — 5.9:1 com branco |
| `--cta` | `#15803D` (hover `#166534`) | CTA verde do checkout — 5.0:1 com branco |
| `--success` | `#16A34A` | pago, total, toggle ligado |
| `--warning` | `#D97706` | aguardando pagamento |
| `--danger` | `#DC2626` | cancelado, falha |
| `--info` | `#7C3AED` | identificado / em andamento |

Texto de status usa a variante escurecida do mesmo tom, porque o tom cheio fica
em ~3:1 como texto:

| Token | Valor | Contraste sobre o fundo tingido a 10% |
|---|---|---|
| `--accent-ink` | `#0369A1` | 5.4:1 |
| `--info-ink` | `#6D28D9` | 6.4:1 |
| `--success-ink` | `#166534` | 6.4:1 |
| `--warning-ink` | `#92400E` | 6.6:1 |
| `--danger-ink` | `#B91C1C` | 5.7:1 |

Os mapas de status do painel (sessão, lead, pagamento, evento da linha do
tempo) vivem num módulo só, `src/admin/status.ts`: cada tom (`accent`, `info`,
`success`, `warning`, `danger`, `neutral`) é definido uma vez, e cada
vocabulário apenas diz qual tom usa. Hex solto em classe (`text-[#…]`) não entra
mais — use o token.

Cor de status é **semântica, não decorativa**: cada estado do funil tem uma cor
fixa e ela é a mesma no chip de filtro, no badge da linha e no gráfico. Se a cor
mudar entre as telas, o operador reaprende a cada tela.

## Tipografia

- **Exo 2** — interface (400/500/600/700/800). É a fonte do painel; mantém a
  família do produto.
- **JetBrains Mono** — só para dinheiro, contadores e identificadores (token de
  sessão, número de contratação). Com `font-variant-numeric: tabular-nums`, para
  o valor não "pular" quando o número de telas muda. Ver `.money` no `index.css`.

Escala: rótulo de campo e eyebrow em 11–12px com `letter-spacing` aberto e
maiúsculas; corpo 14px; título de página 24px/800; número de KPI 30–32px/800.

## Anatomia das telas

### Shell
Topo escuro fixo com busca central (atalho `Ctrl+K`) e ações à direita. Sidebar
clara à esquerda com: seletor de organização no topo, navegação plana de
ícone+rótulo, um grupo secundário rotulado, e **Configurações fixo no rodapé**.
Conteúdo em `--bg-app`.

Diferença deliberada em relação à referência: **não** haverá barra de progresso
gamificada ("5/48") nem banner de oferta interna. São mecânicas de retenção da
plataforma deles, não do nosso produto, e ocupariam o espaço mais valioso da tela
com algo que não ajuda o operador.

### Início (funil)
1. Saudação com o primeiro nome.
2. Linha de **KPIs principais**: checkouts iniciados, valor contratado no
   período, contratações concluídas. Número grande em mono, rótulo abaixo,
   variação ao lado quando houver base de comparação.
3. Linha de **cards de ação**, visualmente mais apagados que os KPIs: *checkouts
   para recuperar*, aguardando pagamento, expirados. Cada um leva à lista já
   filtrada — card que não navega é enfeite.
4. **Funil por passo**, que é o dado mais acionável e não existe na referência:
   em qual etapa as pessoas param. Sem isso o painel diz que houve abandono, mas
   não onde.

Quando não houver dado, cada bloco mostra estado vazio com o próximo passo — não
zero solto, que parece defeito.

### Lista de sessões
Título + contagem ("68 pedidos" → "N checkouts"). Chips de status horizontais,
cada um com sua cor, funcionando como filtro. Barra com Filtrar, busca e Ações.
Tabela: seleção, célula de duas linhas (identificador em mono + nome do lead),
data absoluta com tempo relativo abaixo ("há 8 meses"), valor em mono alinhado à
direita, badge de status e ícones de ação na linha — no nosso caso, registrar
contato de recuperação.

### Detalhe da sessão
Cards empilhados no padrão do formulário da referência, mais a **linha do tempo
de eventos** — é o que responde "o que a pessoa fez antes de desistir".

### Formulários
Cards empilhados com cabeçalho; rótulo acima do campo; `(opcional)` explícito;
toggle com o estado escrito ao lado; controle segmentado para escolha binária;
prefixo `R$` embutido no campo de valor; barra de ação fixa com Cancelar e
Salvar. Ajuda contextual à direita, não em tooltip escondido.

## Piso de qualidade

Não negociável, independente de estética: responsivo até 360px, foco visível no
teclado, `prefers-reduced-motion` respeitado, contraste mínimo de 4.5:1 no texto
de corpo, `label` associado a todo campo, e erro anunciado junto ao campo — não
só por cor.

## Checkout do comprador (referências de 2026-07-25)

Referências: capturas do checkout `seguro.pagamento-elefantol.shop` (Identificação,
Pagamento com método selecionado e Pagamento sem seleção).

### Estrutura adotada

- **Barra de confiança** no topo, escura, com uma linha de texto curta.
- **Coluna principal com passos numerados em acordeão.** O passo ativo está
  aberto; os seguintes aparecem esmaecidos com o número em cinza; o passo
  concluído **colapsa em um card verde** com ✓, resumo dos dados preenchidos e um
  lápis para editar. Esse colapso é o detalhe que mais ajuda: mantém o contexto
  sem ocupar a tela.
- **Resumo fixo à direita** (`RESUMO`): linhas de valor, **total grande e em
  verde**, e o item contratado com quantidade e valor. **Sem campo de cupom**: não
  existe desconto no backend, e campo que aceita texto e não faz nada ensina a
  pessoa a procurar cupom em outro site (ver `OrderSummary.tsx`).
- **CTA de largura total** ao fim de cada passo, verde, em maiúsculas.
- Métodos de pagamento como **cards de rádio que expandem** ao serem escolhidos.
  Só aparece método que o provedor ativo aceita (hoje Pix e cartão); nada de
  selo de aprovação.
- Em telas estreitas, o resumo vira barra fixa no rodapé com o total e o CTA.

### Passos, adaptados a assinatura por tela

A referência é de produto único com frete. Aqui não há entrega, e a variável é
*quantas telas*. Então:

1. **IDENTIFICAÇÃO** — nome, e-mail, WhatsApp com prefixo `+55`, e CPF **ou
   CNPJ** (CNPJ importa: é B2B e a NFS-e é emitida contra ele).
2. **SUA ASSINATURA** — plano e número de telas, com a fatura recalculando ao
   vivo. É o passo que substitui "endereço/frete" e é o coração do produto: o
   piso de 5 telas do plano Rede precisa ficar visível aqui, não escondido em
   texto, senão o valor "não fecha" na cabeça de quem compra.
3. **PAGAMENTO** — cobra via **provedor de pagamento**, e o que o passo oferece
   vem de `GET /checkout/payment-config`, não de uma lista fixa na tela. Hoje o
   provedor ativo é **simulado** (o Asaas está pronto e liga só por variável de
   ambiente); enquanto for simulado, o aviso "Ambiente de demonstração. [...] nenhum
   valor será cobrado" é **permanente e fica no topo** do passo. Sem provedor
   que cobre online, o passo encaminha para o comercial, dizendo isso com
   clareza.

   **Boleto foi removido** (2026-09-05): nenhum provedor aqui o emite, e um card
   "indisponível" de forma de pagamento inexistente é oferta que não se cumpre
   (CDC, arts. 30 e 37). Volta só junto com o provedor que o emitir.

### Dois padrões da referência que NÃO vamos reproduzir

Ambos são os mesmos que foram removidos das páginas de venda neste ciclo, pelos
arts. 30 e 37 do CDC (a publicidade vincula o contrato) — reintroduzi-los aqui
recriaria o problema no lugar de maior risco, que é a tela de pagamento.

1. **Contador "Oferta termina em 00:19:49".** Não existe prazo real numa
   assinatura mensal, e um contador que reinicia é urgência falsa. Se um dia
   houver oferta com data real, o componente entra — com a data real.
2. **Depoimentos com foto e cinco estrelas.** O produto não tem clientes. O
   espaço fica para prova verdadeira: o que o produto faz, e as garantias que
   existem de fato.

O que **é** legítimo na barra de confiança e ocupa bem esse espaço: sem
fidelidade, cancelamento pelo painel, e o direito de arrependimento de 7 dias do
art. 49 do CDC. Tudo verificável.

### Selo de "aprovação imediata"

Só pode aparecer no método que de fato aprova na hora. Hoje, nenhum: o Pix nasce
**pendente** até a confirmação do provedor, então prometer aprovação instantânea
seria promessa que a tela não cumpre.

## Acabamento visual do checkout (2026-09-21)

O checkout recebe **menos efeito** que a landing e o painel: é a tela onde a
pessoa digita documento e decide pagar, e movimento ali lê como distração ou
truque. Tudo abaixo é CSS puro (Tailwind v4 + `index.css`), sem biblioteca de
animação.

- **CTA (`PrimaryButton`)** — verde próprio `--cta` `#15803D` (5.0:1 com o texto
  branco; o `--success` `#16A34A` dava 3.3:1), hover um tom abaixo (`#166534`).
  Hover só com mouse (`hover-fine:`, `@media (hover: hover) and (pointer: fine)`):
  escurece e uma **faixa de luz cruza o botão uma vez** (`.cta-sheen`, 700ms, não
  repete). Press com `scale(0.98)`. Ocupado mantém spinner + `busyLabel` +
  `aria-busy`. Desabilitado: verde a 45%, sem sombra e sem efeito. A barra fixa
  do rodapé no celular usa as MESMAS classes (`ctaClass`). Altura mínima 48px.
- **Passos (`StepCard`)** — indicador em **badge quadrado** (referência:
  "Stepper with Square Badges", 21st.dev, reescrito sem framer-motion): cinza no
  pendente, escuro com halo no ativo, verde com ✓ no concluído; número e ✓
  trocam por opacidade/escala. O passo ativo ganha borda mais forte e
  `--shadow-raised`. Abrir/fechar anima a altura pelo truque de
  `grid-template-rows: 0fr → 1fr`; o painel fechado fica `invisible` (fora da
  tabulação e do leitor de tela, como o antigo `hidden`).
- **Resumo (`OrderSummary`)** — duas camadas (referência: "Payment Summary",
  21st.dev): cartão com `--shadow-raised` e cabeçalho em faixa `--app`; linhas
  separadas por tracejado; total numa **placa rebaixada** em `--cta`. Nenhum dado
  novo.
- **Fundo** — `.checkout-backdrop`: gradiente estático de `--surface` para
  `--app` nos primeiros 420px, com halo frio de 6% no alto. Não anima.
- **Campos** — 16px no celular (evita o zoom do iOS), 14px a partir de `sm`;
  anel de foco suave (`ring-accent/15`) além da borda. Toque ≥44px em todo
  controle (inclusive os botões −/+ de telas).
- **Movimento reduzido** — a regra global zera durações; além disso
  `.motion-effect` (a faixa de luz) some e `.motion-press` não escala.

Sombras em `@theme`: `--shadow-card` (curta, botões secundários),
`--shadow-raised` (passo ativo, resumo, card de erro), `--shadow-cta`.

## Referências recebidas

Admin (4 capturas do Yampi) e checkout do comprador (3 capturas do
`pagamento-elefantol.shop`). Nada mais está pendente de referência.
