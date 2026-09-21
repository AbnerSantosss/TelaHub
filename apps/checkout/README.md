# TelaHub — Checkout

Checkout de contratação e painel do funil de vendas. Vive em `apps/checkout` do
monorepo, e é **publicado de forma independente** do painel e do site de vendas.

- `/c` e `/c/:token` — checkout do comprador, anônimo
- `/admin` — painel do funil (checkouts iniciados, abandono, contratações)

## Como isso se encaixa nos quatro apps

| App | Pasta | O que é | Backend |
|---|---|---|---|
| Site de vendas | `apps/site` | landing pública (SSR) | nenhum |
| **Checkout** | **`apps/checkout`** | contratação + funil | consome a API |
| Painel | `apps/painel` | produto (SPA) | consome a API |
| API | `apps/api` | domínio + banco | é o dono |

Um repositório, **quatro deploys separados**. O que eles compartilham é a API —
e agora também o histórico e o CI. Ver ADR-002.

## Decisão de arquitetura (ADR-001)

**Status:** aceito · **Data:** 2026-07-25

### Contexto
Os três apps precisam ser publicáveis de forma independente, e o checkout
precisa avisar o painel quando algo acontece (contratação concluída, abandono).
A operação é de uma pessoa, numa VPS única com Portainer, sem staging.

### Decisão
1. **Frontends separados, backend único.** O backend do App segue dono do
   domínio, porque plano, assinatura e organização vivem lá. O checkout não tem
   banco próprio.
2. **Comunicação por eventos, no padrão outbox** — não por chamada direta. O
   checkout **grava** o evento (`CheckoutEvent`) na mesma transação da mudança
   de estado; um despachante interno entrega aos tratadores do domínio.

### Alternativas consideradas
- **Serviço autônomo com banco próprio + webhooks** — separação máxima, mas
  traz consistência eventual e dois bancos para reconciliar. O vault de
  Engenharia de Software classifica microserviços como complexidade operacional
  *"Muito Alta"* e diz que são *"difíceis de justificar em sistemas pequenos"*.
- **Broker de mensagens (RabbitMQ/Kafka)** — desacoplamento máximo, mas é mais
  um serviço para operar e depurar na VPS, com complexidade *"Alta"* pela mesma
  fonte. O ganho não se paga com um operador só e zero cliente pagante.
- **Chamada direta e síncrona** — mais simples, mas faria o checkout conhecer
  tudo o que acontece depois da contratação; cada regra nova de pós-venda
  passaria a mexer no checkout.

### Consequências
- (+) Publicação independente dos três apps
- (+) Somar um consumidor novo (e-mail, provisionamento, auditoria) não mexe em
  quem produz o evento
- (+) Evento gravado em transação não se perde por falha de rede
- (−) Entrega assíncrona: o efeito não é imediato após o clique
- (−) Rastrear o fluxo completo exige log de correlação — é a fraqueza conhecida
  de arquitetura orientada a eventos, e por isso o despachante registra
  id/tipo/tratador/resultado a cada processamento
- (−) Backend único segue sendo ponto único de falha

Fonte: `Especialistas/7 - EngenhariaSoftware/wiki/design/estilos-arquiteturais.md`
e `design-arquitetural.md` (Sommerville, cap. 6).

---

## Decisão de arquitetura (ADR-002) — repositório único, deploys separados

**Status:** aceito · **Data:** 2026-07-31 · **Revisa parcialmente:** ADR-001

### Contexto

O ADR-001 decidiu "frontends separados, backend único" e, na prática, isso foi
implementado como **três repositórios git separados** (`TelaHub`,
`TelaHub-Checkout`, `site-telas`). Essas são duas decisões diferentes que foram
tomadas como se fossem uma só, e a segunda não foi examinada.

O custo apareceu:

1. Uma correção de conformidade foi aplicada **na landing errada** — o trabalho
   foi feito e revisado antes de alguém notar que o texto reclamado estava no
   outro repositório (registrado em `wiki/negocio/canais-de-venda-e-landings`).
