---
tipo: negocio
atualizado: 2026-07-25
tags: [modelo-comercial, precificacao, unit-economics, multi-tenant, go-to-market, saas, lgpd-cdc]
sources:
  - raw/pesquisa/2026-07-25-analise-prontidao-comercial.md
  - raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md
  - raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md
---

# Modelo Comercial e Precificação — TelaHub

Primeira página da wiki sobre **como o TelaHub ganha dinheiro**. Até 2026-07-25 a wiki cobria bem o lado técnico e de UX, mas o modelo comercial existia apenas como preços publicados na landing de vendas (`/vendas`) — sem decisão registrada, sem raciocínio e, como se descobriu, sem sustentação no código.

Esta página tem três partes: (1) o diagnóstico de prontidão comercial, com achados de código verificados; (2) o modelo comercial escolhido e o porquê, ancorado no vault de negócio `Especialistas/8 - Marca De Sucesso`; (3) o que ainda não sabemos.

**Onde os assuntos vizinhos moram** (para não duplicar conteúdo): o detalhe de concorrentes e mercado está em [[concorrentes-e-mercado-signage]]; o que cada superfície de venda afirma, em [[canais-de-venda-e-landings]]; a arquitetura, em [[arquitetura-e-entidades]]. **Aqui é a leitura comercial** — preço, ticket, enforcement, receita.

**Meta declarada de validação: MVP comercial com 50 clientes pagantes.**

---

## 1. Diagnóstico de prontidão comercial (2026-07-25)

Os itens abaixo são fatos verificados por leitura direta do código, não impressões. Todos foram encontrados **antes** do ciclo de correção disparado nesta mesma data.

### 1.1 O isolamento multi-tenant não existia de fato — correção de entendimento

Esta é a lição mais importante do ciclo, e vale registrá-la de forma explícita porque a wiki e o Kanban afirmavam o contrário.

O que o código fazia:

- `GET /api/displays` (`backend/src/routes/displays.routes.ts:11`) chamava `displayService.getAll()` — **sem nenhum escopo** de organização ou de usuário.
- O filtro por organização era **client-side**, em `frontend/components/Dashboard.tsx:278`. Ou seja: a API devolvia tudo e o navegador escondia o que não interessava.
- `User` **não tinha** `organizationId`. Não havia como dizer a que loja um usuário pertence.
- `Device`, `Broadcast`, mídia e o `Setting` de SMTP **não tinham** escopo de organização.

