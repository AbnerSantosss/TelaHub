---
tipo: log
atualizado: 2026-07-25
---

# Log — Wiki TelaHub / Display de Vendas

Registro cronológico, append-only. Toda vez que uma fonte é processada ou uma página é criada/atualizada, uma entrada é adicionada aqui.

## [2026-07-14] setup | Wiki criada

Estrutura inicial instanciada (`raw/`, `wiki/`, `CLAUDE.md`) seguindo o padrão LLM Wiki, cobrindo tanto o lado técnico (desenvolvimento do app) quanto o lado de negócio/produto (Display de Vendas). Ingestão configurada no modo supervisionado.

## [2026-07-14] ingest | Preenchimento de lacunas via especialistas + código-fonte → 3 fontes analisadas, 3 artigos criados

Análise cruzada de três vaults de especialistas (`4 - Notebooklm - Pesquisador`, `1 - Ux - Habilidade`, `7 - EngenhariaSoftware`) e leitura direta do código (`frontend/`, `backend/prisma/schema.prisma`) para preencher as lacunas de `wiki/tecnico/` e `wiki/negocio/`. Criados: `wiki/tecnico/arquitetura-e-entidades.md`, `wiki/negocio/funcionalidades-produto.md`, `wiki/negocio/oportunidades-ux.md`. Gaps técnicos e de UX identificados foram convertidos em Epics/User Stories no quadro Kanban (`Kanban-TelaHub.md`), estruturado conforme convenções Scrum/Kanban do vault de Engenharia de Software (INVEST, Gherkin, WIP limits, DoR/DoD).

Nota: o método do especialista pesquisador (`pesquisador-abner`) é indicado para pesquisas externas via NotebookLM MCP quando os gaps exigirem conhecimento fora do próprio código/repositório — não foi necessário neste ciclo pois os gaps eram observáveis diretamente no código-fonte.

## [2026-07-14] lint | 3 checks, 0 críticos, 2 avisos, 1 sugestão, 3 auto-fixados

Lint manual (sem hub — vault local do `/gerar-wiki`) sobre `raw/`, `wiki/`, `CLAUDE.md` e `Kanban-TelaHub.md`. Sem contradições, sem links quebrados, sem páginas órfãs. Corrigidos: links soltos "EPIC B/C/E/F" viraram wikilinks em `wiki/tecnico/arquitetura-e-entidades.md`; frontmatter de `wiki/log.md` completado com `atualizado`; criada `raw/pesquisa/2026-07-14-levantamento-tecnico-negocio-ux.md` como fonte de proveniência das 3 páginas, referenciada via `sources:` no frontmatter de cada uma.

## [2026-07-15] ingest | Execução de quase todo o backlog do Kanban → 15 de 17 User Stories concluídas, `arquitetura-e-entidades.md` atualizada

Sessão de execução (não pesquisa) que implementou, testou e concluiu praticamente todas as User Stories do quadro Kanban identificadas na sessão anterior: R2 obrigatório em produção (US-001), rate limiting (US-003), validação Zod (US-004), painel de saúde de devices + alerta de offline por e-mail (US-013/014), confirmação de publicação (US-010), toasts consistentes (US-007), empty states (US-008), skeleton/erro em widgets iframe (US-016), modelo de Organização/multi-loja com filtro e relatório agregado (US-005/006/017), pipeline de CI e decisão de gestão de segredos (US-011/012, parciais), e acessibilidade de modais (US-009, parcial). Testes automatizados (Vitest + Supertest) cobrindo as rotas novas/alteradas — 17 passando.

Ficaram deliberadamente incompletas as sub-tasks que exigem acesso físico/de infraestrutura que não é executável remotamente: migração de mídia em ambiente de homologação real (US-002), provisionar staging e migrar segredos para o Portainer (US-011/012), e validação com leitor de tela NVDA (US-009). Essas ficam sinalizadas no próprio card do Kanban.

`wiki/tecnico/arquitetura-e-entidades.md` reescrita para refletir o novo modelo de domínio (`Organization`), as novas rotas/serviços de backend, e uma seção "Gaps técnicos — status" substituindo a lista original de gaps em aberto.

## [2026-07-15] query | Rodei o projeto de verdade (não só testes) → 4 bugs reais encontrados e corrigidos

