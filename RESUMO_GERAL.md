# 🖥️ TelaHub — Resumo Geral do Projeto (O que é, Como Funciona e Recursos)

Este guia apresenta uma visão completa do **TelaHub**, detalhando sua finalidade, infraestrutura, distribuição de código e o conjunto de funcionalidades disponíveis.

---

## 🎯 1. O que o Projeto É e o que Faz

O **TelaHub** é um sistema **SaaS Full-Stack** para **Sinalização Digital (Digital Signage)**. Ele transforma qualquer televisão comum, tablet ou monitor conectado à internet em um painel corporativo ou comercial dinâmico e interativo.

### O Fluxo de Funcionamento:
1. **O Player:** Você abre o site do Player em uma TV ou tablet. O sistema gera um código de pareamento de 6 dígitos.
2. **O Painel:** No painel administrativo, você digita esse código e pareia o dispositivo.
3. **O Controle:** A partir desse momento, você gerencia remotamente (arrastando, redimensionando e configurando widgets) o que é exibido naquela TV em tempo real.

---

## 📁 2. Onde: Estrutura do Projeto e Local de Execução

O projeto está hospedado em um repositório no GitHub (`AbnerSantosss/TelaHub`) e roda de forma conteinerizada (Docker) em uma VPS através do **Portainer**.

### A Estrutura de Pastas (Código):
*   **`frontend/` (React + Vite + TypeScript):**
    *   Interface web do painel de administração e a tela que roda na TV (Player).
    *   Construído com Tailwind CSS v4, Framer Motion (Eldora UI) e React Router DOM.
*   **`backend/` (Node.js + Express + TypeScript):**
    *   API REST que processa a lógica de negócio, autenticação, upload de mídias e telemetria.
    *   Usa o **Prisma ORM** para comunicação com o banco de dados.
*   **`docker-compose.yml` (Infraestrutura):**
    *   Orquestra os 4 containers do sistema:
        1.  `db` (Banco de dados PostgreSQL).
        2.  `backend` (Serviço da API Node.js).
        3.  `frontend` (Servidor Nginx entregando o app React).
        4.  `pgadmin` (Painel visual para gerenciar o banco).

---

## ⚡ 3. Principais Funcionalidades

### A. Core do Sistema (Tecnologia)
*   **Pareamento Instantâneo:** Registro simplificado de telas através de códigos de pareamento de 6 dígitos.
*   **Editor Drag-and-Drop:** Construtor visual de telas (estilo painel de controle) onde os widgets podem ser arrastados, redimensionados e empilhados livremente na grade.
*   **Sincronização em Tempo Real (SSE):** O painel envia atualizações para as TVs instantaneamente via *Server-Sent Events* sem precisar recarregar o navegador.
*   **Resiliência e Cache Offline:** O player consome pouquíssima banda de internet (até 96% de redução de tráfego) usando cache condicional HTTP (`ETag`). Caso o sinal de internet da TV caia, o conteúdo continua rodando perfeitamente offline.
*   **Broadcasts de Urgência:** Sistema que permite interromper a programação padrão de um ou mais displays para exibir avisos urgentes temporários (como alertas de emergência, avisos da diretoria ou ofertas instantâneas).
*   **Controle de Acessos:** Perfis com níveis de permissão (`master` com controle total e `admin` para operação geral).

### B. Catálogo de Widgets Integrados
As telas do TelaHub podem exibir diversos tipos de conteúdos modulares:

1.  **Mídia:**
    *   *Texto Animado:* Avisos em texto com animações customizadas (fade, typewriter, slide).
    *   *Imagem:* Imagens institucionais ou publicitárias.
    *   *Vídeo:* Player com upload local ou links do YouTube (com reprodução automática e mudo).
    *   *GIFs:* Imagens em movimento.
2.  **Produtividade & Organização:**
    *   *Notas Adesivas (Notes):* Avisos em estilo post-it com temas neon e glassmorphic.
    *   *Lista de Tarefas (Todo):* Checklists reativos com barra de progresso colorida.
    *   *Quadro de Deveres (Chores):* Planejador de tarefas semanais delegando responsáveis.
    *   *Cardápio Semanal (Meal Plan):* Planejamento de refeições com slider horizontal intuitivo.
    *   *Contagem Regressiva (Countdown):* Cronômetros de metas e prazos com avisos de expiração.
3.  **Informação Dinâmica:**
    *   *Previsão do Tempo:* Widget que se adapta visualmente ao clima local.
    *   *Relógio/Data:* Hora certa sincronizada.
    *   *Feed de Notícias (RSS):* Exibição de portais de notícias em estilo letreiro rolável.
    *   *Monitor Financeiro (Market Watch):* Cotações de ações e criptomoedas com gráficos e variações de alta e baixa.
4.  **Integrações Sem Código (Embeds):**
    *   *Snapshot de URL:* Tira prints automáticos de sites protegidos para exibição estática segura.
    *   *Google Docs / Slides / Calendar:* Visualizador de planilhas, slides e agendas do Google Workspace.
    *   *Microsoft Office:* Exibição de arquivos corporativos em Excel, PowerPoint e Word.
    *   *Power BI:* Integração nativa de painéis executivos de metas e estatísticas.
    *   *Airtable & PDFs:* Incorporação de bancos de dados visuais e manuais em PDF.
    *   *HTML Customizado:* Bloco livre para inserção de scripts e estilos CSS personalizados.
