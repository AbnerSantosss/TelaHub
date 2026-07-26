---
tipo: negocio
atualizado: 2026-07-25
tags: [landing, copy, conformidade, cdc, lgpd, seo, go-to-market, canais, processo]
sources:
  - raw/pesquisa/2026-07-25-analise-prontidao-comercial.md
  - raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md
  - raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md
---

# Canais de Venda e Landings — TelaHub

**Leia isto antes de mexer em qualquer texto de venda do TelaHub.**

Existem **duas** páginas de venda do produto, em **dois repositórios diferentes**, e até 2026-07-25 a wiki não registrava isso em lugar nenhum. A consequência não foi teórica: nesta mesma sessão, uma correção de conformidade foi aplicada **na landing errada primeiro** — o trabalho foi feito, revisado e só depois se descobriu que o texto reclamado estava no outro projeto. Esta página existe para que isso não se repita.

O que ela responde:

1. Quais são os dois canais e onde cada um vive.
2. O que foi removido de cada um por risco jurídico, e por quê.
3. **A lição de processo** — a parte mais valiosa aqui: os claims falsos voltaram sozinhos, duas vezes.
4. Como o preço do site externo foi alinhado ao catálogo real do backend.
5. As pendências abertas, cada uma com o risco concreto.
6. A regra de persuasão adotada: gatilho só entra se o fato existir hoje.

---

## 1. Os dois canais

### 1.1 Landing interna — `/vendas`, dentro do próprio app

- **Arquivo:** `App-Projeto/frontend/components/Landing.tsx` (arquivo único, ~880 linhas).
- **Rota:** `/vendas`, registrada em `App-Projeto/frontend/App.tsx` (`<Route path="/vendas" element={<Landing />} />`, carregada via `React.lazy`).
- **Stack:** React + TypeScript + Tailwind, dentro do mesmo bundle do produto. Não tem SEO próprio, não tem SSR, não captura lead — o CTA aponta direto para `/signup`.
- **Configuração comercial concentrada no topo do arquivo**: as constantes `PRECOS`, `OFERTA_GRATIS`, `ANCORA_MERCADO`, `EMAIL_VENDAS` e o array `PLANOS`. Para mudar preço ou oferta, mexe-se ali e não no JSX.

### 1.2 Site externo — `Site/site-telas/`

- **Projeto separado, com repositório git próprio** (`Site/site-telas/.git`). Não é submódulo do `App-Projeto`, não compartilha CI, não compartilha histórico. É o erro clássico: quem procura "a landing do TelaHub" no repositório do app encontra `Landing.tsx` e conclui que é a única.
- **Stack:** React + Vite com **SSR e pré-renderização** (`npm run build` = `vite build` + `vite build --ssr src/entry-server.jsx` + `node scripts/prerender.mjs`), servido por **nginx** em container (`docker-compose.yml`, `frontend/nginx.conf`, porta host `42938`).
- **SEO/AEO/GEO montado**: `public/llms.txt`, `public/robots.txt` (libera explicitamente GPTBot, ClaudeBot, OAI-SearchBot, PerplexityBot, Google-Extended), `public/sitemap.xml`, `public/manifest.webmanifest`, JSON-LD `@graph` (Organization + SoftwareApplication + WebPage) em `index.html`.
- **Captura de lead**: `src/components/LeadModal.jsx`.
- **Rastreamento de campanha**: `src/lib/tracking.js` (dataLayer/GTM + Consent Mode v2 negado por padrão) e `src/components/ConsentBanner.jsx`.
- **Componentes de copy que importam:** `Hero.jsx`, `Pricing.jsx` (o maior — planos + ancoragem + FAQ), `BentoFeatures.jsx`, `CtaStrip.jsx`, `UseCases.jsx`, `Footer.jsx`, `LeadModal.jsx`, `DashboardMockup.jsx`.

### 1.3 Os dois estão publicados, e não há staging

Ambos rodam na **VPS do dono** (Proxmox + Portainer), expostos via **Cloudflare Tunnel**, com deploy a partir do GitHub. Ver `App-Projeto/DEPLOY.md`, que é explícito: *"Não há ambiente de staging provisionado hoje — todo push em `main` vai, no próximo pull do Portainer, direto para o que os usuários acessam via Cloudflare Tunnel."*

