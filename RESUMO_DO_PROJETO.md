# 🖥️ Resumo de Produto e Especificações Técnicas: TelaHub

Este documento consolidado serve como o **briefing de alta performance** e **fonte única da verdade** para a inteligência artificial encarregada de estruturar a Landing Page de vendas e redigir a copy persuasiva do **TelaHub**.

---

## 🎯 1. Visão Geral do Produto (Elevator Pitch)

O **TelaHub** é um ecossistema SaaS full-stack premium para gerenciamento, organização e transmissão de telas interativas em tempo real para displays físicos (como smart TVs, tablets, totens e monitores). O sistema permite que qualquer negócio crie programações visuais dinâmicas, centralize relatórios corporativos e exiba comunicações personalizadas de forma simples através de um navegador web comum, sem a necessidade de hardware proprietário.

### **Público-Alvo: Pequenos a Grandes Negócios**

*   **Pequenos Negócios (Restaurantes, Clínicas, Lojas, Academias):**
    *   *Necessidades:* Praticidade extrema, baixo custo operacional, uso de dispositivos que já possuem (qualquer Smart TV ou tablet antigo) e facilidade na criação de painéis sem depender de programadores.
    *   *Valor percebido:* Criação fácil de cardápios interativos, anúncios promocionais rápidos, painéis informativos básicos de atendimento e exibição de feeds dinâmicos com clima ou notícias locais.
*   **Grandes Negócios / Enterprise (Escritórios Corporativos, Indústrias, Redes de Franquias):**
    *   *Necessidades:* Altíssima estabilidade técnica, conformidade com redes de segurança internas, consumo controlado de banda de internet e integrações com suítes corporativas legadas.
    *   *Valor percebido:* Sincronização centralizada de centenas de telas em filiais distintas, controle estrito de acessos com autenticação robusta, painéis analíticos do Power BI em tempo real, documentos corporativos integrados diretamente do Google Workspace ou Office 365 e resiliência offline completa.

---

## 🎨 2. Identidade Visual da Landing Page (Estética Brutalista B2B / Swiss Grid)

*Nota para a IA de Design/Copywriting: O site de vendas deve ser projetado sob uma estética de Grade Suíça (Swiss Grid) em Light Mode. Isso cria um contraste sofisticado, estruturado e técnico com o software em si.*

*   **Paleta de Cores (Light Mode Técnico):**
    *   *Fundo Base:* Branco Puro (`#FFFFFF`).
    *   *Superfícies & Cards:* Cinza Claro (`#F9FAFB`) com contornos finos e nítidos em Cinza Sutil (`#E5E7EB`).
    *   *Ação & Destaques Primários:* Azul Corporativo Sólido (`#2563EB`).
    *   *Textos:* Grafite Escuro (`#111827`) para legibilidade máxima e Cinza Médio (`#4B5563`) para descrições.
    *   *Status de Telemetria:* Verde Esmeralda (`#10B981`) para dispositivos online e Cinza Sólido (`#64748B`) para offline.
*   **Geometria e Cantos (Swiss Grid Puro):**
    *   *Uso estrito de cantos retos:* Border-radius limitado de `0px` a `2px` em botões, campos de texto, contêineres e imagens. Isso passa o aspecto de um blueprint de alta precisão empresarial, banindo qualquer arredondamento genérico.
*   **Efeitos e Padrões de Fundo:**
    *   Fundo limpo e técnico com um padrão suave de **Grid de Pontos (Swiss Grid)**.
    *   Fundo interativo com partículas em cinza claro (`rgba(156,163,175,0.25)`) e grade de linhas finas (`rgba(229,231,235,0.4)`), gerando conexões dinâmicas em azul corporativo (`rgba(37,99,235,0.25)`) de forma sutil no rastro do cursor do usuário.
    *   *Proibições Estéticas:* Completa ausência de gradientes neon, overlays brilhantes chamativos, orbes coloridas e sombras desfocadas escuras. O visual deve evocar seriedade e sofisticação corporativa.
*   **Tipografia Unificada:**
    *   *Títulos:* **Satoshi** (fonte geométrica limpa, técnica e moderna).
    *   *Textos de Dados & Leitura:* **Space Grotesk** (excelente legibilidade e aspecto de dados precisos).

---

