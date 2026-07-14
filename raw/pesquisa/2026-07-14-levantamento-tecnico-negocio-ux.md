---
title: Levantamento técnico, de negócio e UX para preencher lacunas da wiki
source: análise direta do código-fonte + 3 vaults de especialistas
type: notes
ingested: 2026-07-14
tags: [levantamento, arquitetura, ux, kanban]
---

# Levantamento — 2026-07-14

Fonte bruta (imutável) que embasa `wiki/tecnico/arquitetura-e-entidades.md`, `wiki/negocio/funcionalidades-produto.md` e `wiki/negocio/oportunidades-ux.md`. Registrada aqui para dar proveniência ao que foi lido/analisado, já que não veio de um único documento externo e sim de uma varredura cruzada.

## Fontes consultadas

1. **Código-fonte do projeto** (`App-Projeto/frontend/`, `App-Projeto/backend/prisma/schema.prisma`, rotas do backend) — leitura direta, sem execução, via agente de exploração.
2. **`Especialistas/4 - Notebooklm - Pesquisador`** — metodologia do subagente `pesquisador-abner` para pesquisa via NotebookLM MCP e injeção de aprendizado em wiki (padrão de pastas `raw/`, `wiki/{concepts,topics,references}/`, `log.md`, `schema.md`).
3. **`Especialistas/1 - Ux - Habilidade`** — checklist de auditoria UX em 7 blocos (Responsividade, Tipografia/Visual, Acessibilidade WCAG/ARIA, Heurísticas de Nielsen/Interação, Performance Percebida, Consistência de Design System, Microcopy), heurísticas de Nielsen, ISO 9241-210, 5 Planos de J.J. Garrett, C.R.A.P., Atomic Design/Design Tokens.
4. **`Especialistas/7 - EngenhariaSoftware`** — convenções de Épico/User Story/Task (formato "Como/quero/para", critérios INVEST, aceite em Gherkin), Kanban e WIP (heurística de Anderson `WIP = pessoas × 2`, Lei de Little, sistema pull), Scrum (papéis, artefatos, cerimônias), estimativa (Story Points/Fibonacci, Planning Poker).

## Achados brutos (resumo por fonte)

### Código-fonte (entidades e telas)
- Modelo Prisma: `User`, `Display` (slug, `pages` JSON, `coverImage`), `Device` (pairing, heartbeat), `Broadcast` (janela de tempo), `Setting`, `PasswordReset`. Sem entidade de Organização/Loja — single-tenant por instância.
- Rotas frontend: `/login`, `/forgot-password`, `/reset-password`, `/vendas` (Landing), `/` (Dashboard), `/edit/:id` (Editor), `/scheduler`, `/player[/:slug]`.
- Editor: grid 48 colunas (`react-grid-layout`), ~20 tipos de widget (imagem, texto, iframe, clima, relógio, vídeo, RSS, calendário, contagem regressiva, Power BI, Airtable, Google Docs, Office Docs, PDF, embed HTML, etc).
- Backend: rotas `auth`, `displays`, `devices`, `broadcasts`, `media`, `settings`, `users`; SSE (`sse.service.ts`) para push ao Player; cache condicional por ETag/versão; upload dual (disco local vs Cloudflare R2).
- Sem `TODO/FIXME` no código — funcionalidades implementadas e fechadas. `PROJECT_MEMORY.md` (removido do git, recuperado via `git show`) confirmava pendências reais: object storage sem R2 obrigatório em produção, ausência de rate limiting/sanitização, deploy manual, `Editor.handleSave` usando `alert()` nativo em vez de toast consistente.

### UX (`1 - Ux - Habilidade`)
- Checklist de 7 blocos usado como lente de auditoria sobre o Editor/Dashboard/Player.
- Achados aplicados: `alert()` nativo quebra consistência (heurística de Nielsen); falta de confirmação antes de publicar cena viola prevenção de erros; falta de empty states piora reconhecimento vs. memorização; modais sem confirmação de foco/teclado (acessibilidade, a validar); falta de loading state consistente (performance percebida); microcopy de erro não segue os "3 I's".

### Engenharia de Software (`7 - EngenhariaSoftware`)
- Template de User Story usado no Kanban: ID, texto "Como/quero/para", critérios de aceite em Gherkin (DADO/QUANDO/ENTÃO), tasks técnicas aninhadas.
- WIP limits definidos por coluna (`Em Análise (3)`, `Em Desenvolvimento (2)`, `Code Review (2)`, `Teste (2)`), heurística de Anderson como ponto de partida.
- DoR/DoD documentados numa lane própria do quadro ("Políticas do Quadro"), incluindo o checklist de UX de 7 blocos como parte do DoD.

### NotebookLM Pesquisador (`4 - Notebooklm - Pesquisador`)
- Metodologia de referência para pesquisas **externas** futuras (via NotebookLM MCP) caso surjam lacunas que não possam ser respondidas só lendo o código deste repositório — não foi necessário usá-la neste ciclo porque os gaps eram observáveis diretamente no código-fonte.

## Para onde isso foi compilado

- `wiki/tecnico/arquitetura-e-entidades.md`
- `wiki/negocio/funcionalidades-produto.md`
- `wiki/negocio/oportunidades-ux.md`
- `Kanban-TelaHub.md` (Epics A–F e User Stories US-001 a US-014 derivados diretamente dos gaps listados acima)