**Registrar isso é o ponto.** Erro de copy aqui não fica esperando numa fila de homologação: vai ao ar no próximo pull. É por isso que a seção 3 desta página trata verificação como parte obrigatória do trabalho, não como zelo extra.

O staging separado é pendência declarada em `DEPLOY.md` — exige provisionar stack/container novo na VPS e subdomínio próprio no Tunnel, o que depende de acesso manual.

---

## 2. Histórico de conformidade — o que saiu e por quê

### 2.1 O eixo jurídico

**Arts. 30 e 37 do CDC.** O art. 30 faz a oferta e a publicidade **vincularem o contrato**: o que se anuncia passa a ser obrigação. O art. 37 tipifica a publicidade enganosa. Somados: **funcionalidade anunciada e inexistente é propaganda enganosa com dever de reembolso** — não é "marketing agressivo", é exposição a pedido de devolução e a sanção administrativa.

Isso vale mesmo sendo B2B. Os tribunais brasileiros estendem o CDC a micro e pequenas empresas quando há **hipossuficiência técnica** — exatamente o perfil do comprador do TelaHub, o dono de loja que não tem TI. Base em [[concorrentes-e-mercado-signage]].

Corolário prático que ficou escrito no topo do `Landing.tsx`: *"Só afirmar o que o produto faz HOJE."*

### 2.2 Removido da landing interna (`Landing.tsx`)

Métricas e prova social fabricadas:

- Faixa com **"+500 empresas"**, **"12.400+ displays"**, **"99,9% uptime"**, **"4.9 de 5 · +200 avaliações"**.
- Badge **"Nº1 do Brasil"**.
- **Três depoimentos de clientes inexistentes**, com resultados inventados.
- Selo **"MAIS VENDIDO"**.

Escassez e urgência fabricadas:

- **Contador de oferta que reiniciava à meia-noite** (urgência falsa por construção).
- **"12 vagas restantes"**.
- **"primeiros 100 clientes"**.

Preço:

- **Preço riscado sem preço anterior praticado** — âncora falsa.

Funcionalidades inexistentes: **white label, SSO/SAML/LDAP, 2FA, domínio personalizado, SLA, player Android TV nativo, cache offline real, Google Data Studio** e widgets que não existem.

**O que entrou no lugar** (e é o padrão a seguir):

- A faixa de métricas de vaidade virou `CapabilitiesStrip` — quatro **capacidades verificáveis**: heartbeat por tela, alerta por e-mail, publicação em tempo real via SSE, pareamento por código.
- Os depoimentos viraram a seção **"Programa piloto aberto"**, que diz literalmente que não há depoimento, nota nem número de empresas — *"e não vamos inventar nenhum dos três"*.
- White label, SSO e 2FA continuam no card **Enterprise**, mas rotulados **"sob escopo de projeto"**, com nota de rodapé explicando que não estão disponíveis hoje na plataforma. É a única forma honesta de manter esses itens numa página de vendas.
- O mockup do painel leva a legenda *"Ilustração da interface com dados de exemplo."*

### 2.3 Removido do site externo (`Site/site-telas/`)

- **"Mais de 200 empresas"** — no badge da Hero.
- **"Mais Escolhido"** — o selo superlativo do card do plano Rede, substituído por **"Recomendado"** (escolha editorial declarada é legítima; superlativo de venda sem base não é).
- **SLA em dois planos** — hoje só sobrevive no Enterprise como *"SLA e gerente dedicado — definidos em contrato"*.
- **"White Label completo"** como recurso pronto — virou *"Marca própria no painel — sob escopo de projeto"*.
- **"Cache offline failsafe inteligente"** como item de plano.
- **O FAQ que afirmava que as mídias eram baixadas para a memória do display** e que a programação continuava rodando na queda de internet. Substituído pelo comportamento real (cache por versão/ETag; se o aparelho reiniciar sem internet, não carrega).
- **"14 dias de teste"** no `LeadModal` (o trial de 14 dias foi descontinuado no backend — ver `LEGACY_TRIAL_PLAN_CODE` em `seed-plans.ts`). ⚠️ **Esta remoção está incompleta** — ver seção 5.1.
- **Menções a offline na `meta description` e no JSON-LD** de `index.html`. ⚠️ **O `llms.txt` ficou de fora** — ver seção 5.1.

