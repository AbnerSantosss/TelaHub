---
tipo: negocio
atualizado: 2026-07-14
tags: [ux, heuristicas, nielsen, acessibilidade]
sources: [raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md]
---

# Oportunidades de UX — TelaHub

Aplicação do checklist de auditoria UX (7 blocos: Responsividade, Tipografia/Visual, Acessibilidade, Heurísticas/Interação, Performance Percebida, Consistência de Design System, Microcopy) do vault `1 - Ux - Habilidade` ao código real do TelaHub.

## Achados por bloco

**Heurísticas de Nielsen / Interação**
- `Editor.handleSave` usa `alert('Erro ao salvar.')` nativo, enquanto o resto do app usa toast (`sonner`) — quebra a heurística de **consistência e padrões** e dá feedback pior de **visibilidade do status do sistema**. → US-007.
- Publicar uma cena no Editor não tem confirmação prévia — viola **prevenção de erros** (deveria haver um passo de confirmação/preview antes de sobrescrever o que já está no ar). → US-010.
- Dashboard/Editor sem estados vazios tratados (ex.: "nenhuma tela cadastrada ainda") pioram **reconhecimento em vez de memorização** para usuários novos. → US-008.

**Acessibilidade (WCAG/ARIA)**
- Modais do Dashboard e Editor (criar display, pairing, gerenciar usuários, camadas) precisam de verificação de foco/teclado (trap de foco, `Esc` para fechar, ordem de tab) — não confirmado no código, tratar como risco a validar. → US-009.

**Performance percebida**
- Player e Editor carregam layouts complexos (grid 48 colunas, muitos widgets) sem indicação clara de loading state em todos os pontos — candidato a skeleton/spinner consistente.

**Microcopy**
- Mensagens de erro genéricas (`'Erro ao salvar.'`) não seguem o princípio dos "3 I's" (Informativo, claro, sem culpar o usuário) recomendado no material de UX Writing — deveriam indicar causa/próxima ação.

## Como aplicar continuamente

Sempre que uma nova tela/fluxo for desenvolvida, rodar o checklist de 7 blocos do especialista de UX antes de considerar a tarefa "pronta" — isso deveria compor a Definition of Done (ver Kanban, EPIC D).

Ver também: [[funcionalidades-produto]], [[arquitetura-e-entidades]].
