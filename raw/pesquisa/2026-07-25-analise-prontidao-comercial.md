---
title: Análise de prontidão comercial do TelaHub — código real vs. landing de vendas vs. vault de negócio
source: leitura direta do código-fonte + cruzamento com o vault "8 - Marca De Sucesso"
type: notes
ingested: 2026-07-25
tags: [prontidao-comercial, precificacao, multi-tenant, unit-economics, go-to-market]
---

# Análise de prontidão comercial — 2026-07-25

Fonte bruta (imutável) que embasa `wiki/negocio/modelo-comercial-e-precificacao.md`. Registrada aqui para dar proveniência, já que não veio de um documento externo único e sim de uma varredura cruzada entre o código do projeto, a wiki do próprio projeto e um vault de negócio separado.

## Pergunta que originou a análise

O TelaHub tem maturidade técnica (13+ User Stories concluídas, CI, testes, multi-loja "concluído" no Kanban) e uma landing de vendas com preços em reais publicada. Mas a wiki não tinha nenhuma página sobre **modelo comercial**. A pergunta foi: o produto está de fato pronto para ser cobrado, e com qual modelo?

## Método

1. **Leitura direta do código** (`backend/`, `frontend/`), sem execução — rotas, schema Prisma, componentes de Dashboard e a Landing, procurando por: escopo de tenant nas queries, rota de cadastro, qualquer modelo de plano/assinatura/quota, e correspondência entre o que a landing promete e o que existe implementado.
2. **Leitura da wiki do próprio projeto** (`wiki/index.md`, `wiki/log.md`, `wiki/tecnico/arquitetura-e-entidades.md`, `wiki/negocio/funcionalidades-produto.md`, `wiki/negocio/oportunidades-ux.md`) e do quadro `Kanban-TelaHub.md`, para confrontar o que está declarado como concluído com o que o código realmente faz.
3. **Cruzamento com o vault de negócio** `Especialistas/8 - Marca De Sucesso` (wiki na pasta oculta `.wiki/`, 9 artigos em `.wiki/wiki/topics/` e `.wiki/wiki/references/`). Artigos usados como lente:
   - `.wiki/wiki/topics/precificacao-e-financas.md` — unit economics (CAC fully-loaded, LTV, LTV:CAC 3:1, payback, mediana 18 meses), EVC/value-based pricing, penetração vs. skimming, margem SaaS 70–85%.
   - `.wiki/wiki/topics/fundamentos-empreendedorismo.md` — validação, MVP, smoke test em landing (>3% bom / <0,3% proposta confusa), "do things that don't scale" para os primeiros 50–100 clientes, Sean Ellis Test (≥40%).
   - `.wiki/wiki/topics/marketing-digital-posicionamento-online.md` — growth loops (Balfour/Chen), community-led growth, branded SEO (44% das buscas com intenção de marca).
   - `.wiki/wiki/topics/caminho-ao-sucesso-erros-comuns.md` — escalabilidade prematura (74% de mortalidade), Default Alive/Dead, retenção 5–25x mais barata que aquisição.

## Achados brutos — código

### Isolamento multi-tenant inexistente
- `GET /api/displays` (`backend/src/routes/displays.routes.ts:11`) chamava `displayService.getAll()` — sem nenhum escopo de organização ou de usuário.
- O filtro por organização era **client-side**, em `frontend/components/Dashboard.tsx:278`.
- `User` não tinha `organizationId` no schema Prisma.
- `Device`, `Broadcast`, mídia e o `Setting` de SMTP não tinham escopo de organização.
- Conclusão: o que existia era **agrupamento visual** de displays por loja, não um limite de segurança. Qualquer usuário autenticado enxergava tudo.

### Sem porta de entrada comercial
- Não existia `POST /register`. O único caminho para criar usuário era `POST /api/users/invite`, que exige um admin já logado.
- A landing tinha CTA sem destino funcional.

### Sem infraestrutura de cobrança
- Nenhum modelo de plano, assinatura, ciclo de faturamento ou quota no schema.
- "Até 5 displays" era texto na landing, sem enforcement em nenhuma camada.

### Landing prometendo o que não existe
Promessas encontradas na landing sem contrapartida no código: white label, SSO/SAML/LDAP, 2FA, domínio personalizado, SLA 99,9%, player Android TV nativo, cache offline real.
Havia também depoimento de cliente e selo "MAIS VENDIDO" fabricados, com preço riscado fictício — exposição ao art. 37 do CDC (publicidade enganosa).

## Achados brutos — confronto com a wiki

- `wiki/tecnico/arquitetura-e-entidades.md` (gap #3) declara "~~Multi-loja~~ — modelo `Organization` implementado, com filtro no Dashboard e relatório agregado (US-005/006/017, Concluído)". O Kanban registra o mesmo. Ambos descrevem corretamente o que foi feito (entidade + filtro + relatório), mas o rótulo "concluído" foi lido, na prática, como "multi-tenancy pronta" — o que não era verdade em termos de segurança.
- `wiki/negocio/funcionalidades-produto.md` tem uma seção "Modelo comercial atual (inferido do código)" que descreve deploy single-tenant e a existência da landing, mas nenhuma decisão de preço, plano ou unit economics.

## Lacuna declarada

O vault `8 - Marca De Sucesso` **não tem análise de concorrentes de digital signage**. Os cases dele (Nubank, Duolingo, Gymshark, Sallve, Havaianas) são marcas de consumo usadas para ilustrar mecanismos de crescimento — não competidores do TelaHub. Nenhum preço de mercado do setor foi obtido nesta análise.

Pesquisa deep research em execução no NotebookLM para cobrir essa lacuna:
- Notebook: "Mercado de Digital Signage BR — Concorrentes, Preços e Modelo de Negócio (TelaHub)"
- ID: `720c999a-c1b9-4333-8308-17377bc326da`
- Escopo: concorrentes e preços praticados; mercado brasileiro, gateways de pagamento e exigências legais.

## Para onde isso foi compilado

- `wiki/negocio/modelo-comercial-e-precificacao.md` (página nova)
- `wiki/index.md` (seção Negócio / Produto)
- `wiki/log.md` (entrada de 2026-07-25)
