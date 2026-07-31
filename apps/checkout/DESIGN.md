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
| `--ink-subtle` | `#8B93A4` | metadado, tempo relativo |
| `--line` | `#E4E3DE` | divisória e borda de card |
| `--accent` | `#0EA5E9` | ação primária, link, foco (mesmo do painel e do site) |
| `--success` | `#16A34A` | pago, total, toggle ligado |
| `--warning` | `#D97706` | aguardando pagamento |
| `--danger` | `#DC2626` | cancelado, falha |
| `--info` | `#7C3AED` | identificado / em andamento |

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
- **Resumo fixo à direita** (`RESUMO`): campo de cupom, linhas de valor, **total
  grande e em verde**, e o item contratado com quantidade e valor.
- **CTA de largura total** ao fim de cada passo, verde, em maiúsculas.
- Métodos de pagamento como **cards de rádio que expandem** ao serem escolhidos,
  com selo de aprovação e marcas de bandeira/processador — anatomia pronta para
  quando o gateway existir.
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
3. **PAGAMENTO** — presente na estrutura, mas hoje **não cobra**: não há gateway
   integrado. O passo mostra o total e encaminha para o contato comercial,
   dizendo isso com clareza. Os cards de rádio de Pix/cartão/boleto ficam
   implementados e desativados, com o motivo escrito — assim, quando o gateway
   entrar, é ligar, não redesenhar.

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

Só pode aparecer no método que de fato aprova na hora. Hoje, nenhum — porque não
há cobrança. Quando o Pix entrar, ele ganha o selo; boleto, não.

## Referências recebidas

Admin (4 capturas do Yampi) e checkout do comprador (3 capturas do
`pagamento-elefantol.shop`). Nada mais está pendente de referência.