## ⚡ 3. Funcionamento e Pilares Técnicos de Vendas

A copy da landing page deve destacar a robustez da engenharia por trás do sistema, explicando o funcionamento complexo em termos de alto valor e facilidade comercial:

1.  **Pareamento Instantâneo via Código (Plug & Play):**
    *   *Como funciona:* Qualquer tela conectada à internet abre a página do player e gera um código numérico de 6 dígitos único. O administrador insere esse código no painel administrativo e a TV é pareada no mesmo segundo.
    *   *Apelo Comercial:* Sem configurações complexas de IP, sem fios longos ou adaptadores proprietários. O cliente pode ativar qualquer TV no sistema de forma autônoma em menos de um minuto.
2.  **Editor Modular de Grade Dinâmica (Drag-and-Drop):**
    *   *Como funciona:* Interface avançada baseada no React Grid Layout que calcula coordenadas geométricas das caixas na grade em tempo real. O usuário arrasta, solta, redimensiona e empilha widgets livremente.
    *   *Apelo Comercial:* Flexibilidade visual total para desenhar qualquer layout corporativo ou de cardápio digital, com ajuste exato e perfeito alinhamento na tela.
3.  **Sincronização SSE em Tempo Real com Resiliência Offline:**
    *   *Como funciona:* Conectividade via Server-Sent Events (SSE) e cache condicional HTTP com cabeçalhos `ETag` (`304 Not Modified`). Qualquer mudança de widget no painel reflete instantaneamente na TV correspondente, sem recarregar a tela. Se a internet local da TV oscilar ou cair por completo, o sistema ativa um modo offline inteligente que mantém a programação rodando perfeitamente.
    *   *Apelo Comercial:* Economia brutal de até 96% de tráfego de rede comparado a carregamentos comuns de páginas. Isso evita lentidão na rede interna da empresa e garante que a TV nunca fique preta ou exiba mensagens de erro no ponto de venda.
4.  **Transmissão Temporária de Alta Prioridade (Broadcasts):**
    *   *Como funciona:* O painel administrativo permite enviar overlays em tempo real para displays selecionados, pausando temporariamente a programação padrão.
    *   *Apelo Comercial:* Canal direto de comunicação instantânea para alertas importantes de saúde e segurança no ambiente corporativo, ou ofertas relâmpago urgentes em franquias de varejo.

---

## 📂 4. Catálogo Completo de Widgets Disponíveis

Apresentamos os widgets categorizados para que a outra IA possa listar e estruturar as opções de personalização da plataforma:

### **A. Mídia e Conteúdo Dinâmico (Básicos)**
*   **Texto Animado (`TEXT`):** Exibe avisos com controle absoluto de fontes, tamanhos e efeitos (typewriter, fade, pulse, slide).
*   **Imagem Inteligente (`IMAGE`):** Exibe imagens institucionais ou banners com ajuste automático de proporção.
*   **Vídeo Player (`VIDEO`):** Suporta uploads locais de mídias e vídeos remotos do YouTube, com autoplay configurável e modo silencioso.
*   **GIFs Animados (`GIF`):** Renderiza imagens em movimento para chamar atenção no ponto de venda de maneira rápida.
*   **Painel Integrado (`FULL_INFO`):** Dashboard condensado que combina data, hora e status em um único widget compacto.

### **B. Gestão, Trabalho e Produtividade Corporativa**
*   **Notas Adesivas (`NOTES`):** Lembretes baseados em post-its com temas estilizados (estilo clássico, neon ou glassmorphism translúcido).
*   **Lista de Tarefas Reativa (`TODO`):** Lista de afazeres reativa e interativa com checkboxes e uma barra HSL que mede a porcentagem de progresso das tarefas concluídas.
*   **Quadro de Deveres (`CHORES`):** Painel que organiza a rotina semanal, especificando o dia, a tarefa, o responsável atribuído e o status.
*   **Cardápio Semanal (`MEAL_PLAN`):** Planejador de alimentação para refeitórios internos ou restaurantes, estruturado com slide horizontal intuitivo (Café da Manhã, Almoço, Jantar e Lanches).
*   **Contador Regressivo (`COUNTDOWN`):** Cronômetro visual e chamativo para contagem de metas de equipes, eventos importantes ou prazos críticos, exibindo mensagens personalizáveis.