A pedido do usuário, subi os dois servidores (`backend`/`frontend` em modo dev) e dirigi a aplicação com Playwright como um usuário faria, em vez de confiar só nos 18 testes automatizados e no type-check da sessão anterior. Isso revelou 4 problemas que os testes não pegaram:

1. `saveDisplaySchema` (Zod, US-004) rejeitava `coverImage: null` — o Editor envia isso ao limpar a capa de um Display; toda tentativa de salvar um Display existente quebrava com 400. Corrigido (`.nullable()`), com teste de regressão novo.
2. `PublishConfirmModal` (US-010) e mais **8 modais pré-existentes** no projeto usavam `<h2>` solto em vez do primitivo `DialogTitle` do Radix — erro de acessibilidade real no console. Todos corrigidos.
3. O Display de seed "Display Demo" guarda cenas no formato antigo (`page.widgets`, pré-refatoração para `react-grid-layout`) e quebrava o Editor inteiro (`activePage.layout` undefined). Corrigido normalizando no backend: página sem `layout` ganha `layout: []` na leitura, sem apagar o dado bruto antigo.
4. Descoberta operacional: `tsx watch` não recarrega com confiabilidade neste ambiente Windows após editar um schema, e `TaskStop` não mata o `node.exe` filho de fato (fica órfão segurando a porta) — é preciso `taskkill /F` pelo PID real. Documentado em `wiki/tecnico/arquitetura-e-entidades.md` para não repetir a investigação da próxima vez.

Servidores reiniciados e confirmados no ar: backend em `http://localhost:3001`, frontend em `http://localhost:3000`.

## [2026-07-21] ingest | Auditoria UX + Engenharia de Software aplicada ao quadro Kanban → 8 achados de UX, 4 de processo, 10 correções aplicadas

**Ingerido:** checklist de auditoria UX (7 blocos), heurísticas de Nielsen, princípio C.R.A.P. e microcopy do vault `1 - Ux - Habilidade`; conceitos de WIP/Lei de Little/DoR/DoD do artigo `kanban.md` do vault `7 - EngenhariaSoftware`. Desta vez aplicados não ao produto (já feito em 2026-07-14), mas ao **próprio quadro Kanban** como artefato de informação de uso diário do time.

**Feito:** agente `abner-ux-responsivo` auditou `Kanban-TelaHub.md` linha a linha contra as heurísticas de Nielsen e o checklist de microcopy; análise complementar de Engenharia de Software identificou que o WIP da coluna "Em Análise" estava 100% consumido por itens estruturalmente bloqueados (dependência de VPS/Portainer/homologação real), mascarando um gargalo real como fluxo normal.

**Realizado (via agente `kanban-editor`, execução mecânica sobre lista aprovada):**
1. Cores por épico (`tag-colors` nativo do plugin, 6 cores) e tags movidas para o início de cada card.
2. Legenda de emojis (🚧/📌/ℹ️) e marcador padronizado 🚧 substituindo avisos ⚠️ ambíguos em 3 US bloqueadas.
3. Título da coluna "Em Análise" agora expõe "(3 · 3 bloqueadas 🚧)" em vez de esconder o bloqueio.
4. US-009 corrigida: dívida técnica de validação NVDA explícita, não mais um `[ ]` esquecido dentro de card "concluído".
5. Negrito em DADO/QUANDO/ENTÃO (21 critérios Gherkin) e checkboxes indevidos removidos da seção de Políticas.
6. Contagem adicionada em "Concluído (13)".

Síntese arquivada em `wiki/negocio/oportunidades-ux.md` (seção nova "Auditoria de UX aplicada ao processo"), com link cruzado para `Kanban-TelaHub.md`.

**Lacunas identificadas mas deliberadamente não preenchidas** (exigem decisão de negócio, não são mecânicas): estimativa por User Story (P/M/G) para tornar o critério de DoR "estimável (INVEST)" auditável; priorização MoSCoW dos 6 épicos do Backlog. Ambas ficaram registradas como lacunas em aberto em `wiki/negocio/oportunidades-ux.md`, aguardando decisão do usuário antes de qualquer preenchimento (evitar inventar prioridade/estimativa num quadro de uso real).

## [2026-07-25] ingest | Análise de prontidão comercial → multi-tenancy "concluída" era só visual; modelo comercial definido e página nova criada