---

## 3. A lição de processo — leia esta seção antes das outras

**Os claims falsos foram reintroduzidos duas vezes**, por agentes trabalhando sem supervisão, depois de já terem sido removidos:

1. O bullet **"cache offline failsafe"** voltou ao plano Grátis — enquanto o **FAQ da própria página**, algumas centenas de linhas abaixo, declarava que persistência offline não existe. A página passou a se contradizer sozinha, que é precisamente a configuração que os arts. 30 e 37 do CDC transformam em publicidade enganosa: o bullet vincula, o FAQ prova que o bullet é falso.
2. O selo **"Mais Escolhido"** voltou ao card do plano Rede.

Três conclusões operacionais, todas com custo já pago:

**(a) Correção de conformidade em copy exige verificação no artefato construído, não só no fonte.** `grep` no `src/` não é suficiente: o que o visitante lê é o que está em `dist/`. Concretamente, `Site/site-telas/frontend/dist/` é gerado com pré-renderização e **copia `public/` inteiro** — um arquivo esquecido em `public/` (foi o caso do `llms.txt`) atravessa todas as revisões de componente sem aparecer. O comando mínimo antes de considerar a correção feita:

```bash
cd Site/site-telas/frontend && npm run build
grep -rn "offline\|failsafe\|Mais Escolhido\|14 Dias\|Starter\|Business" dist/
```

**(b) Correção de conformidade não pode ser delegada sem checagem posterior.** A delegação em si não é o problema; entregar sem reler o resultado é. Um agente que "remove o claim" e reporta sucesso pode ter removido de um dos três lugares onde o claim aparece.

**(c) O padrão adotado foi deixar comentário no código em cada ponto sensível**, explicando **por que aquele texto não pode voltar**. Não é documentação decorativa: é a única barreira que sobrevive ao próximo agente que abrir o arquivo sem ler esta wiki. Exemplos vivos:

- `Pricing.jsx`, no plano Grátis: *"NÃO escrever 'cache offline failsafe' aqui: não existe persistência offline (só cache por versão/ETag), e o FAQ desta mesma página declara isso. Bullet e FAQ se contradizendo é exatamente o que os arts. 30 e 37 do CDC transformam em publicidade enganosa."*
- `Pricing.jsx`, no plano Rede: *"'Mais Escolhido' não pode voltar: não há base de clientes para sustentar superlativo de venda. 'Recomendado' é escolha editorial nossa, e isso é legítimo dizer."*
- `Hero.jsx`: *"'Mais de 200 empresas' foi removido: número não verificado."*
- `Landing.tsx`, no cabeçalho: a lista **"REGRAS DESTA PÁGINA (não quebrar)"**, com o item 3 enumerando o que é proibido — depoimento inventado, nota/avaliação, contagem de clientes, selo "mais vendido", preço riscado, contador de oferta, "vagas restantes", "primeiros N clientes", estatística sem fonte.

**Regra derivada:** ao mexer em copy, ler os comentários do arquivo **antes** de editar. Se um texto que você quer escrever tem um comentário proibindo-o, o comentário ganha. Se você acha que o comentário está errado, o caminho é mudar o produto ou esta página da wiki — não o comentário.

---

## 4. Alinhamento de preço do site externo

### 4.1 O que estava errado

O `Site/site-telas/` vendia **pacote fixo**: R$ 69 até 2 telas, R$ 149 até 6 telas. O produto cobra **por tela ativa**.

Não havia decisão comercial a tomar aqui — e é importante registrar isso, porque a tentação era tratar como "conflito entre marketing e produto". O comentário no topo de `App-Projeto/backend/prisma/seed-plans.ts` já dizia que por tela ativa era o modelo intencional, com a razão técnica junto: `maxDevices` é `null` (ilimitado) nos planos pagos **de propósito**, porque *"o que limita a expansão é a fatura, não uma trava artificial no software"*. A página estava simplesmente **desatualizada** em relação à fonte de verdade.

