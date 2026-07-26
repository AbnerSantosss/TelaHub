---
tipo: negocio
atualizado: 2026-07-25
tags: [ux, heuristicas, nielsen, acessibilidade, kanban, processo, conformidade]
sources:
  - raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md
  - raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md
---

# Oportunidades de UX — TelaHub

Aplicação do checklist de auditoria UX (7 blocos: Responsividade, Tipografia/Visual, Acessibilidade, Heurísticas/Interação, Performance Percebida, Consistência de Design System, Microcopy) do vault `1 - Ux - Habilidade` ao código real do TelaHub.

## Achados por bloco (produto) — status

**Heurísticas de Nielsen / Interação**
- ✅ `Editor.handleSave` usava `alert('Erro ao salvar.')` nativo — quebrava consistência e visibilidade do status do sistema. → US-007, **concluído**.
- ✅ Publicar cena sem confirmação prévia — violava prevenção de erros. → US-010, **concluído**.
- ✅ Dashboard/Editor sem estados vazios tratados. → US-008, **concluído**.

**Acessibilidade (WCAG/ARIA)**
- ✅ Modais do Dashboard e Editor auditados quanto a foco/teclado; 5 modais "brutos" corrigidos (`useModalA11y.ts`). → US-009, **concluído com dívida técnica aceita** (validação com leitor de tela físico/NVDA não executável remotamente — ver [[Kanban-TelaHub]]).

**Performance percebida**
- ✅ Skeleton/loading consistente aplicado aos 6 widgets com iframe de rede. → US-016, **concluído**.

**Microcopy**
- ✅ Mensagens de erro migradas para toast seguindo os "3 I's" (informativo, claro, sem culpar o usuário). → US-007, **concluído**.

## Auditoria de UX aplicada ao processo — o próprio quadro Kanban (2026-07-21)

Além do produto, o checklist de UX também foi aplicado ao **quadro Kanban do projeto** (`Kanban-TelaHub.md`) tratando-o como um artefato de informação que o time lê e usa diariamente — não só o código do produto final. Achados e correções aplicadas:

- **Heurística 1 (visibilidade do estado)** — US-009 estava marcada `[x]`/Concluído com uma sub-task ainda aberta, escondendo uma dívida técnica real. Corrigido: nota explícita de dívida aceita, sem checkbox pendente.
- **Heurística 2 (correspondência com o mundo real)** — checkboxes `[ ]` na seção de Políticas do Quadro (WIP, DoR, DoD) sugeriam "tarefa a fazer" quando eram regras permanentes. Corrigido: viraram lista simples.
- **Heurística 6 (reconhecimento vs. memorização)** — emojis (⚠️/📌/ℹ️) sem legenda, e falta de contagem nas colunas "Concluído"/"Em Análise". Corrigido: legenda adicionada + contagens explícitas + marcador único 🚧 para bloqueio manual.
- **C.R.A.P. / hierarquia tipográfica** — critérios Gherkin (DADO/QUANDO/ENTÃO) sem contraste visual dentro do card. Corrigido: palavras-chave em negrito.
- **Consistência de design system aplicada a conteúdo** — tags `#epic/*` sem cor e no fim do card, dificultando escaneabilidade por categoria. Corrigido: 6 cores por épico (`tag-colors` nativo do plugin Kanban) e tags movidas para o início de cada card.
- **Microcopy** — frase ambígua "não automatizável por aqui" (dêitico sem contexto) repetida em 4 cards. Corrigido: texto padronizado "🚧 Bloqueado: requer acesso manual a [recurso] — não pode ser concluído remotamente."

### Lacunas que permanecem em aberto (não aplicadas — exigem decisão de negócio, não são só UX/execução)

- **Estimativa por User Story** (P/M/G ou story points) — a própria Definition of Ready do Kanban exige item "estimável (INVEST)", mas nenhuma US tem estimativa registrada hoje. Sem isso, o critério de DoR não é auditável objetivamente.
- **Priorização MoSCoW dos épicos do Backlog** — os 6 épicos estão listados sem ordem de prioridade declarada; decidir "o que puxar a seguir" quando abre espaço em "Em Análise" depende de julgamento ad-hoc.
- **WIP estruturalmente travado** (achado de Engenharia de Software, não de UX) — a coluna "Em Análise" está no limite (3/3) inteiramente com itens bloqueados por dependência externa (VPS/Portainer/homologação real), não por falta de fluxo. Ver política de WIP em [[Kanban-TelaHub]].

## Como aplicar continuamente

Sempre que uma nova tela/fluxo for desenvolvida, rodar o checklist de 7 blocos do especialista de UX antes de considerar a tarefa "pronta" — isso já compõe a Definition of Done do quadro (ver [[Kanban-TelaHub]]). O mesmo checklist deveria ser reaplicado ao próprio quadro Kanban periodicamente, não só ao produto.

## Nota de 2026-07-25 — a auditoria de UX ganhou um par de conformidade

A partir do ciclo comercial de 2026-07-25, a auditoria de UX passa a ter um par obrigatório: além de **usável**, a comunicação precisa ser **verdadeira**. Uma landing impecável em heurísticas, tipografia e microcopy que promete recurso inexistente não é um problema de UX — é exposição aos **arts. 30 e 37 do CDC** (oferta que vincula o fornecedor; publicidade enganosa). Na prática: antes de rodar o checklist de 7 blocos numa página de venda, checar se cada afirmação dela tem contrapartida no código. Ver [[modelo-comercial-e-precificacao]] (seção 1.4) e [[canais-de-venda-e-landings]].

Ver também: [[funcionalidades-produto]], [[arquitetura-e-entidades]], [[Kanban-TelaHub]], [[modelo-comercial-e-precificacao]] (preço, ticket e o que a landing pode afirmar), [[concorrentes-e-mercado-signage]] (referência de mercado e os atritos que causam churn no setor), [[canais-de-venda-e-landings]] (as superfícies de venda auditadas).
