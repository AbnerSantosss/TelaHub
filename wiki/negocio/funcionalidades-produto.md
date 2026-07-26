---
tipo: negocio
atualizado: 2026-07-25
tags: [produto, funcionalidades, posicionamento]
sources:
  - raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md
  - raw/pesquisa/2026-07-25-analise-prontidao-comercial.md
---

# Funcionalidades do Produto — TelaHub (Display de Vendas)

TelaHub é um sistema de gestão de telas/displays digitais (digital signage) para pontos de venda: um editor visual monta "cenas" que rodam em TVs/kiosks físicos, combinando widgets de produtividade (relógio, clima, notas, cardápio) com conteúdo corporativo embutido (Power BI, Airtable, Google Docs, Office 365, PDF).

## Proposta de valor por widget

- **Informativo/ambiente**: relógio, clima, calendário, contagem regressiva, RSS — mantém a tela "viva" mesmo sem conteúdo de vendas ativo.
- **Produtividade interna**: notas, to-do, cardápio semanal, tarefas domésticas — uso também para telas internas de equipe, não só vitrine para cliente.
- **Corporativo/BI**: Power BI, Airtable, Google Docs, Office Docs, PDF, embed HTML genérico — permite exibir relatórios e documentos vivos sem trabalho manual de atualização.
- **Broadcasts** (Scheduler) — anúncios/promoções agendados que sobrescrevem temporariamente o conteúdo normal de um conjunto de displays, útil para campanhas com janela de tempo definida (ex.: liquidação de fim de semana).

## O que o inventário de widgets diz sobre o posicionamento (2026-07-25)

Listar a pasta `frontend/components/widgets/` e o enum `WidgetType` (`frontend/types.ts`) lado a lado com o que as páginas de venda destacam produz um desencontro que vale registrar aqui, na página que descreve o produto:

- O **maior bloco de widgets implementados é corporativo/BI** — Power BI, Airtable, Google Docs, Office Docs, PDF, BrowserSnapshot, EmbedHTML, MarketWatch, RSS.
- O segundo bloco é **gestão de equipe / quadro de gestão à vista** — tarefas, cardápio da semana, notas, contagem regressiva, relógio, clima.
- **Imagem, vídeo e texto** — justamente o que a comunicação de vendas destaca — **não são widgets dedicados**: são primitivos genéricos do editor. Não existe widget de preço, oferta, catálogo ou menu board.

Ou seja: **o esforço de engenharia foi num painel de gestão à vista, enquanto a comunicação vende cartaz digital de varejo.** As implicações comerciais (commodity vs. ticket, aritmética de MRR, e a ressalva de que isto é leitura de código e não de cliente) estão desenvolvidas em [[modelo-comercial-e-precificacao]], seção 2.8 — inclusive a recomendação de validar com 10–15 conversas antes de reposicionar. **A escolha de eixo do produto está em aberto e é do dono.**

Nota relacionada: os widgets de BI estão hoje **liberados em todos os planos**, inclusive no grátis, apesar de a landing anunciá-los como recurso do plano Rede — ver a lacuna de enforcement de feature em [[modelo-comercial-e-precificacao]], seção 1.5.

## Modelo comercial atual (inferido do código)

> **Seção superada — e factualmente desatualizada.** O conteúdo abaixo é de 2026-07-14. Foi superado pela análise de **2026-07-25**, que definiu o modelo comercial, os preços e a posição competitiva do produto: ver [[modelo-comercial-e-precificacao]] e [[concorrentes-e-mercado-signage]]. Mantido como registro histórico, com as correções marcadas.

- ~~Deploy single-tenant (uma instância por cliente) — não há hierarquia de "loja/unidade" dentro do mesmo banco.~~ **Corrigido em 2026-07-25:** o sistema passou a ter **escopo de tenant real aplicado no servidor** (rotas escopadas, `User.organizationId`, middleware de tenant), não mais filtro client-side. Detalhe técnico em [[arquitetura-e-entidades]]; o histórico do erro de leitura ("multi-loja concluído" ≠ "multi-tenancy pronta para vender") está em [[modelo-comercial-e-precificacao]], seção 1.1.
- `Landing.tsx` já existe como página de vendas/marketing separada do produto (planos, FAQ, LGPD/segurança) — indício de intenção de comercialização mais ampla. **Atualização:** hoje ela consome o catálogo de planos decidido no backend; ver [[canais-de-venda-e-landings]].
- **Acréscimo de 2026-07-25:** existe infraestrutura de planos, assinatura e quota (`Plan`, `Subscription`, `enforceQuota`), com cobrança **por tela ativa/mês**. O que não existe é gateway de pagamento — `POST /api/billing/checkout` responde 501.

## Oportunidades de negócio identificadas

1. ~~Evoluir para multi-tenant real (Organização → Lojas → Displays)~~ — **feito em 2026-07-25** (escopo de tenant no servidor). O que resta é o **gate de feature por plano**, que existe como função (`hasFeature`) mas não é chamado em lugar nenhum: ver [[modelo-comercial-e-precificacao]], seção 1.5.
2. Relatórios agregados por loja/região dependem dessa hierarquia — hoje já é possível com a hierarquia entregue.
3. A landing de vendas (`/vendas`) pode se beneficiar diretamente das melhorias de UX descritas em [[oportunidades-ux]] (primeira impressão/conversão) — com a ressalva de que veracidade vem antes de estética.

Ver também: [[arquitetura-e-entidades]] (técnico), [[oportunidades-ux]] (UX), [[modelo-comercial-e-precificacao]] (preços, ticket e modelo de receita), [[concorrentes-e-mercado-signage]] (concorrentes, mercado brasileiro e conformidade), [[canais-de-venda-e-landings]] (superfícies de venda e o que cada uma afirma), [[seguranca-e-conformidade-tecnica]] (o que o gate de feature e o escopo de tenant exigem do servidor).