### 4.2 Onde fica a fonte de verdade

`App-Projeto/backend/prisma/seed-plans.ts` → `PLAN_CATALOG`. Tudo (preço, limites, features) mora nesse único objeto; o seed é idempotente por `code`. A grade de `Pricing.jsx` hoje declara em comentário que **espelha** esse arquivo, e que mexer num exige mexer no outro.

| Plano | `pricePerScreenCents` | Piso | Limite de telas |
|---|---|---|---|
| `gratis` | 0 | 1 | `maxDevices: 1` — única trava real |
| `loja` | 4900 (R$ 49/tela/mês) | 1 | ilimitado |
| `rede` | 3900 (R$ 39/tela/mês) | **5 telas na fatura** | ilimitado |
| `enterprise` | 0 = **sob consulta** (flag `preco-sob-consulta`) | 1 | ilimitado |

Racional de preço, unit economics e a decisão anti-cobrança-retroativa estão em [[modelo-comercial-e-precificacao]]; a âncora de mercado que sustenta esses valores, em [[concorrentes-e-mercado-signage]].

### 4.3 O que mudou na página

- A grade passou a espelhar o catálogo do backend.
- **O plano Grátis apareceu na página pela primeira vez.** O site externo não tinha porta de entrada gratuita — vendia só pacote pago.
- O bloco de ancoragem ("Compare antes de decidir") passou a mostrar **R$ 0 a 49 /tela** em vez dos valores de pacote.
- **JSON-LD reescrito com `UnitPriceSpecification`** e `unitText: "tela ativa por mês"`. Antes, `index.html` anunciava `price: 69` e `price: 149` como oferta estruturada — e é exatamente isso que Google e ferramentas de IA leem para responder "quanto custa o TelaHub". Preço estruturado errado propaga para fora do site.
- **Os CTAs passavam nomes de plano inexistentes** (`Starter`, `Business`) para `triggerConversionModal`, que alimenta o rastreamento de conversão. O dado gerado era inútil: não dava para cruzar conversão com plano nenhum do catálogo. Hoje os CTAs passam `Grátis` / `Loja` / `Rede` / `Enterprise`.

---

## 5. Pendências abertas

Cada item com o risco concreto, para que ninguém trate como polimento.

### 5.1 Resíduos de remoção — encontrados e corrigidos em 2026-07-25

Estes eram resíduos das remoções da seção 2: a correção foi feita no componente e sobrou em outro lugar. Foram **encontrados numa varredura posterior e corrigidos no mesmo dia**, com verificação no artefato construído. Ficam registrados porque são o melhor exemplo de por que a lição 3(a) existe.

- ~~**`LeadModal.jsx` — botão "Ativar Meus 14 Dias Grátis"**~~ **corrigido.** O texto estava três linhas abaixo do comentário que proibia exatamente isso, e era o **botão principal de conversão**. Hoje é "Quero minha tela grátis".
- ~~**`LeadModal.jsx` — tela de sucesso**~~ **corrigido, e era o pior dos dois.** A mensagem afirmava *"Sua conta está ativa com a primeira tela grátis. Enviamos as instruções de login e o código de pareamento para o seu e-mail."* Nada disso acontecia: `handleLeadSubmit` em `src/App.jsx` é um mock com `setTimeout` e o lead **não é enviado a lugar nenhum**. Ou seja, além de afirmar entrega inexistente, o visitante ficava esperando um e-mail que nunca vinha e o contato era perdido. Hoje o texto diz que o contato foi recebido e que haverá retorno. **Só volte a prometer envio quando o formulário estiver integrado de fato e o cadastro criar a conta** — o mock continua lá.
- ~~**`public/llms.txt`**~~ **corrigido, e é o caso mais instrutivo.** Não havia sido tocado por nenhuma das revisões de componente, porque não é componente. É o arquivo escrito **para ferramentas de IA lerem**, e o `robots.txt` libera GPTBot, ClaudeBot, OAI-SearchBot e PerplexityBot explicitamente. Ele ainda anunciava *"resiliência offline (cache local)"*, *"cache offline failsafe"* e *"Planos: Starter (até 2 telas), Business (até 6 telas, mais popular), Enterprise (10+ telas, white label, sob consulta)"* — num único arquivo: a promessa de offline, o pacote fixo antigo, o superlativo e o white label como recurso pronto, tudo o que já havia saído das páginas visíveis.
  Foi reescrito com o modelo de cobrança real e ganhou uma seção **"Limitações declaradas"**, que afirma explicitamente o que o produto **não** faz (sem offline completo, sem white label/SSO/SLA prontos, sem 2FA, sem app nativo de Android TV, sem checkout automatizado, sem base de clientes publicada). A intenção é dupla: não induzir a ferramenta de IA a repetir informação errada, e deixar registrado que qualquer número de clientes ou selo atribuído ao TelaHub não vem de nós.