2. A tabela de preços do site tinha **os números escritos à mão**, enquanto o
   preço cobrado vinha de `GET /api/plans`. Duas fontes de verdade para o mesmo
   número, em repositórios que não compartilhavam nem CI nem PR. Preço anunciado
   vincula o contrato (CDC art. 30) e divergir dele é publicidade enganosa
   (art. 37): a duplicata era exposição jurídica, não preferência de estilo.
3. Mudança que atravessa dois apps (rota nova na API + consumo no checkout)
   exigia dois PRs sem relação entre si, sem forma de revisar o conjunto.

### Decisão

**Um repositório, quatro deploys.** Os apps passam a viver em `apps/api`,
`apps/painel`, `apps/checkout` e `apps/site` do repositório `TelaHub`. Nada muda
na topologia de publicação: seguem sendo imagens distintas no GHCR, stacks
distintas no Portainer, domínios distintos.

O histórico dos dois repositórios importados foi preservado via `git subtree`
(10 commits do checkout, 36 do site).

### Alternativas consideradas

- **Manter três repositórios e sincronizar preço por script** — resolveria o
  item 2, mas não o 1 nem o 3, e acrescentaria um mecanismo a manter.
- **Unificar também os builds** (uma aplicação só, com a landing como rota do
  painel) — foi o que existia até 2026-07-25 e foi desfeito por bons motivos: o
  site é pré-renderizado porque é ele que ranqueia, e o painel é uma SPA pesada
  (editor de cenas, player, gráficos). Servir os dois do mesmo bundle faria o
  visitante da landing baixar o editor e destruiria o SEO que o SSR existe para
  ganhar.
- **npm workspaces** com `node_modules` içado para a raiz — quebraria a
  resolução do engine do Prisma e o `npm ci` de dentro de cada Dockerfile, que
  copia só a pasta do seu app. Cada app segue com lockfile próprio.

### Consequências

- (+) PR atômico para mudança que atravessa apps; um CI só
- (+) "Onde fica a landing do TelaHub?" passa a ter uma resposta só
- (+) Preço com fonte única (`apps/site/scripts/fetch-plans.mjs`)
- (−) O CI precisa de **filtro por pasta**: sem ele, uma vírgula na copy do site
  recriaria os containers da API em produção. Está em `build-and-push.yml`
- (−) `git log -- apps/checkout` não mostra os commits importados sem
  `--full-history`; eles estão no segundo pai do commit de importação
- (−) A troca exige repontar cada stack do Portainer para o repositório novo —
  ver `DEPLOY.md`

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:3030
```

O Vite faz proxy de `/api` para o backend do App, que **precisa estar rodando**.
O alvo padrão é `http://localhost:3002`, que é a `PORT` do `.env` do backend.
Se o seu backend estiver em outra porta:

```bash
BACKEND_PORT=3001 npm run dev      # ou BACKEND_URL=http://localhost:3001
```

> Este proxy apontava para `3001` fixo enquanto o backend usava `3002`. Quando
> a 3001 está ocupada por outro dev server, o proxy acha a SPA errada e devolve
> HTML com status 200 no lugar do JSON — e o checkout falha com *"este link não
> existe mais"*, mensagem que não tem relação com a causa. Se vir esse erro,
> confira a porta antes de procurar bug no código.

A origem `http://localhost:3030` precisa estar em `CORS_ORIGINS` no `.env` do
backend — a validação de origem é por igualdade, não por prefixo.

```bash
npm run lint    # tsc --noEmit
npm run build
```

## Publicação

Stack própria no Portainer, na porta `42939`. Dois pontos que quebram se
esquecidos:

1. **Rede Docker compartilhada.** O Nginx faz proxy de `/api` para o serviço
   `backend`, que vive na stack do App. Sem rede em comum, o nome não resolve —
   ver `networks` no `docker-compose.yml` e confirmar o nome real com
   `docker network ls`.
2. **CORS.** O domínio público do checkout precisa entrar em `CORS_ORIGINS` no
   backend. Sem isso, toda chamada falha com erro de origem.

## Design

`DESIGN.md` traz o sistema de design e a justificativa de cada escolha, incluindo
o que foi deliberadamente **não** copiado das referências: contador de oferta e
depoimentos fabricados. Leia antes de mexer na interface.
