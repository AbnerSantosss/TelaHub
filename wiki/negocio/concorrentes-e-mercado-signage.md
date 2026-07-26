---
tipo: negocio
atualizado: 2026-07-25
tags: [concorrentes, mercado, precificacao, digital-signage, brasil, churn, gateways, lgpd, cdc, iss, go-to-market]
sources:
  - raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md
  - raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md
---

# Concorrentes e Mercado de Digital Signage — global e Brasil

Esta página fecha a **lacuna que [[modelo-comercial-e-precificacao]] declarava em aberto** na sua seção 3: até 2026-07-25 não havia nenhuma análise de concorrentes de digital signage na wiki, e os preços do TelaHub tinham sido definidos sem âncora de mercado.

Fonte: duas deep researches do NotebookLM entregues em 2026-07-25 (notebook `720c999a-c1b9-4333-8308-17377bc326da`), salvas como fontes brutas imutáveis:

- `raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md` — 81 fontes; 9 provedores globais, players brasileiros e 4 grupos de atrito/churn.
- `raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md` — 20 fontes; dimensionamento do mercado BR, verticais de varejo, gateways de pagamento, ISS/CDC/LGPD e go-to-market orgânico.

**Convenção de moeda:** os preços dos provedores globais estão em **USD porque é assim que eles publicam**. Nenhum foi convertido para BRL — a pesquisa não traz câmbio e inventar um produziria número falso com aparência de fato. Onde a fonte deu valor em BRL (verticais brasileiras, hardware, gateways), o valor está em BRL. Se alguém precisar de ordem de grandeza, converta explicitando a taxa usada e marque como aproximação.

---

## 1. Contexto de arquitetura: nuvem, TCO e o dilema do hardware

Antes dos preços, dois fatos estruturais do setor que explicam por que os preços são como são:

- O setor migrou de servidores locais (*on-premise*) para SaaS em nuvem, o que derrubou a barreira de entrada de CAPEX para PMEs. Em troca, criou o problema do **TCO**: a tarifa recorrente **por tela** acumula OPEX indefinidamente à medida que a frota cresce.
- Duas abordagens de hardware disputam o mercado: **SoC integrado** em displays comerciais (Samsung Tizen, LG webOS) — sem player externo, menos pontos de falha — e **BYOD de consumo** (Android TV/Google TV, Amazon Fire OS) — custo inicial mínimo, estabilidade ruim em regime 24/7. Esse segundo caminho é a origem do grupo de atrito nº 3 da seção 4.

---

## 2. Concorrentes globais

Nove provedores. Todos cobram **por tela ativa/mês** e **nenhum exige cartão de crédito no cadastro do trial** — vale registrar isso porque era uma dúvida de desenho do TelaHub e a resposta do mercado é unânime.

