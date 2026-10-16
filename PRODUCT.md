# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dois perfis com o mesmo peso (confirmado pelo dono em 2026-10-15):

- **Dono ou gerente local.** Cuida de um lugar com 1 a 20 TVs: loja, clínica, condomínio, escritório, academia. Quer trocar o que aparece na tela sozinho, pelo computador ou pelo celular, sem chamar técnico. Normalmente começa no plano Grátis (1 tela) ou Loja.
- **Equipe de rede.** Gerencia muitas telas em várias unidades, com várias pessoas publicando. Precisa de relatório de exibição, trilha de auditoria ("quem publicou isso?") e números de gestão na parede. Normalmente plano Rede (piso de 5 telas).

As telas de operação servem aos dois: quem tem uma TV não pode se sentir num sistema corporativo, e quem tem cinquenta não pode se sentir num brinquedo.

## Product Purpose

TelaHub transforma qualquer TV com navegador num mural digital gerenciado de longe. O cliente monta cenas num editor visual (imagem, vídeo, texto e widgets: relógio, clima, avisos, documentos, Power BI, Airtable, cotações), agenda avisos por data e hora e acompanha se cada tela está no ar.

Sucesso é o cliente ligar a primeira tela sem ajuda no mesmo dia em que se cadastra, e continuar publicando nas semanas seguintes.

## Positioning

Duas coisas juntas, confirmadas pelo dono:

1. **A porta é o autosserviço com preço público.** Preço por tela na página, 1 tela grátis para sempre, sem cobrança retroativa, assina e usa sozinho. Os players brasileiros de sinalização digital são consultivos e não mostram preço.
2. **O que segura o cliente é mural e painel de gestão.** Documento na parede (Loja) e número de gestão na parede (Rede: Power BI, Airtable, cotações, snapshot de página), não só cartaz de oferta.

## Operating Context

- A jornada vive num domínio só (`devtelahub.proxserverabner.site` em teste): landing em `/`, entrar e cadastrar em `/entrar` e `/cadastro`, painel em `/app/`, checkout em `/checkout/`. Quem escolhe plano pago cria a conta, paga já logado e cai no painel.
- O painel é usado em computador de escritório e no celular do gerente, muitas vezes de pé, no próprio local, olhando a TV.
- A TV roda o player (`/app/#/player/:slug`) em tela cheia, de longe, sem interação.
- Pareamento de TV por código curto exibido na tela.
- O dono opera clientes, pagamentos, e-mail e métricas pelo backoffice em `/checkout/admin`.

## Capabilities and Constraints

- Planos: Grátis (1 tela; vídeo só nos 7 primeiros dias), Loja (R$ 49 por tela/mês ou R$ 39 no anual), Rede (R$ 39 por tela/mês ou R$ 32 no anual, mínimo 5 telas), Enterprise sob contrato. A lista canônica vive em `apps/api/prisma/seed-plans.ts`.
- Loja destrava relatórios de exibição, documentos na tela (PDF, Google Docs, Office) e aviso agendado. Rede destrava o painel de gestão e a trilha de auditoria.
- White label, SSO, SLA, API externa e multi-organização self-service **não existem**. Não podem ser prometidos.
- Pagamento está em modo simulado nesta fase; o Asaas está pronto e liga por variável de ambiente.
- Produto horizontal: condomínio, empresa, loja, clínica e academia são casos com o mesmo peso. Comida é um caso entre muitos, nunca o centro.

## Brand Commitments

- Nome: **TelaHub**. Logo: a grade de quatro telas ligadas a um centro (`packages/marca/logo.svg`).
- Uma identidade em todas as etapas, da landing ao painel, mantida em `packages/marca/`. Cor da marca fixa, sem escolha de cor pelo usuário (decisão do dono em 2026-10-15).
- Voz: português do Brasil direto, de quem explica a um gerente ocupado. Sem travessão e sem frases de efeito.
- Tudo o que a página afirma tem de ser verdade no código no dia em que é publicado.

## Evidence on Hand

Nenhuma prova social ainda (confirmado em 2026-10-15): sem clientes, depoimentos, logos, número de telas, uptime ou nota. Nenhuma tela pode inventar qualquer um deles, nem "mais vendido", "mais escolhido", preço riscado ou contador de oferta. A lista completa do que é proibido está em `wiki/negocio/canais-de-venda-e-landings.md` §7 e é checada por `scripts/verificar-claims-proibidos.mjs`.

Material real disponível: o próprio produto (editor, player, widgets), capturas de tela dele e os preços públicos.

## Product Principles

1. **Primeira tela no ar no mesmo dia.** Cada passo entre o cadastro e a TV ligada é custo; corte antes de enfeitar.
2. **Um produto, não quatro.** Quem passa da landing ao cadastro, ao checkout e ao painel tem de sentir que nunca saiu do lugar.
3. **Verdade antes de venda.** Nada é anunciado antes de existir no código, e o degrau de plano mostra o que destrava, sem cadeado escondido.
4. **Serve a uma TV e a cinquenta.** Toda tela de operação funciona para o gerente sozinho e para a equipe de rede.
5. **A TV é vista de longe.** O que vai para a parede tem de ser legível a metros e funcionar sem ninguém por perto.

## Accessibility & Inclusion

WCAG 2.1 AA: texto com contraste de 4,5:1 ou mais, componente de 3:1 ou mais (pares medidos em `packages/marca/tokens.css`). No celular, alvo de toque de 44px ou mais e corpo de 16px ou mais. Conferir em 360, 390, 768, 1024, 1280 e 1440 de largura. Movimento respeita `prefers-reduced-motion`.