### 5.2 Política de privacidade e termos de uso são links mortos

`Footer.jsx`, coluna "Termos & Legal": `Privacidade`, `Termos de Uso` e `Suporte Geral` são `<a href="#" onClick={e => e.preventDefault()}>`. Não existem as páginas.

**Risco:** o site **captura dado pessoal** (`LeadModal` pede nome, e-mail, empresa e telefone) e **usa cookies/localStorage de campanha** (`tracking.js`, `ConsentBanner`). LGPD exige política de privacidade acessível, com finalidade do tratamento e canal de contato do titular. Isso não é item estético: **hoje o site coleta dado pessoal sem informar o titular.** O banner de consentimento existe e nega por padrão, o que é correto — mas ele aponta para uma política que não existe.

Ver [[seguranca-e-conformidade-tecnica]] para o lado técnico da conformidade.

### 5.3 Três planos pagos com botão "Assinar" e nenhum checkout

`POST /api/billing/checkout` responde **501** de propósito (`App-Projeto/backend/src/routes/billing.routes.ts`) — não há gateway integrado. No site externo os CTAs são "Assinar o Loja", "Assinar o Rede", "Falar com Comercial", e abrem o `LeadModal`.

**Risco:** o clique morre. Pior, no `LeadModal` o `handleLeadSubmit` (em `src/App.jsx`) é um **mock**: um `setTimeout(800)` que marca sucesso, com um `TODO` sugerindo Formspree/Zapier. Nenhum lead é enviado para lugar nenhum. E a tela de sucesso afirma *"Sua conta está ativa com a primeira tela grátis. Enviamos as instruções de login e o código de pareamento para o seu e-mail."* — nada disso acontece. Até o gateway existir, os CTAs pagos precisam apontar para o canal comercial, e a captura de lead precisa realmente capturar.

### 5.4 `comercial@telahub.com.br` é um endereço inventado

`Landing.tsx:59`, constante `EMAIL_VENDAS`, com aviso em caixa alta no próprio arquivo: foi criado **apenas para não deixar link morto**. É o destino dos CTAs "Falar com vendas" e do card Enterprise. **Bloqueia publicação** até se confirmar que a caixa existe e é monitorada. O arquivo está preparado para isso — o endereço aparece num único ponto.

Correlato no site externo: o botão de WhatsApp do FAQ aponta para `wa.me/5500000000000` (número placeholder), o rodapé publica `CNPJ 00.000.000/0001-00` e o GTM está com o container `GTM-XXXXXXX` — ou seja, o rastreamento descrito na seção 1.2 **não está coletando nada** hoje.

### 5.5 Feature de plano é decorativa

A página anuncia **Power BI, Airtable, Google Docs e PDF** como recursos do plano Rede. O catálogo do backend concorda (`FEATURES_REDE` inclui `powerbi`). Mas **nenhum gate existe no sistema**: `hasFeature()` está definido em `backend/src/services/plan.service.ts` e é chamado **apenas nos testes** (`services/__tests__/subscription.test.ts`) — nenhuma rota de produção o consulta.