| Provedor | Preço por tela/mês | Plano gratuito | Trial | Exige cartão? | White label | Hardware do player |
|---|---|---|---|---|---|---|
| **Yodeck** (Grécia) | USD 8 Basic / 12 Premium / 16 Enterprise (anual); mensal sem fidelidade USD 8 / 11–12 / 15–16 | **Sim, vitalício, exatamente 1 tela** (recursos Basic) | 30 dias, até 5 telas, recursos Premium | Não | Sob consulta (Enterprise); **restringe apps premium de terceiros** (ex.: ScreenFeed) em contas de revenda | Raspberry Pi próprio (Yodeck Player) **incluído grátis no plano anual** — 1 GB no Basic, 4 GB no Premium/Enterprise; fora do plano, USD 79 / USD 119. Rescisão antes de 12 meses obriga devolver o hardware sob multa. Também roda Android, Windows e Smart TVs |
| **ScreenCloud** (Londres) | USD 20 Core / 30 Pro (anual); mensal USD 24 / 36. **Enterprise exige mínimo de 25 telas**, sob cotação | **Não** | 14 dias | Não | Não nos planos Core/Pro; só Enterprise, negociado caso a caso | BYOD amplo (Tizen, webOS, Android TV, Fire OS, Windows, macOS); player próprio USD 299–549 |
| **OptiSigns** (Houston) | USD 10 Standard / 15 Pro / 30 Engage / 45 Enterprise (mensal); anual USD 9 / 13,50 / 27 / 40,50. Enterprise exige 25 telas | **Sim, até 3 telas** | 14 dias | Não | *Branded Portal* no Pro Plus; **domínio próprio é add-on de USD 10/mês**; WL integral só Enterprise | O mais permissivo: Fire TV Stick, Android TV, Chromecast, Windows, macOS, Linux, Raspberry Pi, BrightSign, Apple TV, Tizen, webOS. **Videowall custa USD 25/mês extra** |
| **Xibo** (open source) | **CMS auto-hospedado gratuito sob AGPLv3**; Cloud CMS USD 4,90 Professional / 7,70 Business / 12,60 Enterprise. Sem desconto anual na nuvem | Sim, na prática: o CMS auto-hospedado é gratuito por tempo ilimitado | 14 dias na nuvem (Professional, 2 dispositivos, 1 GB storage, 4 GB banda) | Não | Sim, completo — mas cobrado em **USD 210/mês por painel concorrente, mínimo de 5 painéis (USD 1.050/mês)** | Player Windows gratuito (AGPLv3). Players Android/webOS/Tizen/ChromeOS são **proprietários e pagos**: licença perpétua USD 28 (Android), 49 (ChromeOS), 85 (webOS/Tizen); ou assinatura USD 1,50/tela/mês Android (mín. 10), USD 6,00 webOS/Tizen (mín. 3) |
| **NoviSign** (EUA, desde 2011) | USD 18 Business / 26 Business Plus / 44 Premium (anual). Mensal puro sob consulta | **Não** | 30 dias, recursos integrais (limite de 80 MB de storage e 16 MB por arquivo) | Não | **O melhor programa de marca própria do setor**: plano Partner com instância 100% sem menção à NoviSign, no domínio do revendedor, painel de subcontas, licenças com um clique, **construtor de planos de faturamento próprios**, kit de marketing. **Sem taxa adicional** para liberar o WL | Android, Chrome OS, Windows; Smart TVs comerciais, tablets, players industriais |
| **Rise Vision** (educação/K-12) | Corporativo: USD 12 Basic / 14 Advanced / 180 por tela/**ano** Enterprise. K-12/universidades/filantropia: USD 11 / 13 / 164 por tela/ano. **Licença fechada de USD 1.399 por escola/ano com telas ilimitadas** | **Não** | 14 dias | Não | Sim, via subcontas para distritos/filiais | Windows, Android, Raspberry Pi, Chrome OS, Fire OS, BrightSign, Apple TV, Airtame, Amazon Signage Stick; vende ou oferece em HaaS o Rise Vision Media Player (disco criptografado, sem portas lógicas abertas) |
| **Look DS** | USD 15 PRO; anual com 10% de desconto → USD 13,50. Também vende licença perpétua on-premise sob cotação | **Sim, vitalício, exatamente 1 tela** | 14 dias | Não | Programa estruturado para agências/integradores: CMS em marca e domínio próprios, subcontas, margens de desconto. **Diferencial único: cobrança integrada nativamente a Stripe e PayPal**, com repasse automático da margem ao revendedor; player Android com a marca do parceiro na conta dele do Google Play. Exige **depósito de entrada** (revertido em crédito) e **curso + prova obrigatórios** antes de liberar a venda | Android TV, Fire OS, Chromecast, Windows, Linux, macOS, iOS |
| **Navori** (consultivo, DOOH/enterprise) | USD 14 a 20, licenciamento consultivo; on-premise sob condições personalizadas | **Não** | 30 dias, mediante agendamento com o time técnico | Não | Restrito a Enterprise e grandes canais | Windows, Android, Tizen, webOS, BrightSign, player próprio Navori Stix |
| **Pickcel** (ISO + SOC 2) | USD 15 Professional (mensal); anual com 10% → USD 13,50 Professional e USD 22,50 Business. Enterprise sob cotação | **Não** | 14 dias, até 2 telas, recursos totais | Não | Sem portal de WL self-service; só implantações Enterprise sob medida | Android, Windows, BrightSign, Linux, Tizen, webOS, iOS, Fire TV, Chrome OS; player próprio PX300 por USD 180 |

**Ambiguidade registrada na fonte (Pickcel):** o relatório sinaliza divergência de dados — portais secundários e revisões antigas listam planos Standard de USD 9,99 e Professional de USD 15,00, enquanto o portfólio oficial atual corresponde a USD 13,50 e USD 22,50 no anual. A tabela acima usa os valores oficiais atuais. **Não tratar o número da Pickcel como firme** sem reconferir na página de preços dela.

### Leituras que importam para o TelaHub

1. **Faixa de preço global:** de USD 4,90 (Xibo Cloud, o piso) a USD 20–30 (ScreenCloud, o teto do self-service). A mediana do self-service fica em torno de **USD 12–15 por tela/mês**.
2. **Plano gratuito vitalício de 1 tela é prática estabelecida** — Yodeck e Look DS fazem exatamente isso; OptiSigns vai a 3 telas. Não é generosidade excêntrica, é o padrão de aquisição do setor.
3. **Ninguém pede cartão no trial.** Exigir cartão colocaria o TelaHub abaixo do padrão de mercado.
4. **Modelos alternativos à cobrança linear existem e funcionam** como argumento comercial: a licença flat de USD 1.399/escola/ano da Rise Vision e o CMS gratuito do Xibo são as duas fugas conhecidas do "por tela".
5. **White label é área com brecha:** dos nove, só NoviSign e Look DS têm programa de revenda realmente self-service, e só Look DS resolve o **faturamento** do revendedor (Stripe/PayPal integrados). Todos os outros trancam WL em Enterprise sob consulta.

---

## 3. Players brasileiros

| Player | Sede / foco | Modelo comercial | Diferencial declarado |
|---|---|---|---|
| **Screencorp** | São Paulo, fundada 2012; comunicação interna, RH e marketing | Consultivo por volume de telas, integrado a canais auxiliares (app mobile para funcionários, push, SMS corporativo) | +70 layouts prontos, segmentação automática de notícias por geolocalização da tela, conformidade LGPD |
| **4YouSee** | Belo Horizonte, fundada 2006; varejo físico e DOOH | Licenças dimensionadas por volume de displays | Medição de ROI publicitário no PDV, análise estatística de exibição; atende QSR, postos de combustível, totens em terminais |
| **Progic** | Florianópolis; TV corporativa e endomarketing | Pacote mensal único: plataforma + biblioteca de conteúdo + suporte | Mídias prontas atualizadas diariamente, canais de notícias/clima, layouts de "gestão à vista" com KPIs do cliente. **Vende players próprios** justamente para evitar travamento de BYOD |
| **Wiplay** | Mural eletrônico de RH/endomarketing, empresas médias e grandes | Consultivo | Canais internos interativos de engajamento |
| **B2 Mídia** | TV corporativa, painéis sob medida | Consultivo | Videowalls sincronizados e painéis de LED para shoppings e ambientes corporativos |
| **ImidiaTV (Pix Mídia)** | Soluções web ágeis | Modelo simplificado de autosserviço | Players leves Android/Windows, simplicidade de manuseio |

### Implicação estratégica — a brecha

**Nenhum dos seis publica preço de autoatendimento.** Todos operam consultivamente, por volume de telas, com cotação. O que eles vendem como diferencial é **biblioteca de conteúdo pronto** (para clientes sem equipe de criação) e **conformidade LGPD**.

Portanto: **não existe concorrente nacional com autoatendimento e preço público.** Quem quer contratar signage no Brasil hoje precisa (a) pedir orçamento a um player nacional e esperar, ou (b) usar uma plataforma global em inglês, com preço em dólar, sem NFS-e e sem boleto/Pix.

Essa é a brecha real e é dupla: **preço público + cadastro self-service + meios de pagamento brasileiros**. É defensável contra os nacionais (que não querem descer para o ticket pequeno) e contra os globais (que não vão emitir NFS-e municipal nem aceitar boleto).

Ressalva de honestidade: a pesquisa cobre seis players e afirma que o mercado é "altamente maduro". Não é um censo. A afirmação "não há concorrente nacional com preço público" é válida para os players mapeados — se aparecer um, ela precisa ser revista, não defendida.

### Esclarecimento: "TelaVip" não é concorrente

Registrado aqui para ninguém gastar tempo pesquisando de novo. **"TelaVip" não existe como software de digital signage**, nacional ou internacional. As empresas com esse nome são homônimos de setores completamente diferentes:

1. **Tela Vip Digital** (Santos, SP) — estúdio físico de gravação audiovisual, alugado por turnos para podcasts, videoaulas e vídeos verticais.
2. **Servicios TelaVip / Corporación TelaVip** (Caracas, Venezuela e Colômbia) — engenharia eletrônica de segurança: CFTV, cercas elétricas, portões automáticos, centrais telefônicas analógicas, alarmes.

---

## 4. Os 4 grupos de atrito que causam churn no setor

Mapeados a partir de reclamações e avaliações em G2, Capterra, Trustpilot e comunidades de TI (Reddit). Cada um vem com a leitura de oportunidade para o TelaHub — é daqui que sai a diferenciação defensável, porque **são dores dos clientes dos concorrentes, não hipóteses nossas**.

### 4.1 Acúmulo da cobrança linear por tela

A tarifa por tela parece barata no primeiro display e vira um fardo quando a rede cresce. Frotas de 100 a 300 telas geram custo anual alto que **nunca se converte em ativo permanente**. O exemplo concreto da fonte: **100 telas no plano Pro da ScreenCloud = USD 36.000/ano, sem impostos**. É a queixa mais recorrente de gestores de infraestrutura e o principal gatilho de busca por alternativa — seja taxa de rede fixa (o flat da Rise Vision para K-12) ou baixo licenciamento (Xibo, open source).

Um subcaso é a **perda abrupta do benefício gratuito**: no Yodeck, conectar uma segunda tela revoga a gratuidade **e passa a faturar retroativamente todas as telas, inclusive a primeira**. É a reclamação nº 1 contra o produto.

> **Oportunidade TelaHub:** plano por **faixa de telas** ou **flat** como alternativa ao linear puro, e — imediatamente — a garantia explícita de **não haver cobrança retroativa** ao sair do plano gratuito. Ver [[modelo-comercial-e-precificacao]].

### 4.2 Feature-gating de governança e segurança

SSO/SAML, provisionamento SCIM, RBAC hierárquico e **logs de auditoria** são retidos deliberadamente nos planos Enterprise mais caros por ScreenCloud, Yodeck e OptiSigns. Para uma equipe de TI isso não é conveniência, é requisito.

O efeito colateral é o que interessa: em vez de pagar Enterprise, as equipes **compartilham uma credencial administrativa genérica** entre funcionários de marketing local. Isso aumenta risco real de violação e de exibição acidental de mídia imprópria numa tela pública. A fonte aponta que empresas migram por causa disso para concorrentes que entregam governança nos planos iniciais (cita o Kitcast como exemplo).

> **Oportunidade TelaHub:** incluir **auditoria e papéis nos planos baixos**. O produto acabou de ganhar a entidade **`AuditLog`** (`backend/prisma/schema.prisma`, modelo `AuditLog`, relação `User.auditLogs`) — ou seja, a capacidade existe e a decisão de não trancá-la atrás de um plano caro é uma escolha de posicionamento contra o padrão do setor, não uma limitação.

### 4.3 Instabilidade de players BYOD de consumo

Dongles domésticos (Google TV / Android TV, Amazon Fire Stick) são fonte comum de chamado de manutenção. Não foram projetados para operação 24/7: sofrem **estrangulamento térmico**, travam e fecham o app de sinalização. E o pior — quando o player de consumo falha, **a tela pública exibe a interface residencial do aparelho, com recomendações e anúncios**, na frente do cliente do lojista. Além do dano de imagem, gera custo de visita técnica presencial só para reiniciar o aparelho (MTTR alto).

> **Oportunidade TelaHub:** este é exatamente o cenário que o **alerta de tela offline** cobre, e é por isso que ele foi escolhido como o diferencial central em [[modelo-comercial-e-precificacao]] (seção 2.1). O ponto de venda não é "nosso player não travará" — é "**você vai saber no minuto em que travar**". Isso é verificável, já está implementado (heartbeat + e-mail, ver [[arquitetura-e-entidades]]) e é demonstrável numa call de cinco minutos.

### 4.4 Empilhamento de taxas extras (add-ons)

Cobrar mensalidade adicional para recursos básicos desgasta a relação comercial. Casos concretos da fonte:

- **OptiSigns: USD 25/mês por videowall** e **USD 10/mês por mapeamento de domínio próprio** de login; mais canais de música de fundo e portais interativos.
- **Yodeck:** feeds visuais de terceiros (ScreenFeed) cobrados como taxa progressiva por tela ativa.

O resultado é que o preço de entrada baixo é anulado, e o cliente percebe as taxas como cobrança por algo que deveria estar incluído. Isso motiva migração para plataformas de **tarifa única transparente** (*flat rate*).

> **Oportunidade TelaHub:** **tarifa única, sem add-on.** Nada de cobrar separado por domínio, videowall ou widget. É uma promessa fácil de manter agora (o produto não tem add-ons) e difícil de reverter depois — logo, é uma decisão de posicionamento a registrar explicitamente antes que a tentação de fatiar apareça.

---

## 5. Mercado brasileiro: tamanho, verticais e critérios de decisão

### 5.1 Dimensionamento

| Mercado | 2026 | 2031 | CAGR | Posição |
|---|---|---|---|---|
| **Brasil** | USD 248,4 M | USD 342,1 M | **5,5%** | Líder da América do Sul |
| Argentina | — | USD 211,6 M | — | Secundário emergente |
| Restante da América do Sul | — | USD 141,0 M | — | Potencial de expansão |
| América do Sul (consolidado) | USD 212,9 M | USD 273,7 M | 4,3% | — |

Vetores de crescimento apontados: urbanização, modernização de infraestrutura, migração de orçamento de mídia impressa para mídia dinâmica no PDV, queda do custo de hardware de exibição e ROI comprovável (mais venda + menos custo logístico de impressão).

Nota de leitura: a tabela da fonte é inconsistente entre linhas (Brasil + Argentina projetados para 2031 somam mais que o consolidado da região, e os valores de 2026 de Argentina/resto não são informados). Trate os números como **ordem de grandeza de relatório de mercado**, não como contabilidade — o dado útil aqui é "algumas centenas de milhões de USD, crescendo perto de 5% ao ano, com o Brasil na liderança regional".

### 5.2 Verticais de varejo brasileiro

| Vertical | Adoção | Quem decide | Caso de uso principal | Ticket aceito por tela/mês |
|---|---|---|---|---|
| **Food service / restaurantes** | Muito alto | Proprietário / gerente de operações | Menu boards dinâmicos e precificação por horário (*dayparting*) | **R$ 40 – 90** |
| **Franquias** | Alto | Diretor de expansão / marketing | Governança de marca e gestão remota de várias lojas | **R$ 35 – 80** |
| **Farmácias** | Alto | **Diretor comercial / compras** | Integração com senhas de atendimento e monetização via trade marketing | **R$ 50 – 100** |
| **Supermercados de bairro** | Alto | Proprietário / diretor de operações | Promoção instantânea de perecíveis e anúncio de fornecedores | **R$ 45 – 95** |
| **Academias** | Médio | Proprietário / gestor de unidade | Entretenimento dos alunos e grade de aulas coletivas | **R$ 30 – 70** |
| **Clínicas / saúde** | Médio | Administrador / diretor de operações | Gestão de fila, redução da percepção de espera, promoção de serviços | **R$ 40 – 85** |
| **Óticas** | Médio-baixo | Proprietário | Estética de vitrine e campanhas de lançamento | **R$ 50 – 110** |
| **Autopeças** | Baixo | Diretor de suprimentos / TI | Apoio à venda técnica e oferta de estoque excedente | **R$ 35 – 75** |

Faixa geral de prateleira praticada no Brasil, segundo a mesma fonte: **R$ 25 a R$ 150 por tela/mês**, dependendo do volume.

Observação de venda: as verticais de **maior ticket não são as de maior adoção**. Óticas (R$ 50–110) e farmácias (R$ 50–100) pagam mais que food service (R$ 40–90), mas food service é a que já está convencida. E o **decisor muda**: em food service, supermercado, academia e ótica é o **dono** — venda de uma conversa; em farmácia, franquia e autopeças é **diretor comercial/expansão/suprimentos** — ciclo mais longo, mais gente na sala.

### 5.3 Os 3 pilares de decisão do pequeno varejista

Em pequenas redes e comércio local, quem decide é o proprietário ou o diretor de operações, e os critérios são simplicidade operacional e menor TCO. A decisão se apoia em três pilares:

1. **Facilidade de uso sem TI** — CMS em nuvem estável e intuitivo, com templates prontos e editor integrado, que **dispense treinamento especializado**. O funcionário da loja tem que conseguir mexer.
2. **Confiabilidade com operação offline** — o dispositivo precisa **baixar a playlist localmente** e continuar rodando quando a internet da loja cair. Não é recurso avançado, é requisito de compra.
3. **Hardware barato de mercado** — preferência explícita por rodar em dongle popular (Fire OS, caixa Android TV) em vez de exigir player industrial proprietário caro.

> Atenção de consistência: o pilar 2 (**offline real**) está na lista de promessas que [[modelo-comercial-e-precificacao]] (seção 1.4) identificou na landing **sem contrapartida no código**. Ou seja: é ao mesmo tempo um dos três critérios de compra do público-alvo e uma capacidade que o produto ainda não tem. Isso é uma lacuna de produto de prioridade alta, não um detalhe de marketing.

Em médias redes e franquias, a decisão passa a envolver três áreas: Marketing (branding/promoção), TI (segurança de rede e compatibilidade com legado) e Compras (desconto por volume).

### 5.4 Componentes de TCO (referência para argumentar preço)

A fonte formaliza o TCO em 36 meses como `(display + player + instalação) × telas + 36 × (SaaS × telas) + conteúdo + manutenção`, com estas faixas em BRL:

- **Display:** R$ 1.200–2.500 (TV de consumo) ou R$ 4.000–12.000 (profissional 16/7 ou 24/7).
- **Player:** R$ 300–600 (dongle de mercado, ex. Fire TV Stick) ou R$ 1.500–4.000 (industrial Windows/Linux).
- **Instalação por ponto:** R$ 300–1.500 (suporte, cabo HDMI, tomada, mão de obra).
- Mais criação de conteúdo e manutenção/troca de hardware.

Uso prático: **a mensalidade do software é a menor parcela do TCO**. Numa negociação, R$ 49/tela/mês contra um display + instalação de R$ 2.000–4.000 é ruído. Esse é o argumento contra o reflexo de apertar o preço do SaaS.

---

## 6. Conformidade brasileira

Três frentes. Nenhuma é opcional para cobrar de CNPJ brasileiro.

### 6.1 ISS e NFS-e (Lei Complementar nº 116/2003)

SaaS no Brasil não é venda de mercadoria: é licenciamento/cessão de direito de uso de programa de computador. Logo incide **ISS municipal**, e não ICMS.

- **Alíquota de 2% a 5% sobre a receita bruta mensal**, conforme o município da sede fiscal. `ISS = Receita Bruta × alíquota`.
- **A cada ciclo de renovação** da assinatura, é obrigatório emitir **NFS-e** contra o CNPJ (ou CPF) do cliente.
- **A emissão manual é inviável em escala.** Exige integração do gateway ou do ERP de faturamento com as APIs das prefeituras, via emissor dedicado.

Consequência de projeto: emissão de nota é **parte da infraestrutura de cobrança**, não uma tarefa de contabilidade a resolver depois. Quem escolher o gateway precisa escolher junto o caminho da NFS-e.

### 6.2 Código de Defesa do Consumidor (Lei nº 8.078/1990)

Os tribunais brasileiros estendem com frequência a proteção do CDC a microempresas e pequenos comércios em relações B2B, quando reconhecem hipossuficiência técnica, econômica ou jurídica do comprador frente ao desenvolvedor. Ou seja: vender para lojinha não isenta do CDC.

- **Art. 49 — direito de arrependimento de 7 dias:** o cliente pode cancelar unilateralmente em até sete dias do pagamento inicial ou da ativação, **com devolução integral**. O fluxo de onboarding e cobrança tem que suportar isso nativamente.
- **Arts. 30 e 37 — a publicidade vincula o contrato:** todo anúncio, tutorial e apresentação de vendas publicado no site passa a integrar as cláusulas do contrato de adesão. Prometer funcionalidade indisponível (o exemplo da fonte é literalmente "compatibilidade universal sem hardware externo") caracteriza propaganda enganosa, obrigando a reembolso e permitindo rescisão sem multa.

**Esta é a razão jurídica da limpeza da landing** descrita em [[modelo-comercial-e-precificacao]] (seção 1.4): remover white label, SSO/SAML/LDAP, 2FA, domínio personalizado, SLA 99,9%, player Android TV nativo, cache offline, o depoimento fabricado e o selo "MAIS VENDIDO" com preço riscado não foi escrúpulo de marketing — era exposição a arts. 30/37.

### 6.3 LGPD (Lei nº 13.709/2018)

Papéis no B2B, e importa saber qual é o nosso:

- **Controlador = o lojista cliente.** Ele decide quais dados de funcionários e clientes vão para o sistema para exibição ou monitoramento.
- **Operador = o TelaHub.** Tratamos dados **exclusivamente conforme as instruções lícitas do controlador**. Precisamos de termos de uso e contrato de tratamento robustos para mitigar juridicamente eventual abuso praticado pelo próprio controlador nas telas.

Obrigações:

- **15 dias** é o prazo máximo da ANPD para responder requisições de titulares (art. 18: confirmação de existência, acesso, correção).
- Manter e atualizar o **RoPA** (Registro de Operações de Tratamento), mapeando a jornada do dado da coleta ao descarte.

**Alívio da Resolução CD/ANPD nº 02/2022** — vale para **agente de tratamento de pequeno porte** (receita bruta anual até R$ 4,8 milhões, ou até R$ 16 milhões para startup qualificada pelo Marco Legal das Startups). O TelaHub se enquadra hoje:

- **Dispensa de nomear DPO/encarregado**, desde que mantido um **canal digital estruturado** de privacidade para clientes e titulares.
- **Prazos em dobro** para requisições de titulares e notificações à ANPD.
- **Notificação de incidente de segurança em 6 dias úteis** (contra 3 dias úteis da regra geral).

| Frente | Norma | Obrigação | Prazo / número |
|---|---|---|---|
| Tributação | LC 116/2003 + prefeituras | Emitir NFS-e a cada ciclo, recolher ISS | 2% a 5% da receita bruta; exige automação via API |
| Consumidor | CDC 8.078/1990 | Arrependimento e veracidade dos anúncios | 7 dias para reembolso incondicional |
| Dados | LGPD 13.709/2018 + ANPD | RoPA, direitos dos titulares, contrato operador/controlador | 15 dias para responder titular |
| Alívio para startup | Res. CD/ANPD 02/2022 | Canal de privacidade em vez de DPO fixo | Prazos em dobro; 6 dias úteis para incidente |

---

## 7. Gateways de pagamento

### Meios de pagamento essenciais no B2B brasileiro

O mercado brasileiro é diferente do internacional: SaaS global roda quase inteiramente em cartão de crédito corporativo, e a PME brasileira prioriza outros meios.

- **Boleto bancário** — um dos preferidos das áreas financeiras: facilita conciliação e **não depende de limite de cartão rotativo**.
- **Pix recorrente / Pix cobrança** — em rápida adoção, substituindo o boleto: compensação instantânea e taxa bem menor.
- **Cartão de crédito** — essencialmente para contratação rápida self-service, com débito automático nos ciclos seguintes.

**Conclusão a registrar: boleto e Pix recorrente são essenciais no B2B brasileiro; oferecer só cartão derruba a conversão.** Isso é, aliás, parte da brecha da seção 3 — os globais em USD não resolvem isso.

| Gateway | Boleto liquidado | Pix recorrente | Cartão | CNPJ | Diferencial |
|---|---|---|---|---|---|
| **Asaas** | R$ 1,99 – 2,99 | 0,99% (máx. R$ 1,99) | 2,99% + R$ 0,40 | Sim (para escala comercial) | Régua de cobrança automática multicanal: WhatsApp, SMS, e-mail e ligação de voz automatizada |
| **Iugu** | R$ 1,50 – 2,50 | 1,00% fixo | 2,75% + R$ 0,39 | Sim | Motor de assinaturas robusto, regras de split, conciliação bancária via API |
| **Stripe Brasil** | R$ 3,45 fixo | 1,19% fixo | 3,99% + R$ 0,50 | Sim (para operação nacional) | API fácil, consolidação financeira internacional |
| **Pagar.me** | R$ 2,00 – 3,00 | 1,00% fixo | 2,80% a 3,80% + R$ 0,50 | Sim | Multiadquirência nativa, antifraude integrado, retentativa de cobrança |
| **Mercado Pago** | R$ 3,49 fixo | 0,99% fixo | 3,99% a 4,99% | Opcional no cadastro, **obrigatório no B2B** | Reconhecimento de marca e ecossistema de maquininhas/links |

**CNPJ é pré-requisito, não detalhe.** Asaas, Iugu, Stripe e Pagar.me bloqueiam ou restringem severamente limites de saque e transferência em contas de CPF. E a contratação entre empresas exige faturamento entre contas jurídicas para conciliação contábil legítima.

Recomendação da própria fonte: integrar a gateway local eficiente (**Asaas ou Iugu**) desde o início, com boleto de taxa fixa barata, conciliação direta e Pix recorrente, e manter cadastro/faturamento sob CNPJ desde a primeira cobrança para evitar contestação fiscal. Os mais baratos da tabela em boleto e cartão são justamente esses dois; Stripe e Mercado Pago são os mais caros em boleto e cartão.

---

## 8. Go-to-market orgânico para os primeiros 50 pagantes

Cinco estratégias para startup bootstrapped sem orçamento de mídia paga. Casam com a meta de validação de **50 clientes pagantes** já declarada em [[modelo-comercial-e-precificacao]].

### 1. Freemium / PLG: 1 tela grátis por CNPJ

Conta permanente gratuita limitada a um dispositivo por CNPJ elimina a barreira de teste. O mecanismo de conversão é: o lojista testa agendamento, editor de templates e widgets numa tela da recepção ou área administrativa; quando valida o valor promocional e quer escalar para cardápio, vitrine e outros pontos, migra para o pago **sem fricção comercial**. Chave: a limitação é **por CNPJ**, não por e-mail, para não virar farm de contas grátis.

### 2. Parceria com instaladores locais

A principal barreira do pequeno varejo não é o software — é **pendurar o display**. Fechar acordo de distribuição com **eletricistas, técnicos de CFTV e integradores locais** resolve a dor do cliente e cria canal de captação: eles já estão na loja instalando a TV. O incentivo é **comissão recorrente** (percentual sobre o LTV gerado), com a licença do SaaS embutida no pacote de serviço deles.

### 3. Venda consultiva presencial com demo ao vivo

Prospecção ativa focada em polo comercial (praça de alimentação de shopping regional, zona comercial, rua de autopeças). O mecanismo é abordar dono/gerente **com um tablet e alterar o conteúdo de uma tela remota ao vivo, em segundos**. Ver texto e foto mudarem na hora dispensa qualquer explicação técnica — e é exatamente o "do things that don't scale" já previsto no go-to-market.

### 4. SEO de cauda longa por vertical e cidade

Páginas que respondem dor específica de segmento, sem disputar termo genérico. Exemplos literais da fonte: *"como montar um menu board digital em uma sorveteria"*, *"melhor player para TV corporativa de clínicas médicas em São Paulo"*, *"sinalização digital simples para farmácias brasileiras"*. Captura o cliente no momento exato da intenção de compra ou da dúvida técnica. Complementa (não substitui) o branded SEO já previsto.

### 5. Conectores de PDV/ERP local

Desenvolver conectores para os sistemas de caixa e ERP mais usados no comércio brasileiro. Mecanismo: quando o varejista muda o preço no caixa ou marca falta de estoque de um item do buffet, **a tela do salão se atualiza sozinha**. Efeito duplo: diferenciação frente aos players globais (que não integram com ERP brasileiro) e **barreira de saída forte** — depois que o cardápio se atualiza pelo caixa, trocar de fornecedor significa voltar a digitar preço à mão. É a estratégia com maior impacto em churn das cinco.

---

## Ver também

- [[modelo-comercial-e-precificacao]] — os preços do TelaHub, corrigidos em 2026-07-25 com base nesta página; é lá que as decisões estão registradas.
- [[funcionalidades-produto]] — o que o produto faz hoje (a seção "Modelo comercial atual" de lá é anterior a esta análise).
- [[arquitetura-e-entidades]] — heartbeat, alerta de offline e `AuditLog`, as capacidades técnicas que sustentam as oportunidades das seções 4.2 e 4.3.
- [[oportunidades-ux]] — a landing como superfície de conversão; a seção 6.2 desta página dá a base jurídica da limpeza.
- [[Kanban-TelaHub]] — onde o trabalho derivado é acompanhado.