### **C. Informação, Clima e Mercado Financeiro**
*   **Previsão do Tempo (`WEATHER`):** Dados de clima em tempo real que se adaptam esteticamente e alteram as animações de fundo de acordo com as condições da cidade escolhida.
*   **Relógio Digital (`CLOCK`):** Exibição de hora e data precisas em tempo real.
*   **Feed de Notícias RSS (`RSS`):** Conecta canais de portais de notícias em tempo real, com layouts dinâmicos de letreiro de notícias rolável (`marquee`) ou colunas de leitura rápida.
*   **Monitor Financeiro (`MARKET_WATCH`):** Acompanha cotações de ações e criptomoedas com variação HSL colorizada e gráficos sparkline históricos em tempo real.

### **D. Integrações Corporativas Sem Código (Embeds)**
*   **Snapshot Automático (`BROWSER_SNAPSHOT`):** Tira capturas de tela periódicas de URLs externas públicas e exibe a imagem final dentro de uma moldura de navegador web, garantindo segurança na exibição de dados dinâmicos.
*   **Google Workspace (`GOOGLE_DOCS` e `CALENDAR`):** Renderiza de maneira nativa e higienizada planilhas do Sheets, apresentações do Slides, formulários de pesquisa e agendas públicas.
*   **Microsoft Office (`OFFICE_DOCS`):** Visualização segura de arquivos em Word, Excel e PowerPoint armazenados nas nuvens corporativas da Microsoft.
*   **Power BI (`POWER_BI`):** Exibição contínua de relatórios analíticos dinâmicos de KPIs e metas do setor.
*   **Airtable (`AIRTABLE`):** Incorporação direta de bases de dados interativas.
*   **Documentos PDFs (`PDF_DOCUMENT`):** Exibe manuais, cartilhas de treinamento e catálogos armazenados remotamente.
*   **HTML Personalizado (`EMBED_HTML`):** Editor livre para injeção controlada de códigos HTML/CSS específicos do cliente.

---

## 🏗️ 5. Proposta de Estrutura de Seções para a Landing Page

Esta estrutura deve guiar a outra IA a criar o layout da página de vendas com o rigor da grade suíça de cantos retos:

1.  **Hero Section (O Blueprint do Sistema):**
    *   *Visual:* Linhas de grade finas com padrão de pontos e cursor interativo. Título de impacto massivo em Satoshi e botões de cantos afiados (0px).
    *   *Copy:* Foco em transformar Smart TVs comuns em painéis corporativos interativos de forma instantânea. CTA direto: "Pareie sua primeira tela agora".
2.  **Grade de Prova de Valor (Grandes vs. Pequenos Negócios):**
    *   *Visual:* Layout de duas colunas comparativas simétricas com contorno de 1px cinza nítido.
    *   *Copy:*
        *   *Esquerda (Pequenos Negócios):* Baixo custo, menus dinâmicos, facilidade operacional e atração visual.
        *   *Direita (Empresas/Enterprise):* Power BI, economia extrema de banda, compliance de dados e estabilidade inabalável offline.
3.  **Os 4 Pilares da Engenharia (Cards Brutalistas):**
    *   *Visual:* Grade 2x2 com cantos retos nítidos descrevendo os diferenciais técnicos do sistema (Pareamento Fácil, Editor Drag-and-Drop, SSE & Contingência Offline, Broadcasts).
4.  **Catálogo Dinâmico de Widgets:**
    *   *Visual:* Menu de abas de cantos retos alternando as categorias (Mídia, Produtividade, Finanças, Integrações). Cards ilustrando o funcionamento visual limpo e prático de cada widget na TV.
5.  **Seção de Telemetria e Desempenho (Métricas Técnicas):**
    *   *Visual:* Exibição de dados estatísticos em Space Grotesk com bordas pretas nítidas de 1px, mostrando na prática os 96% de economia de dados.
6.  **FAQ de Grade Nítida:**
    *   *Visual:* Acordeões que se abrem com cantos retos sem animações lentas. Respondendo dúvidas sobre segurança de dados, funcionamento offline e compatibilidade de TVs.
7.  **Chamada para Ação Final (CTA Footer):**
    *   *Visual:* Painel limpo com fundo branco e contorno forte em azul corporativo. Botões diretos para demonstração comercial ou login.