**O risco aqui é o inverso do habitual.** Não é enganar o cliente prometendo o que não existe — é **entregar de graça o que deveria ser pago**, e depois gerar atrito ao tirar. Um cliente do plano Loja que montou a operação em cima do Power BI vai tratar o gate futuro como perda de funcionalidade contratada, não como cobrança justa. Quanto mais tempo sem gate, mais caro fica ligá-lo.

### 5.6 Persistência offline — lacuna de produto, não de copy

Operação offline é um dos **três pilares de decisão do pequeno varejista brasileiro** ([[concorrentes-e-mercado-signage]], seção 5.3). O produto tem apenas cache por versão/ETag; se o aparelho reiniciar sem internet, a tela não carrega.

As duas páginas hoje **declaram a limitação** em vez de prometer. Na landing interna isso é feito de forma deliberada, dentro do `PilarCard` "2. E se a internet cair?", num bloco intitulado *"O que não existe — e a gente diz antes"*: *"Preferimos escrever isso aqui do que você descobrir depois de assinar."* No site externo, o FAQ correspondente diz *"Está no nosso roteiro, e preferimos avisar agora a te surpreender na loja."*

Isso é a decisão certa e deve ser mantida. Mas o fato permanece: **é lacuna de produto que custa venda**, num critério que o comprador usa para decidir. Ver [[funcionalidades-produto]].

### 5.7 Trabalho não commitado no site externo

O repositório `Site/site-telas` está na branch **`copy/gatilhos-mentais`**, com trabalho não commitado misturado a alterações que já existiam antes desta sessão. Modificados: `index.html`, `App.jsx`, `Hero.jsx`, `Pricing.jsx`, `CtaStrip.jsx`, `Footer.jsx`, `LeadModal.jsx`, `BentoFeatures.jsx`, `Navbar.jsx`, `DashboardMockup.jsx`, `TechArchitecture.jsx`, `UseCases.jsx`, `index.css`, `main.jsx`, `package.json`, `README.md`. Não rastreados: `public/llms.txt`, `public/robots.txt`, `public/sitemap.xml`, `public/manifest.webmanifest`, `scripts/`, `src/entry-server.jsx`, `src/lib/`, `src/components/ConsentBanner.jsx`.

Ou seja: **as correções de conformidade e a infraestrutura de SSR/SEO/consentimento ainda não estão em `main`, e portanto não estão publicadas.** Quem for retomar precisa separar o que é correção de conformidade (tem urgência jurídica) do que é redesign de copy (não tem).

---

## 6. Persuasão com verdade — a regra adotada

O princípio que guiou toda a reescrita:

> **Gatilho só entra se o fato por trás dele for verdadeiro e verificável hoje.**

Está escrito como regra 2 no cabeçalho de `Landing.tsx`. Não é uma restrição de tom — é o que separa copy de risco jurídico.

**Descartados por falta de base:**

- **Escassez** — não há vaga limitada, então não há "12 vagas restantes".
- **Urgência** — não há prazo real, então não há contador que reinicia à meia-noite.
- **Prova social numérica** — sem clientes, não há depoimento, nota, contagem de empresas nem "mais vendido". Este é o mais difícil de aceitar e o mais fácil de reintroduzir por descuido; é o que voltou sozinho (seção 3).

**Mantidos como legítimos, cada um com o fato que o sustenta:**

| Gatilho | O fato que o torna verdadeiro |
|---|---|
| **Reciprocidade** | O plano grátis é concessão real: 1 tela, para sempre, sem cartão, sem virar cobrança automática. Está no catálogo do backend (`maxDevices: 1`, `pricePerScreenCents: 0`), não só na página. |
| **Aversão à perda** | Aponta a perda **que já está acontecendo**, não uma hipotética: a tela apagada às 9h que ninguém viu, o cardápio impresso com o preço da semana passada. O headline da landing interna é isso — *"Suas telas nunca mais ficam apagadas sem você saber"*. |
| **Autoridade** | Só pelo demonstrável: heartbeat, alerta por e-mail, SSE, pareamento por código. Coisas que se mostram numa call de cinco minutos. |
| **Ancoragem** | Faixa de preço **pública** de concorrentes (USD 8–20/tela/mês nas plataformas internacionais; kit tradicional brasileiro a partir de R$ 3.500 de entrada), sem nomear concorrente na página e com as fontes anotadas em comentário no `Pricing.jsx`. |
| **Quebra de objeção** | Estruturada sobre os **três pilares de decisão** da pesquisa ([[concorrentes-e-mercado-signage]]) — precisa de TI? e se a internet cair? vou ter que comprar player caro? — **com honestidade explícita no pilar de offline** (seção 5.6). |
| **Transparência como diferencial** | A seção "Programa piloto aberto" transforma a ausência de prova social em argumento: quem entra agora fala direto com quem escreve o código. É verdade, e só é dizível enquanto for verdade. |

