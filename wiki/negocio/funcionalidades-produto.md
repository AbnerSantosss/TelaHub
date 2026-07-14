---
tipo: negocio
atualizado: 2026-07-14
tags: [produto, funcionalidades]
sources: [raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md]
---

# Funcionalidades do Produto — TelaHub (Display de Vendas)

TelaHub é um sistema de gestão de telas/displays digitais (digital signage) para pontos de venda: um editor visual monta "cenas" que rodam em TVs/kiosks físicos, combinando widgets de produtividade (relógio, clima, notas, cardápio) com conteúdo corporativo embutido (Power BI, Airtable, Google Docs, Office 365, PDF).

## Proposta de valor por widget

- **Informativo/ambiente**: relógio, clima, calendário, contagem regressiva, RSS — mantém a tela "viva" mesmo sem conteúdo de vendas ativo.
- **Produtividade interna**: notas, to-do, cardápio semanal, tarefas domésticas — uso também para telas internas de equipe, não só vitrine para cliente.
- **Corporativo/BI**: Power BI, Airtable, Google Docs, Office Docs, PDF, embed HTML genérico — permite exibir relatórios e documentos vivos sem trabalho manual de atualização.
- **Broadcasts** (Scheduler) — anúncios/promoções agendados que sobrescrevem temporariamente o conteúdo normal de um conjunto de displays, útil para campanhas com janela de tempo definida (ex.: liquidação de fim de semana).

## Modelo comercial atual (inferido do código)

- Deploy single-tenant (uma instância por cliente) — não há hierarquia de "loja/unidade" dentro do mesmo banco, o que limita oferecer o produto como SaaS multi-cliente centralizado sem replicar infraestrutura por cliente.
- `Landing.tsx` já existe como página de vendas/marketing separada do produto (planos, FAQ, LGPD/segurança) — indício de intenção de comercialização mais ampla.

## Oportunidades de negócio identificadas

1. Evoluir para multi-tenant real (Organização → Lojas → Displays) reduziria custo operacional por cliente novo — ver [[arquitetura-e-entidades]] gap #3.
2. Relatórios agregados por loja/região dependem dessa hierarquia — hoje só é possível analisar display a display.
3. A landing de vendas (`/vendas`) pode se beneficiar diretamente das melhorias de UX descritas em [[oportunidades-ux]] (primeira impressão/conversão).

Ver também: [[arquitetura-e-entidades]] (técnico), [[oportunidades-ux]] (UX).
