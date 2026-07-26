---
tipo: indice
atualizado: 2026-07-25
---

# Índice — Wiki TelaHub / Display de Vendas

Catálogo das páginas mantidas em `wiki/`. Atualizado a cada fonte processada.

## Por onde começar

- Quer entender **o que o sistema é hoje** → [[arquitetura-e-entidades]]
- Vai mexer em **preço, plano ou oferta** → [[modelo-comercial-e-precificacao]]
- Vai mexer em **texto de página de vendas** → [[canais-de-venda-e-landings]] (leia antes de escrever: há uma lista do que não pode ser prometido)
- Vai mexer em **autenticação, upload, CORS ou escopo de dados** → [[seguranca-e-conformidade-tecnica]]
- Quer saber **contra quem competimos e a que preço** → [[concorrentes-e-mercado-signage]]

## Técnico

- [[arquitetura-e-entidades]] — modelo de domínio (Prisma), escopo de tenant no servidor, rotas e serviços, cadeia de middlewares, sequência de boot do deploy, build/CI, e a correção de registro sobre multi-loja ("concluído no quadro" não significava fronteira de segurança).
- [[seguranca-e-conformidade-tecnica]] — as classes de falha que já aconteceram neste projeto e como foram fechadas: vazamento entre clientes, `JWT_SECRET` com fallback público, rate limit inútil atrás do proxy, upload sem validação de tipo, path traversal, enumeração de slug, SMTP editável por cliente, CI que não testava o que dizia testar. Página antirreincidência — leia antes de mexer nesses pontos.

## Negócio / Produto

- [[funcionalidades-produto]] — proposta de valor, inventário de widgets e a leitura de que produto isso é de fato.
- [[modelo-comercial-e-precificacao]] — diagnóstico de prontidão comercial, modelo escolhido (por tela ativa, valor em vez de penetração), preços decididos em 2026-07-25 (1 tela grátis para sempre, Loja R$ 49/tela, Rede R$ 39/tela com piso de 5, Enterprise sob consulta), política anti-cobrança-retroativa e seu limite exato, unit economics estimado, growth loop, e as decisões em aberto (eixo do produto, vertical de foco, gateway).
- [[concorrentes-e-mercado-signage]] — 9 concorrentes globais com preço/plano grátis/trial/white label/hardware, 6 players brasileiros (todos consultivos e sem preço público — a brecha), os 4 grupos de atrito que causam churn no setor, mercado brasileiro (USD 248,4 M em 2026, CAGR 5,5%), 8 verticais com ticket aceito e quem decide, ISS/NFS-e + CDC + LGPD, 5 gateways comparados e 5 táticas de go-to-market orgânico.
- [[canais-de-venda-e-landings]] — mapa dos **dois** canais de venda (a rota `/vendas` do app e o projeto separado `Site/site-telas`), o que está publicado onde, o histórico de conformidade com o CDC, e a lista de claims que não podem voltar.
- [[oportunidades-ux]] — auditoria de UX (heurísticas de Nielsen, acessibilidade, microcopy) aplicada ao produto e ao próprio quadro Kanban.

## Entidades

*(vazio — pessoas, empresas, ferramentas relevantes)*

## Planejamento

- [[Kanban-TelaHub]] — quadro do projeto (Epics, User Stories, Tasks, limites de WIP e políticas).

## Fontes brutas

Em `raw/pesquisa/`: o levantamento técnico/negócio/UX de 2026-07-14, a análise de prontidão comercial de 2026-07-25, e as duas deep researches de 2026-07-25 (concorrentes de digital signage; mercado brasileiro, gateways e exigências legais).

## Ver também

- [[log]] — histórico cronológico de tudo que foi processado