Nota de coerência: a promessa **anti-cobrança-retroativa** (destaque na seção de planos da landing interna) é gatilho e compromisso ao mesmo tempo. Ela existe porque é a reclamação nº 1 contra o Yodeck ([[concorrentes-e-mercado-signage]], seção 4.1). Como está publicada, **vincula** — art. 30 do CDC vale nos dois sentidos. A própria página diz isso: *"Se um dia acontecer diferente com você, é falha nossa — e você tem esta página como prova do que foi prometido."* Ver [[modelo-comercial-e-precificacao]], seção 2.3.1.

---

## 7. Resumo para quem retomar em seis meses

**Qual página mexer:**

| Você quer... | Arquivo |
|---|---|
| Mudar preço, plano ou feature de plano | `App-Projeto/backend/prisma/seed-plans.ts` **primeiro** — é a fonte de verdade. Depois `Landing.tsx` (`PRECOS`, `PLANOS`) e `Pricing.jsx` (`plans`) e o JSON-LD de `index.html`. **Os quatro contam a mesma história ou nenhum conta.** |
| Mexer no texto que o visitante do domínio público lê | `Site/site-telas/frontend/src/components/` — repositório **separado**, branch `copy/gatilhos-mentais` |
| Mexer no texto de `/vendas` dentro do app | `App-Projeto/frontend/components/Landing.tsx` |
| Mexer no que ferramentas de IA respondem sobre o TelaHub | `Site/site-telas/frontend/public/llms.txt` + JSON-LD de `index.html` (hoje **desatualizados** — seção 5.1) |

**O que não pode voltar a ser escrito, em nenhuma das duas:** número de clientes, número de displays, uptime, nota/avaliação, depoimento, "Nº1", "mais vendido"/"mais escolhido"/"mais popular", preço riscado, contador de oferta, "vagas restantes", "primeiros N clientes", prazo de teste (o trial de 14 dias não existe mais), white label / SSO / SAML / LDAP / 2FA / domínio personalizado / SLA / player Android TV nativo / Google Data Studio como recursos prontos, e **qualquer forma de persistência ou cache offline real**.

**Antes de dar por feita qualquer correção de copy:** rodar o build e fazer `grep` no `dist/`, incluindo os arquivos copiados de `public/`.

---

## Ver também

- [[modelo-comercial-e-precificacao]] — preços, unit economics, anti-cobrança-retroativa e o diagnóstico de prontidão comercial que originou este ciclo (seção 1.4: "a landing prometia o que o produto não faz").
- [[concorrentes-e-mercado-signage]] — a base factual da ancoragem de preço, dos três pilares de decisão e do enquadramento CDC/LGPD.
- [[funcionalidades-produto]] — o que o produto realmente faz; referência obrigatória antes de escrever qualquer bullet de recurso.
- [[oportunidades-ux]] — a landing como superfície de conversão. Veracidade é pré-requisito de qualquer teste de conversão: medir uma página que promete ficção mede a atratividade da ficção.
- [[arquitetura-e-entidades]] — modelo de domínio; onde conferir se um recurso anunciado tem contrapartida.
- [[seguranca-e-conformidade-tecnica]] — o lado técnico de LGPD/segurança que sustenta (ou não) o que a página afirma sobre dados.
- [[Kanban-TelaHub]] — onde as pendências da seção 5 são acompanhadas como trabalho.