**Ingerido:** leitura direta do código (`backend/`, `frontend/`, schema Prisma, Landing) cruzada com a wiki do próprio projeto e com 4 artigos do vault de negócio `Especialistas/8 - Marca De Sucesso` (`.wiki/wiki/topics/`): `precificacao-e-financas.md`, `fundamentos-empreendedorismo.md`, `marketing-digital-posicionamento-online.md`, `caminho-ao-sucesso-erros-comuns.md`. Fonte de proveniência registrada em `raw/pesquisa/2026-07-25-analise-prontidao-comercial.md`.

**Motivo do ciclo:** o projeto tinha maturidade técnica e preços em reais publicados na landing, mas **nenhuma página de wiki sobre modelo comercial**. A pergunta era se o produto podia de fato ser cobrado.

**Achado principal — correção de entendimento:** o isolamento multi-tenant **não existia de fato**. `GET /api/displays` (`backend/src/routes/displays.routes.ts:11`) chamava `displayService.getAll()` sem escopo; o filtro por organização era client-side (`frontend/components/Dashboard.tsx:278`); `User` não tinha `organizationId`; `Device`, `Broadcast`, mídia e o `Setting` de SMTP não tinham escopo de organização. Ou seja: `wiki/tecnico/arquitetura-e-entidades.md` (gap #3) e `Kanban-TelaHub.md` registravam "Multi-loja ✅ concluído" (US-005/006/017) quando o entregue era **agrupamento visual**, não limite de segurança. Multi-tenancy comercial é propriedade de segurança verificada no servidor, não feature de organização de tela.

**Outros achados de prontidão:** sem rota de cadastro (`POST /register`) — só `POST /api/users/invite`, que exige admin logado, deixando o CTA da landing sem destino; zero infraestrutura de cobrança (nenhum plano/assinatura/quota — "Até 5 displays" era texto sem enforcement); e a landing prometia white label, SSO/SAML/LDAP, 2FA, domínio personalizado, SLA 99,9%, player Android TV nativo e cache offline real — nada disso existe —, além de depoimento e selo "MAIS VENDIDO" fabricados com preço riscado fictício (exposição ao art. 37 do CDC).

**Modelo comercial definido** (página nova `wiki/negocio/modelo-comercial-e-precificacao.md`): mudança de eixo de penetração/desconto para valor (EVC), com o diferencial real e verificável sendo a visibilidade operacional (heartbeat + alerta de tela offline + relatório por loja); cobrança **por tela ativa** em vez de por conta (exigiu `Device.activatedAt` no schema); preços **provisórios** (trial 14 dias/1 tela sem cartão, Loja R$ 29/tela/mês, Rede R$ 24/tela/mês com mínimo de 5, Enterprise sob consulta); régua de unit economics **estimada** com premissas explícitas (ARPU R$ 192, margem 80%, churn 3% → LTV ≈ R$ 5.120, CAC máximo ≈ R$ 1.700 para 3:1, payback ≈ 11 meses); growth loop via rodapé "feito com TelaHub" removível no plano superior; go-to-market por nicho vertical único, primeiros clientes à mão, branded SEO desde já, CLG só após PMF. Meta de validação: **50 clientes pagantes**.

**Trabalho de código disparado em paralelo** (fora do escopo desta entrada de wiki, acompanhado no Kanban): isolamento de tenant no servidor, modelo de planos com quota, cadastro self-service, e correção da landing (remoção das promessas inexistentes, do depoimento fabricado e do selo/preço riscado).

**Lacuna em aberto declarada:** o vault `8 - Marca De Sucesso` **não tem análise de concorrentes de digital signage** — seus cases (Nubank, Duolingo, Gymshark, Sallve, Havaianas) são marcas de consumo usadas para ilustrar mecanismos de crescimento, não competidores. Deep research rodando no NotebookLM: notebook "Mercado de Digital Signage BR — Concorrentes, Preços e Modelo de Negócio (TelaHub)", id `720c999a-c1b9-4333-8308-17377bc326da`, cobrindo concorrentes/preços e mercado brasileiro/gateways/exigências legais. A página nova deve ser atualizada quando a pesquisa chegar (preços provisórios e âncora de EVC).

## [2026-07-25] ingest | 2 deep researches de mercado → página de concorrentes criada, lacuna fechada, preços corrigidos para cima

**Ingerido:** as duas deep researches do NotebookLM que a entrada anterior deste mesmo dia declarava "rodando" (notebook `720c999a-c1b9-4333-8308-17377bc326da`), salvas como fontes brutas imutáveis:
- `raw/pesquisa/2026-07-25-deep-research-concorrentes-signage.md` — 81 fontes; 9 provedores globais, 6 players brasileiros, 4 grupos de atrito/churn.
- `raw/pesquisa/2026-07-25-deep-research-mercado-brasil-legal-gateways.md` — 20 fontes; mercado BR, verticais, gateways, ISS/CDC/LGPD, go-to-market orgânico.

**Página nova:** `wiki/negocio/concorrentes-e-mercado-signage.md`.

**Achados principais:**

1. **Faixa de preço global do self-service:** USD 4,90 (Xibo Cloud, piso) a USD 20–30 (ScreenCloud, teto), mediana em USD 12–15/tela/mês. **Todos os nove cobram por tela ativa** — o que era premissa em `modelo-comercial-e-precificacao` virou fato. **Nenhum exige cartão no trial.** Plano gratuito vitalício de 1 tela é prática estabelecida (Yodeck, Look DS; OptiSigns vai a 3).
2. **A brecha nacional é real:** Screencorp, 4YouSee, Progic, Wiplay, B2 Mídia e ImidiaTV/Pix Mídia são **todos consultivos, por volume de telas, sem preço público de autoatendimento**, vendendo biblioteca de conteúdo pronto + LGPD como diferencial. Não há concorrente nacional com self-service e preço público — e os globais não emitem NFS-e nem aceitam boleto/Pix.
3. **Os 4 grupos de atrito que causam churn no setor**, cada um com leitura de oportunidade: acúmulo da cobrança linear (100 telas no ScreenCloud Pro = USD 36.000/ano); feature-gating de governança (SSO/RBAC/audit log trancados no Enterprise, o que faz equipes compartilharem credencial genérica — e o TelaHub acabou de ganhar `AuditLog`); instabilidade de players BYOD de consumo (throttling térmico e a tela pública exibindo a interface do Fire Stick com anúncios — valida o alerta de tela offline como diferencial escolhido); e empilhamento de add-ons (OptiSigns cobra USD 25/mês por videowall e USD 10/mês por domínio próprio).
4. **Mercado BR:** USD 248,4 M em 2026 → USD 342,1 M em 2031 (CAGR 5,5%), Brasil líder da América do Sul. Oito verticais mapeadas com adoção, decisor e ticket aceito por tela (R$ 30–110; food service R$ 40–90 com adoção muito alta e o dono decidindo; óticas R$ 50–110 e farmácias R$ 50–100 pagam mais, mas farmácia tem decisor corporativo). Três pilares de decisão do pequeno varejista: facilidade de uso sem TI, confiabilidade com operação offline, hardware barato de mercado.
5. **Conformidade:** ISS de 2% a 5% (LC 116/2003) com NFS-e obrigatória a cada ciclo e inviável de emitir manualmente em escala; CDC art. 49 (arrependimento de 7 dias) e arts. 30/37 (a publicidade vincula o contrato — **a razão jurídica da limpeza da landing**); LGPD com o TelaHub como **operador** e o lojista como **controlador**, 15 dias para responder titular, e o alívio da Resolução CD/ANPD 02/2022 para agente de pequeno porte (dispensa de DPO mediante canal de privacidade, prazos em dobro, 6 dias úteis para notificar incidente).
6. **Gateways:** Asaas e Iugu são os mais baratos em boleto e cartão; Stripe e Mercado Pago os mais caros em boleto. Boleto e Pix recorrente são essenciais no B2B brasileiro — cartão isolado derruba conversão. CNPJ é pré-requisito.
7. **Esclarecimento arquivado:** "TelaVip" **não existe** como software de digital signage — são homônimos (estúdio de podcast em Santos; empresas de CFTV na Venezuela e Colômbia). Registrado para ninguém perder tempo pesquisando de novo.

**Correção de preço (decisão do dono, `modelo-comercial-e-precificacao` seção 2.3):** os preços provisórios de R$ 29 (Loja) e R$ 24 (Rede) **subiram para R$ 49 e R$ 39**, e o trial de 14 dias **virou 1 tela grátis para sempre**. Motivo: R$ 29/R$ 24 estavam no piso da faixa aceita pelo varejista brasileiro (R$ 30–110) e abaixo de todos os nove concorrentes globais exceto o Xibo (open source, outro modelo). Unit economics recalculada: Rede com 8 telas = ARPU R$ 312/mês, margem 80%, churn 3% → LTV ≈ R$ 8.320, CAC teto para 3:1 ≈ R$ 2.770, payback ≈ 11 meses — **mantido como estimativa com premissas, não fato** (não há cliente pagante). Registrada também a **decisão anti-cobrança-retroativa** como diferencial deliberado, contra a reclamação nº 1 do Yodeck (adicionar a 2ª tela revoga a gratuidade e fatura tudo retroativamente), e a política de tarifa única sem add-on.

**Decisões deliberadamente em aberto (do dono, não lacunas de pesquisa):**
- **Vertical de foco:** "depende do cliente, definimos depois". A tabela das oito verticais fica disponível; nenhuma foi escolhida em nome dele.
- **Gateway de pagamento:** adiado para um segundo ciclo. Até então `POST /api/billing/checkout` responde **501 honesto** (`backend/src/routes/billing.routes.ts`). Registrado explicitamente que **sem gateway não há receita** — é o gargalo único entre o produto e o primeiro faturamento, e a meta de 50 pagantes é inalcançável até que ele exista. Quando abrir, gateway e emissão de NFS-e andam juntos.

**Também atualizados:** `wiki/index.md` (página nova + descrição corrigida da página de precificação) e `wiki/negocio/funcionalidades-produto.md` (links reversos e nota de que a seção "Modelo comercial atual (inferido do código)", de 2026-07-14, foi superada).

**Contradição residual não corrigida (arquivo de outro dono):** a pesquisa aponta **operação offline** como um dos três pilares de decisão do pequeno varejista, e a landing prometia cache offline sem contrapartida no código. Isso está sinalizado nas duas páginas de negócio, mas o gap correspondente vive em `wiki/tecnico/arquitetura-e-entidades.md` e no `Kanban-TelaHub.md`, que não foram editados neste ciclo.

## [2026-07-25] ingest | Execução do ciclo comercial + 2 páginas técnicas novas → 107 testes, 6 falhas de segurança fechadas, e a descoberta de que nada disso está commitado

Sessão de execução (não de pesquisa) que implementou o que os ciclos anteriores só tinham diagnosticado, e uma reestruturação da wiki para registrar o resultado. Encerrada com **107 testes passando (12 arquivos)**, type-check limpo no backend e no frontend, builds de produção passando nos três projetos, e o fluxo de cadastro e o bloqueio de quota validados **rodando a aplicação de verdade**, não só em teste.

**Implementado:** escopo de tenant no servidor (`requireTenant`/`req.tenantId`, `organizationId` no JWT, acesso cruzado respondendo 404 e nunca 403, mídia prefixada por organização, `POST /api/displays` ignorando `organizationId` do corpo); catálogo de planos e assinatura (`Plan`, `Subscription`, `requireActiveSubscription` 402, `enforceQuota` 403); cadastro self-service transacional (`POST /api/signup`) com plano de entrada freemium; auditoria (`AuditLog`); e a cadeia de boot do `docker-compose` com backfill e assinatura herdada, para o deploy não trancar a operação existente fora do sistema.

**Seis falhas de segurança encontradas e fechadas** — detalhe em [[seguranca-e-conformidade-tecnica]]. As três mais graves: `JWT_SECRET` tinha fallback público **versionado no repositório** (em produção sem a variável, qualquer pessoa forjava token de `master`); não havia `trust proxy`, então atrás do Cloudflare Tunnel o rate limit agrupava todos os visitantes num contador único (não protegia contra força bruta e bloquearia todos juntos); e o CORS comparava origem **por prefixo** com `credentials: true`, de modo que `https://dominio.com.br.evil.com` era aceito como se fosse `https://dominio.com.br`. Mais: upload sem validação de tipo (com o furo de que o MIME é falsificável — `.html` disfarçado de `image/png` era XSS armazenado na mesma origem do painel), enumeração de slug entre clientes, e SMTP da plataforma editável por qualquer admin de cliente.

**Descoberta que domina todas as outras: nada disso está commitado.** O último commit é `54b01c7`. `git grep -il organizationId HEAD -- frontend` não retorna nada — todo o trabalho multi-loja do frontend, inclusive o descrito como entregue no log de 2026-07-15, só existe na árvore de trabalho. Há 108 arquivos não commitados no `App-Projeto`, e o `Site/site-telas` tem trabalho pendente na branch `copy/gatilhos-mentais`. Como o deploy é **GitHub → Portainer**, a consequência é direta: **o que está publicado hoje é o commit antigo** — com os claims falsos, sem isolamento de tenant e sem nenhuma das correções de segurança. Verificado: o `Landing.tsx` do `HEAD` ainda tem 10 ocorrências de claims falsos e o `Pricing.jsx` do `HEAD` do site-telas ainda tem 6.

**Lacuna estrutural registrada:** `hasFeature()` existe em `plan.service.ts` e tem teste, mas **nenhuma rota o chama**. Quota é aplicada de fato (número de telas e usuários); feature de plano é decorativa. Hoje uma conta no plano grátis usa Power BI, Airtable, Docs e PDF sem impedimento, embora as duas páginas de venda anunciem isso como recurso do plano Rede. O risco aqui é o inverso do habitual — não é enganar o cliente, é entregar de graça o que deveria ser pago e gerar atrito ao tirar depois. Qualquer gate precisa ser no servidor: só no editor seria burlável por chamada direta à API.

**Leitura nova sobre que produto isso é** (em [[modelo-comercial-e-precificacao]] e [[funcionalidades-produto]]): o inventário de widgets mostra que a maioria é corporativa/BI — Power BI, Airtable, Google Docs, Office, PDF, BrowserSnapshot, EmbedHtml, MarketWatch, RSS — enquanto imagem, vídeo e texto, que é o que as páginas destacam, são primitivos genéricos do editor. Ou seja: **o investimento de engenharia foi num painel de gestão à vista e a comunicação vende cartaz digital de varejo**, que é justamente o segmento comoditizado (Yodeck a USD 8/tela). Registrado com a ressalva de mesmo peso: é leitura de código, não de cliente — a decisão de eixo do produto segue **em aberto e é do dono**, e o caminho recomendado é validar com 10–15 conversas antes de reposicionar.

**Páginas novas:** [[seguranca-e-conformidade-tecnica]] (organizada por classe de falha, com o propósito explícito de evitar reincidência) e [[canais-de-venda-e-landings]] (o mapa dos **dois** canais de venda, que a wiki nunca documentou — omissão que já custou trabalho perdido nesta sessão, quando uma correção de conformidade foi feita na landing errada primeiro). Reescrita: [[arquitetura-e-entidades]], que não mencionava nada do ciclo e ainda declarava multi-loja como concluída.

**Lições de método, as duas desconfortáveis:**
1. **Correção de conformidade em copy reincide.** Os mesmos claims falsos voltaram **duas vezes** por agentes trabalhando sem supervisão — o bullet "cache offline failsafe" reapareceu no plano Grátis enquanto o FAQ da própria página dizia que não existia. A prática adotada: verificar no **artefato construído** (`grep` no `dist/`), não no fonte, e deixar comentário no código em cada ponto sensível explicando por que aquele texto não pode voltar.
2. **Verificação malfeita mascara falha.** A guarda de `JWT_SECRET` "não abortou" num primeiro teste porque o `dist/` estava desatualizado — o build era anterior à edição. Ao testar comportamento de boot, rebuild antes; e desconfie de um teste que passa quando deveria falhar. Reforça a lição já registrada em 2026-07-15 de que testes automatizados não substituem rodar o sistema.

**Adendo do mesmo dia — resíduos encontrados numa varredura posterior e corrigidos:** o botão principal de conversão do `LeadModal` ainda dizia "Ativar Meus 14 Dias Grátis"; a tela de sucesso afirmava que a conta estava ativa e que um e-mail com login e código de pareamento havia sido enviado, quando `handleLeadSubmit` é um mock e o lead não vai a lugar nenhum; e o `public/llms.txt` — escrito para ferramentas de IA lerem, com o `robots.txt` liberando GPTBot/ClaudeBot/PerplexityBot — nunca foi tocado e concentrava sozinho a promessa de offline, o pacote fixo antigo, o superlativo "mais popular" e o white label como recurso pronto. Os três corrigidos, com o `llms.txt` ganhando uma seção **"Limitações declaradas"** que afirma explicitamente o que o produto não faz. Também corrigido o CORS por prefixo (ver [[seguranca-e-conformidade-tecnica]]), que estava registrado como risco não tratado. Detalhe em [[canais-de-venda-e-landings]] §5.1.