O que isso significa: [[arquitetura-e-entidades]] (gap #3) e o [[Kanban-TelaHub]] registravam **"Multi-loja ✅ concluído"** (US-005/006/017) quando o que de fato existia era **agrupamento visual** de displays por loja — não um limite de segurança. Um cliente pagante enxergaria os dados de outro cliente pagante.

A descrição técnica nas duas páginas não estava mentindo (entidade `Organization`, filtro no Dashboard e relatório agregado realmente foram entregues). O erro foi de **leitura do rótulo**: "multi-loja concluído" passou a ser tratado como "multi-tenancy pronta para vender", e ninguém revalidou. Multi-tenancy comercial é uma propriedade de **segurança verificada no servidor**, não uma feature de organização de tela. Antes de cobrar de mais de um cliente no mesmo deploy, a pergunta a fazer é sempre "o que acontece se eu chamar essa rota com o token do cliente A?", nunca "o Dashboard mostra as lojas separadas?".

### 1.2 Não havia porta de entrada comercial

Não existia rota de cadastro (`POST /register`). O único caminho para criar um usuário era `POST /api/users/invite`, que **exige um admin já logado**. Consequência direta: a landing de vendas tinha CTA sem destino — um visitante convencido não tinha como se tornar cliente sozinho.

### 1.3 Zero infraestrutura de cobrança

Nenhum modelo de plano, assinatura, ciclo de faturamento ou quota no schema Prisma. O "Até 5 displays" anunciado na landing era **texto**, sem enforcement em nenhuma camada — nada impedia um cliente do plano de entrada de cadastrar 50 telas.

### 1.4 A landing prometia o que o produto não faz

Promessas presentes na landing sem qualquer contrapartida no código: **white label, SSO/SAML/LDAP, 2FA, domínio personalizado, SLA 99,9%, player Android TV nativo e cache offline real**.

Além disso, havia **depoimento de cliente fabricado** e selo **"MAIS VENDIDO"** com **preço riscado fictício** — sem base real, já que não havia cliente pagante nenhum. Isso é exposição ao **art. 37 do CDC** (publicidade enganosa), não só um problema de honestidade de marketing.

Ligação com [[oportunidades-ux]]: a landing é a superfície de primeira impressão/conversão, e o problema aqui não é estético — é de veracidade. Nenhuma melhoria de UX na landing importa se o que ela afirma não é verdade.

### 1.5 Quota é aplicada; feature de plano é decorativa

Achado de 2026-07-25, verificado por grep em todo o repositório. É o achado comercial mais acionável desta rodada, porque separa "ter planos diferentes" de "ter planos diferentes que valem alguma coisa".

**O que funciona.** A quota é aplicada de verdade, no servidor: `enforceQuota('device')` está montado em `POST /api/devices/link` (`backend/src/routes/devices.routes.ts:91`) e `enforceQuota('user')` em `POST /api/users/invite` (`backend/src/routes/users.routes.ts:25`), ambos atrás de `requireActiveSubscription`. Número de telas e número de usuários são limites reais.

**O que não funciona.** `hasFeature()` existe em `backend/src/services/plan.service.ts:53`, é bem escrito, tem teste (`backend/src/services/__tests__/subscription.test.ts:157`) — e **nenhuma rota e nenhum serviço o chama**. Fora do próprio `plan.service.ts` e dos testes, a coluna `features` só é lida para uma coisa: descobrir se o plano é `preco-sob-consulta` (`subscription.service.ts:81,98,320`). Não há gate no frontend tampouco: nenhum componente consulta a lista de features.

Consequência comercial concreta, comparando o catálogo (`backend/prisma/seed-plans.ts`) com o que a landing anuncia (`frontend/components/Landing.tsx`):

| Feature no catálogo | Plano que deveria ter | Estado real |
|---|---|---|
| `powerbi`, `api-externa`, `agendamento-avancado`, `multi-org` | Rede (R$ 39/tela, mín. 5) | liberado para qualquer conta, inclusive a grátis |
| `relatorios`, `auditoria` | Loja (R$ 49/tela) | idem |

O card do plano Rede na landing vende literalmente "Power BI, Airtable e APIs externas nas telas" como recurso do plano. Hoje, uma conta no plano **Grátis** (1 tela, R$ 0, sem cartão) usa Power BI, Airtable, Google Docs, Office Docs e PDF sem qualquer impedimento.

**A inversão do risco vale ser registrada com clareza.** Nos achados 1.1 a 1.4 o risco era enganar o cliente — prometer o que não existe. Aqui é o oposto: **entregar de graça o que deveria ser pago.** Não há exposição ao art. 37 do CDC nesse item; há erosão de receita e, pior, **atrito futuro garantido** — no dia em que o gate for ligado, alguém que já montava seu painel de Power BI no plano grátis vai perdê-lo, e isso vira reclamação e churn. Quanto mais tempo a lacuna fica aberta, mais caro é fechá-la.

**O gate precisa ser no servidor.** Esconder o widget no editor não resolve: a chamada direta à API contorna qualquer verificação de frontend, exatamente como o filtro client-side do achado 1.1 não era isolamento de tenant. A regra é a mesma que aquele achado ensinou: a pergunta é "o que acontece se eu chamar essa rota com o token de uma conta grátis?", nunca "o editor mostra o botão?".

---

## 2. Modelo comercial escolhido

O raciocínio abaixo aplica ao TelaHub os artigos do vault de negócio `Especialistas/8 - Marca De Sucesso` (wiki na pasta oculta `.wiki/`). Referências por caminho, já que são páginas de outro vault e não existem como wikilinks aqui:

- `Especialistas/8 - Marca De Sucesso/.wiki/wiki/topics/precificacao-e-financas.md`
- `Especialistas/8 - Marca De Sucesso/.wiki/wiki/topics/fundamentos-empreendedorismo.md`
- `Especialistas/8 - Marca De Sucesso/.wiki/wiki/topics/marketing-digital-posicionamento-online.md`
- `Especialistas/8 - Marca De Sucesso/.wiki/wiki/topics/caminho-ao-sucesso-erros-comuns.md`

### 2.1 Mudança de eixo: de penetração para valor (EVC)

A landing vendia **desconto**: "Economize até 40%", "desconto pra sempre". Isso é, no vocabulário de `precificacao-e-financas.md`, uma **estratégia de penetração** — preço agressivamente baixo para ganhar escala rápido. O vault é explícito sobre o pré-requisito: penetração "exige alta elasticidade-preço e **caixa robusto para sustentar prejuízo inicial** — risco real de queimar caixa sem conseguir subir preços a tempo". Um projeto bootstrap não tem esse caixa. E o "desconto pra sempre" é pior que um desconto de lançamento: **trava a receita permanentemente**, eliminando a própria saída da estratégia de penetração (subir preço depois).

A alternativa que o vault indica é **precificação baseada em valor (EVC)**: preço do concorrente de referência + captura parcial do valor de diferenciação. Para isso é preciso ter um diferencial real e verificável — não uma lista de promessas.

O diferencial real do TelaHub, hoje, é **visibilidade operacional**: painel de saúde de devices (heartbeat, online/offline calculado no servidor), alerta de tela offline por e-mail e relatório por loja — tudo já implementado e descrito em [[arquitetura-e-entidades]]. Isso ataca exatamente a dor que a própria landing nomeia: o lojista não sabe que a tela do ponto de venda está apagada. É um diferencial que se demonstra numa call de 5 minutos, ao contrário de "SLA 99,9%".

Consequência prática: **remover a narrativa de desconto e reposicionar o preço sobre o valor da visibilidade operacional.** As features fictícias saem da landing; o que fica é o que se pode provar.

**Âncora de EVC — preenchida em 2026-07-25.** A fórmula de EVC exige um "preço do concorrente de referência" como âncora, e essa era a lacuna declarada na seção 3. Ela foi fechada por [[concorrentes-e-mercado-signage]]: o self-service global roda numa mediana de **USD 12–15 por tela/mês** (piso USD 4,90 no Xibo Cloud, teto USD 20–30 no ScreenCloud), e o varejista brasileiro aceita **R$ 30 a R$ 110 por tela/mês** dependendo da vertical (faixa de prateleira nacional de R$ 25 a R$ 150). A escolha do diferencial (alerta de tela offline) também deixou de ser intuição: é a resposta direta ao grupo de atrito nº 3 do setor — players BYOD de consumo travando e expondo a interface do Fire Stick/Google TV na tela pública.

### 2.2 Cobrança por tela ativa, não por conta

Decisão: **preço por tela ativa/mês**, em vez de mensalidade fixa por conta.

Razões:
- **Alinha preço a custo.** O custo marginal do TelaHub escala com o número de devices conectados (SSE aberto, heartbeat, banda de mídia, storage R2), não com o número de logins. Cobrar por conta descola receita de custo — e `precificacao-e-financas.md` insiste que margem se calcula sobre COGS real (infra cloud, suporte, gateway).
- **Alinha preço a valor percebido.** Uma rede com 30 telas tira 30x mais valor que uma loja com 1 tela; cobrar igual dos dois é deixar dinheiro na mesa em cima e assustar o pequeno embaixo.
- **É o padrão do setor** — isso era premissa em 2026-07-25 e passou a ser fato verificado: **todos os nove provedores globais mapeados** em [[concorrentes-e-mercado-signage]] cobram por tela ativa/mês, e os players brasileiros cobram consultivamente **por volume de telas**. Reduz atrito na conversa de venda porque é a unidade que o comprador já espera.

Isso teve consequência técnica direta: para saber o que é uma "tela ativa" e a partir de quando ela é cobrável, foi necessário adicionar **`Device.activatedAt`** ao schema.

### 2.3 Preços — DECIDIDOS (2026-07-25)

> **Estes preços substituem os provisórios anteriores** (trial de 14 dias, Loja R$ 29, Rede R$ 24). A decisão é do dono do projeto, tomada com a pesquisa de [[concorrentes-e-mercado-signage]] em mãos. A tabela antiga fica registrada logo abaixo para que ninguém, em seis meses, ache que o preço nunca mudou.

**Status: decidido, não provisório.** A fonte da verdade é o catálogo em `backend/prisma/seed-plans.ts` (`PLAN_CATALOG`), verificado nesta data: `gratis` R$ 0 / 1 tela / `maxDevices: 1`; `loja` `pricePerScreenCents: 4900`, `minScreens: 1`; `rede` `pricePerScreenCents: 3900`, `minScreens: 5`; `enterprise` sob consulta via a flag `preco-sob-consulta`. `maxDevices: null` nos planos pagos é deliberado — quem limita a expansão é a fatura, não uma trava no software.

**O conflito de preço entre landing e backend foi resolvido — e não era uma decisão comercial em aberto.** Durante algum tempo a página de vendas anunciava pacote fixo por conta (R$ 69 e R$ 149/mês) enquanto o backend cobrava por tela. Isso parecia um impasse de modelo, mas não era: o comentário de cabeçalho do próprio `seed-plans.ts` já declarava, sem ambiguidade, *"Modelo de cobrança: POR TELA ATIVA / MÊS"*. **A página de vendas estava simplesmente desatualizada.** Hoje a landing do app (`frontend/components/Landing.tsx`, rota `/vendas`) espelha o catálogo: R$ 49 e R$ 39 por tela/mês, mínimo de 5 telas no Rede, 1 tela grátis para sempre sem cartão. O detalhamento das superfícies de venda e do que cada uma afirma está em [[canais-de-venda-e-landings]].

Lição de processo que vale mais que o número: **quando duas superfícies discordam, a primeira pergunta é qual delas tem uma decisão registrada por trás** — não "qual das duas está certa". Aqui havia decisão escrita em comentário de código e nenhuma na wiki; a landing divergiu por falta de ponto único de verdade, não por desacordo. Este arquivo passa a ser esse ponto para o lado comercial.

| Plano | Preço | Condição |
|---|---|---|
| **Grátis** | R$ 0 | **1 tela, para sempre** — não é trial, não expira, **sem cartão** |
| **Loja** | **R$ 49** / tela / mês | — |
| **Rede** | **R$ 39** / tela / mês | mínimo de 5 telas |
| **Enterprise** | sob consulta | — |

**O que mudou e por quê:**

1. **O trial de 14 dias virou plano gratuito vitalício de 1 tela.** Não foi generosidade: é o padrão de aquisição do setor. Yodeck e Look DS oferecem exatamente 1 tela grátis para sempre; OptiSigns oferece até 3. Um trial de 14 dias competindo contra "grátis para sempre" perde antes de começar. Além disso, o freemium de 1 tela **por CNPJ** é a estratégia nº 1 de go-to-market orgânico apontada pela pesquisa de mercado brasileiro (ver seção 2.6).
2. **Os preços subiram porque os antigos estavam no piso da faixa aceita.** R$ 29 e R$ 24 ficavam **abaixo** do mínimo de qualquer vertical brasileira mapeada (a mais barata, academias, aceita R$ 30–70) e abaixo de **todos os nove concorrentes globais exceto o Xibo** — que é open source e vive de outro modelo. Cobrar menos que o mínimo que o mercado já aceita não conquista cliente: sinaliza produto inferior e destrói a margem que paga o suporte. R$ 49 e R$ 39 ficam no terço inferior/médio da faixa R$ 30–110, ainda claramente competitivos, com espaço para desconto negociado em vez de já partir do fundo.
3. **O degrau Loja → Rede continua sendo desconto por volume com contrapartida** (mínimo de 5 telas), não desconto de lançamento sem prazo. R$ 49 → R$ 39 é ~20% de desconto — comparável aos ~10 a 20% que OptiSigns, Look DS, Pickcel e Yodeck praticam no compromisso anual.
4. **Enterprise segue "sob consulta"** deliberadamente: é onde as promessas hoje inexistentes (SSO, white label, SLA) poderão ser vendidas **sob contrato**, quando existirem, sem voltar a anunciá-las como se já existissem.

### 2.3.1 Decisão anti-cobrança-retroativa (diferencial deliberado)

**Sair do plano gratuito nunca gera cobrança retroativa.** Quando o cliente conecta a segunda tela, ele começa a pagar **daquele momento em diante**, pelas telas que tem, e a primeira tela não é faturada para trás.

Isso é uma escolha de posicionamento, não uma omissão. A **reclamação nº 1 contra o Yodeck** registrada em [[concorrentes-e-mercado-signage]] (seção 4.1) é exatamente o oposto: ao adicionar uma segunda tela, o benefício gratuito é revogado por completo e **todas as telas cadastradas, inclusive a primeira, passam a ser faturadas retroativamente**. É citado como fonte frequente de crítica por falta de flexibilidade na transição para o plano pago.

**O limite exato da promessa (registrado porque já gerou ambiguidade).** A promessa é sobre **tempo**, não sobre **quantidade**:

- **O que ela garante:** a cobrança vale da ativação da tela em diante e é **proporcional aos dias restantes** do período. Nada é cobrado retroativamente sobre o tempo em que o cliente usou de graça.
- **O que ela NÃO garante:** não existe crédito perpétuo de 1 tela dentro dos planos pagos. Ao entrar num plano pago, a fatura é **`max(telas ativas, minScreens) × preço por tela`** — a conta implementada em `backend/src/services/subscription.service.ts:102` (`billedScreens`) e refletida em `quota.middleware.ts` e `GET /api/billing/*`. Um cliente do plano Loja com 3 telas paga 3 × R$ 49, não 2 × R$ 49.

Uma redação anterior sugeria o contrário — que a primeira tela seguiria gratuita depois do upgrade. Isso equivaleria a **descontar R$ 49/mês de todo cliente, para sempre**, e não foi decidido por ninguém. Se um dia for, é decisão consciente de precificação, com o impacto na margem da seção 2.4 recalculado; não pode entrar de novo por acidente de redação.

A regra prática: **o momento em que o cliente decide crescer é o pior momento possível para puni-lo com uma fatura surpresa.** É o momento de maior boa vontade dele com o produto, e a cobrança retroativa transforma isso em ressentimento. Vale registrar isso como promessa explícita na landing e nos termos, porque é fácil de manter agora e é justamente o tipo de coisa que um financeiro futuro vai propor "otimizar".

Na mesma linha, e pelo mesmo motivo (grupo de atrito nº 4 da pesquisa): **tarifa única, sem add-on.** Nada de cobrar separado por videowall (OptiSigns cobra USD 25/mês), por domínio próprio (USD 10/mês) ou por widget. O que está no plano está no preço.

### 2.4 Régua de unit economics — estimativa, não fato

Aplicação das fórmulas de `precificacao-e-financas.md`. **Tudo abaixo é estimativa**; as premissas estão nomeadas ao lado de cada número justamente para que possam ser derrubadas quando houver dado real.

> **Recalculada em 2026-07-25** com os preços novos da seção 2.3. Os números anteriores (ARPU R$ 192, LTV ≈ R$ 5.120, CAC teto ≈ R$ 1.700) estavam sobre o preço de R$ 24/tela e não valem mais.

**Premissas (explícitas, para poderem ser derrubadas):**
- Cliente-referência: plano **Rede com 8 telas** → ARPU = 8 × R$ 39 = **R$ 312/mês**.
- **Margem bruta de 80%** — ponto médio-alto da faixa 70–85% que o vault dá para SaaS. Premissa, não medição: os COGS reais (R2, VPS, e-mail transacional, gateway, suporte) ainda não foram apurados. Nota: quando o gateway entrar (seção 3), ele consome de ~1% (Pix) a ~4% (cartão) da receita bruta, mais o custo de emissão de NFS-e e o **ISS de 2% a 5%** — ou seja, há pressão conhecida sobre essa margem que ainda não está na conta.
- **Churn mensal de 3%** — premissa de SMB B2B. Não há histórico; não existe cliente pagante.

**Derivações:**

```
LTV = ARPU × Margem Bruta ÷ Churn
    = 312 × 0,80 ÷ 0,03
    ≈ R$ 8.320
```

```
CAC máximo para LTV:CAC = 3:1
    = 8.320 ÷ 3
    ≈ R$ 2.770
```

```
Payback = CAC ÷ (ARPU × Margem Bruta)
        = 2.770 ÷ (312 × 0,80)
        ≈ 11 meses
```

Leitura: um **CAC fully-loaded de até ~R$ 2.770** mantém o negócio no limiar de viabilidade de 3:1, com payback de ~11 meses — abaixo da mediana global de 18 meses citada pelo vault, e dentro da faixa que ele chama de excelente (<12 meses). O payback praticamente não mudou em relação ao cálculo anterior, porque preço e teto de CAC subiram na mesma proporção; o que mudou é a **folga absoluta**: o aumento de preço comprou ~R$ 1.070 a mais de CAC tolerável por cliente, o que em termos práticos significa que a venda consultiva presencial (estratégia nº 3 de go-to-market em [[concorrentes-e-mercado-signage]]) cabe no orçamento com muito mais margem de erro.

**Isto é estimativa com premissas, não fato.** Nenhum dos três insumos (ARPU real, margem real, churn real) foi medido — não existe cliente pagante.

Duas ressalvas que o vault faz e que aqui importam mais que o resultado:
- **CAC fully-loaded inclui o tempo do fundador.** O vault alerta que ignorar salários/tempo próprio subestima o CAC em 2–3x. Num projeto de um fundador, quase todo o CAC é tempo dele: se cada cliente novo custa 12 horas de prospecção, demo e onboarding manual, essas horas têm de ser precificadas e entrar na conta. Um CAC "de R$ 300 em mídia" é ficção.
- **LTV sobre margem bruta, nunca sobre receita.** Calcular sobre os R$ 192 cheios daria R$ 6.400 e superestimaria a eficiência.

### 2.5 Growth loop: cada tela instalada é mídia própria

Aplicação do conceito de **growth loop** (`marketing-digital-posicionamento-online.md`, Balfour/Chen — crescimento composto em vez de aditivo) a um ativo que o TelaHub tem e um SaaS comum não tem: **hardware físico exposto ao público, no ponto de venda de terceiros**.

Mecanismo: **rodapé "feito com TelaHub"** exibido no player.

- Presente no **plano de entrada** (Loja).
- **Removível no plano superior** — a remoção vira **upsell**, ou seja, o loop se paga duas vezes.
- **Custo marginal zero**: a tela já está ligada, o pixel já está aceso, o público-alvo (outros comerciantes, fornecedores, clientes de outras lojas) já passa na frente dela.

É o loop clássico do Dropbox/Calendly transposto para o offline: o uso do produto pelo cliente atual gera exposição que atrai a próxima coorte, sem gasto de mídia.

### 2.6 Go-to-market

Sequência derivada de `fundamentos-empreendedorismo.md` e `marketing-digital-posicionamento-online.md`:

1. **Um nicho vertical único primeiro.** Não "varejo": um segmento específico, com vocabulário e dor próprios. **A escolha continua em aberto por decisão do dono do projeto** — ver seção 3.1. A pesquisa entregou a tabela de oito verticais com adoção, decisor e ticket aceito ([[concorrentes-e-mercado-signage]], seção 5.2), mas a decisão foi deliberadamente adiada: "depende do cliente, definimos depois". A tabela fica disponível para quando a decisão vier; **não escolher por ele**.
2. **Primeiros clientes recrutados à mão** — "do things that don't scale" (Paul Graham/YC): os primeiros 50–100 clientes vêm um a um, com o fundador instalando, configurando e atendendo pessoalmente. Isso é também a melhor fonte de Customer Discovery que existe.
3. **Branded SEO desde já.** 44% das buscas no Google têm intenção de marca; dominar "TelaHub" + termos de categoria protege a narrativa e evita que concorrente compre o nome em leilão pago. Custo baixo, efeito cumulativo — começar antes de precisar.
4. **Community-led growth só depois de PMF.** CLG é motor de escala, não de descoberta; montar comunidade antes de ter produto que retém é gastar energia em cima de um produto que ainda vai mudar.

**Complemento de 2026-07-25:** a pesquisa de mercado brasileiro detalha **cinco táticas orgânicas concretas** para chegar aos primeiros 50 pagantes — freemium de 1 tela por CNPJ, parceria comissionada com instaladores locais (eletricistas e técnicos de CFTV que já estão pendurando a TV), venda consultiva presencial com demo ao vivo em tablet, SEO de cauda longa por vertical e cidade, e conectores de PDV/ERP local como barreira de saída. Estão descritas em [[concorrentes-e-mercado-signage]], seção 8. Duas delas resolvem problemas que esta página não tinha endereçado: a **instalação física do display** (a barreira real do pequeno varejo, que o canal de instaladores resolve) e o **churn** (o conector de PDV, que amarra a tela ao caixa).

### 2.7 O que o vault manda explicitamente NÃO fazer agora

- **Não escalar marketing antes de validar receita.** `caminho-ao-sucesso-erros-comuns.md`: 74% das startups de alto crescimento que falham colapsam por escalabilidade prematura (expandir equipe/infra/marketing antes de validar o modelo de receita); 93% das que escalam prematuramente nunca passam de US$ 100k/mês estáveis. Concretamente: não ligar tráfego pago antes dos primeiros pagantes.
- **Não tratar elogio como validação.** `fundamentos-empreendedorismo.md` chama elogio de "o ouro dos tolos". O instrumento é o **Sean Ellis Test**: "como você se sentiria se não pudesse mais usar este produto?" — **≥40% de "muito decepcionado"** é o sinal de PMF. "Achei muito legal" não é dado.
- **Usar a landing como smoke test, com régua definida antes de olhar o resultado:** **>3%** de conversão qualificada = sinal bom; **<0,3%** = proposta de valor confusa ou público errado. Isso só funciona com a landing corrigida — medir conversão de uma landing que promete SSO e SLA inexistentes mede a atratividade da ficção, não do produto.

### 2.8 O inventário de widgets contradiz a comunicação — hipótese de reposicionamento

Este é o achado que mais muda o entendimento de **que produto é esse**. Ele é uma **hipótese de negócio, não uma decisão**, e a seção termina com a ressalva que a torna acionável de forma responsável.

**O levantamento (verificado em `frontend/components/widgets/` e no enum `WidgetType` de `frontend/types.ts`).** Dos 23 tipos de widget do editor, o grupo em que a engenharia efetivamente investiu se distribui assim:

| Grupo | Widgets | Peso |
|---|---|---|
| **Corporativo / BI** | Power BI, Airtable, Google Docs, Office Docs, PDF, BrowserSnapshot, EmbedHTML, MarketWatch, RSS | o maior bloco, e o de maior custo de implementação |
| **Gestão de equipe / à vista** | Todo, Chores, MealPlan (cardápio da semana), Notes, Countdown, Clock, Weather, Calendar, FullInfo | segundo bloco |
| **Cartaz de varejo** | Imagem, Vídeo, GIF, Texto, Iframe | **primitivos genéricos do editor** — não há widget dedicado de preço, oferta, promoção, catálogo ou cardápio de menu board |

A leitura, em uma frase: **o investimento de engenharia foi num painel de gestão à vista, enquanto a comunicação vende cartaz digital de varejo.** O produto que existe sabe puxar um dashboard de Power BI, um documento vivo do Google e um PDF para uma TV e mantê-los atualizados sozinhos; o que a landing destaca é imagem, vídeo e texto — que qualquer editor de signage faz, e que aqui não são nem features, são o mínimo do canvas.

**Implicação comercial nº 1 — o terreno que a comunicação escolheu é commodity.** Cardápio digital e cartaz de oferta são exatamente onde a pressão de preço é máxima: [[concorrentes-e-mercado-signage]] registra Yodeck a **USD 8 por tela/mês**, e a alternativa gratuita óbvia (Canva + Chromecast) resolve "colocar uma arte na TV" sem pagar nada. Competir ali é corrida ao fundo contra players com escala global e contra o grátis. O bloco de BI, ao contrário, é onde o TelaHub já gastou o esforço e onde o comprador tem outra referência de preço — porque o que ele compara não é com o Canva, é com o custo de alguém atualizar aquele número no quadro branco toda manhã.

**Implicação comercial nº 2 — a aritmética de ticket.** ⚠️ **Estimativa, com as premissas ao lado — nenhum destes cenários tem cliente pagante por trás.**

| Cenário | Premissa | Contas para ~R$ 10 mil de MRR |
|---|---|---|
| Pacote fixo por conta | R$ 69/conta/mês (o preço que a landing antiga anunciava) | **~145 contas** |
| Operação, por tela | R$ 79/tela com média de **5 telas** por conta → R$ 395/conta | **~25 contas** |
| *Referência: preço decidido hoje* | R$ 39/tela (Rede) × 5 telas = R$ 195/conta | ~51 contas |

Premissas explícitas, todas derrubáveis: média de 5 telas por conta é chute (não há base instalada); R$ 79 é um preço hipotético de reposicionamento, **não uma decisão** — o preço decidido continua sendo o da seção 2.3; e a conta ignora churn, inadimplência e o desconto negociado que uma venda consultiva costuma conceder. O ponto da tabela **não é o número**, é a ordem de grandeza: a diferença entre precisar de ~145 clientes e de ~25 é a diferença entre um negócio que exige máquina de aquisição e um que cabe na agenda de um fundador vendendo à mão — que é exatamente a estratégia nº 2 da seção 2.6.

**A pesquisa não contradiz a hipótese.** A faixa aceita no varejo brasileiro mapeada em [[concorrentes-e-mercado-signage]] é de **R$ 30 a R$ 110 por tela/mês**. Um preço de R$ 79–99 fica no **topo** dessa faixa, ainda dentro dela — coerente com um posicionamento de BI operacional, e incoerente com um posicionamento de desconto. Ou seja: o mercado comporta o preço que a hipótese pediria. Isso é ausência de contradição, não confirmação.

#### A ressalva, com o mesmo peso do achado

**Isto é leitura de código, não leitura de cliente.** O que o inventário de widgets prova é onde o esforço de engenharia foi parar — provavelmente refletindo o que o próprio dono achou útil, o que é um sinal legítimo, mas é **um** ponto de dado, não demanda de mercado. Nada aqui mostra que exista alguém disposto a pagar R$ 79 por tela para ver Power BI numa TV.

O vault de negócio é enfático nos dois pontos que exatamente se aplicam aqui:

- **Ausência de Product-Market Fit mata 42–43% das startups** (`caminho-ao-sucesso-erros-comuns.md`) — é a causa nº 1, acima de falta de caixa. Reposicionar com base em inferência de código é trocar um palpite por outro palpite.
- **Elogio não é validação** (`fundamentos-empreendedorismo.md`, o "ouro dos tolos"). O instrumento é o **Sean Ellis Test**: ≥40% de "muito decepcionado" se o produto sumisse. "Que legal, isso puxa meu Power BI?" não é dado.

**Recomendação registrada: validar antes de mexer.** Fazer **10 a 15 conversas de descoberta** com o segmento de operação (quem já usa Power BI/planilha para acompanhar meta, e hoje imprime ou não olha) **antes** de alterar preço, antes de reescrever as páginas de venda e antes de escolher a vertical da seção 3.1. O custo de conversar é uma semana; o custo de reposicionar sobre uma hipótese errada é o ciclo inteiro. As três perguntas que a conversa precisa responder: quem hoje sofre o suficiente para pagar, quanto essa dor já custa em tempo de alguém, e o que a pessoa usa hoje no lugar.

> **A decisão de eixo do produto — gestão à vista ou varejo — está em aberto e é do dono do projeto.** Esta seção registra a hipótese, a evidência que a sustenta e o que falta para testá-la. Ela deliberadamente **não escolhe**, pelo mesmo motivo da seção 3.1: a escolha muda comprador, ciclo de venda, preço e roadmap ao mesmo tempo. Ver a decisão em aberto na seção 3.3.

---

## 3. Decisões em aberto (e uma lacuna já fechada)

### 3.0 A lacuna de concorrentes foi FECHADA em 2026-07-25

Esta seção registrava, até 2026-07-25, que não sabíamos quem eram os concorrentes, o que cobravam, qual era a âncora de EVC, quais gateways usar nem que exigências legais incidiam — porque o vault `8 - Marca De Sucesso` só tem cases de marcas de consumo (Nubank, Duolingo, Gymshark, Sallve, Havaianas), nenhum competidor de digital signage.

**Isso não está mais em aberto.** As duas deep researches do NotebookLM (notebook `720c999a-c1b9-4333-8308-17377bc326da`) chegaram e foram processadas em **[[concorrentes-e-mercado-signage]]**, que cobre: nove provedores globais com preço/plano grátis/trial/white label/hardware, seis players brasileiros, os quatro grupos de atrito que causam churn no setor, o dimensionamento do mercado BR, oito verticais de varejo com ticket aceito, ISS/NFS-e, CDC e LGPD, cinco gateways comparados e cinco táticas de go-to-market orgânico.

Consequências já aplicadas nesta página: âncora de EVC na seção 2.1, confirmação do padrão por tela na 2.2, **preços corrigidos na 2.3**, decisão anti-cobrança-retroativa na 2.3.1, unit economics recalculada na 2.4, e as táticas orgânicas na 2.6.

### 3.1 Escolha da vertical de foco — em aberto por decisão do dono

A pesquisa entregou a tabela de oito verticais brasileiras com nível de adoção, quem decide e ticket aceito por tela ([[concorrentes-e-mercado-signage]], seção 5.2). Havia material suficiente para recomendar uma.

**A decisão foi deliberadamente adiada pelo dono do projeto:** *"depende do cliente, definimos depois."*

Isso está registrado aqui como decisão, não como esquecimento — para que ninguém, ao ler em seis meses, ache que a vertical foi escolhida em silêncio ou que a análise falhou. A tabela fica disponível para quando a definição vier. **Ninguém deve escolher a vertical por ele**, inclusive porque a pesquisa mostra que a escolha muda o processo de venda inteiro: nas verticais em que decide o **dono** (food service, supermercado de bairro, academia, ótica) a venda se fecha numa conversa; nas em que decide **diretor comercial/expansão/suprimentos** (farmácia, franquia, autopeças) o ciclo é mais longo e envolve mais gente.

### 3.2 Gateway de pagamento — adiado para um segundo ciclo, por decisão do dono

A pesquisa comparou cinco gateways (Asaas, Iugu, Stripe Brasil, Pagar.me, Mercado Pago) com taxas de boleto, Pix e cartão, e é explícita em dois pontos: **boleto e Pix recorrente são essenciais no B2B brasileiro** (cartão isolado derruba a conversão) e **CNPJ é pré-requisito** — Asaas, Iugu, Stripe e Pagar.me restringem severamente contas de CPF. Ver [[concorrentes-e-mercado-signage]], seção 7.

**A integração ficou para um segundo ciclo, por decisão do dono do projeto.** Até então, `POST /api/billing/checkout` responde **501 honesto** (`backend/src/routes/billing.routes.ts`) — a rota existe, valida o corpo e devolve explicitamente que o checkout ainda não está disponível porque a integração com o gateway não foi feita. Isso é melhor que uma rota falsa ou um botão que não faz nada, mas não muda o fato essencial:

> **Sem gateway não há receita.** A infraestrutura de planos e quota existe, o preço está decidido, a landing está corrigida — e ainda assim nenhum real entra na conta enquanto o checkout devolver 501. A meta de **50 clientes pagantes** é literalmente inalcançável até este item ser feito. É o gargalo único entre o produto e o primeiro faturamento.

Três fatos verificados em 2026-07-25 que compõem esse gargalo, para que ninguém confunda "temos planos" com "temos receita":

1. **`POST /api/billing/checkout` responde 501** (`backend/src/routes/billing.routes.ts:177`), com teste que fixa esse comportamento (`billing.test.ts:189`) justamente para impedir que alguém "destrave" o fluxo simulando pagamento aprovado.
2. **Nenhuma assinatura transiciona de status sozinha.** Não há webhook de gateway, não há job de cobrança; `Subscription.status` só muda por escrita explícita do código (a migração `trial` → `gratis` do seed é o exemplo). Ou seja: ninguém vira pagante, e ninguém é suspenso por inadimplência.
3. **Os CTAs de plano levam a cadastro, não a pagamento.** Nos cards Loja e Rede da landing o botão é "Começar de graça e ativar telas" → `/signup`; só o Enterprise vai para e-mail comercial. Isso é honesto — não há botão "Assinar" fingindo um checkout que não existe — mas significa que **o funil termina no cadastro grátis**. Toda conversão medida hoje é conversão para R$ 0.

O item (3) tem consequência direta sobre o smoke test da seção 2.7: a régua de ">3% de conversão qualificada" mede, hoje, intenção de experimentar — não disposição a pagar. São coisas diferentes, e só a segunda valida o preço.

Quando o ciclo abrir, dois itens andam juntos e não podem ser separados: **o gateway e a emissão automatizada de NFS-e** (ISS de 2% a 5%, nota obrigatória a cada ciclo de assinatura, emissão manual inviável em escala). Ver seção 6.1 da página de mercado.

### 3.3 Eixo do produto: gestão à vista ou cartaz de varejo — em aberto, decisão do dono

Aberta em 2026-07-25 pela seção 2.8. O inventário de widgets sugere que o produto construído é um **painel de gestão à vista com BI embarcado**, enquanto a comunicação vende **cartaz digital de varejo**. As duas leituras levam a preços, compradores e roadmaps diferentes:

| | Eixo "gestão à vista / BI" | Eixo "varejo / cartaz" |
|---|---|---|
| Referência de preço do comprador | custo de manter o número atualizado à mão | Yodeck USD 8, Canva + Chromecast grátis |
| Onde a engenharia já está | ✅ o bloco maior de widgets | ⚠️ só os primitivos do canvas |
| Faixa de preço plausível | topo da faixa BR (R$ 79–110) | fundo da faixa (R$ 30–49) |
| O que falta construir | gate de feature (seção 1.5), conectores | biblioteca de templates, menu board |

**Nada disto está decidido.** O pré-requisito registrado é o da seção 2.8: **10–15 conversas de descoberta antes de mexer em preço ou em posicionamento.** Esta decisão está encadeada com a 3.1 (vertical de foco) — na prática é a mesma pergunta feita um nível acima, e faz sentido resolver as duas na mesma rodada de conversas.

### 3.4 O que continua realmente desconhecido

- **COGS reais** (R2, VPS, e-mail transacional, gateway, suporte) — a margem de 80% da seção 2.4 é premissa.
- **Churn real** — não há cliente pagante, logo não há histórico.
- **Operação offline de verdade no player.** A pesquisa aponta "confiabilidade com operação offline" como um dos **três pilares de decisão do pequeno varejista**, e a seção 1.4 desta página registra que isso está na landing **sem contrapartida no código**. É lacuna de produto, não de conhecimento — mas é a que mais pesa contra a decisão de compra do público-alvo.

---

## Ver também

- [[concorrentes-e-mercado-signage]] — a base de mercado desta página: nove concorrentes globais com preço, seis players brasileiros, os quatro grupos de atrito/churn do setor, verticais e ticket aceito, ISS/CDC/LGPD, gateways e go-to-market orgânico.
- [[canais-de-venda-e-landings]] — as superfícies de venda e o que cada uma afirma; é lá que se verifica se o preço decidido na seção 2.3 está espelhado corretamente em cada canal.
- [[seguranca-e-conformidade-tecnica]] — o lado técnico do que a seção 1.5 (gate no servidor) e a 1.1 (escopo de tenant) exigem.
- [[funcionalidades-produto]] — o que o produto faz; a leitura do inventário de widgets da seção 2.8 tem lá um resumo curto, com o argumento completo aqui.
- [[arquitetura-e-entidades]] — modelo de domínio e o gap #3 ("Multi-loja concluído") que a seção 1.1 desta página corrige.
- [[oportunidades-ux]] — a landing como superfície de conversão; a correção de veracidade da seção 1.4 é pré-requisito de qualquer teste de conversão.
- [[Kanban-TelaHub]] — onde o trabalho de código disparado por esta análise (isolamento de tenant, planos/quota, cadastro self-service, correção da landing) é acompanhado.
