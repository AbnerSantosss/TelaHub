# 🖥️ Resumo do Projeto: TelaHub (Display Office)

Este documento reúne uma visão geral consolidada do projeto **TelaHub / Display Office**, detalhando sua arquitetura, tecnologias, funcionamento e o catálogo completo dos **widgets** que dão vida às telas e displays.

---

## 🎯 1. O que é o Projeto?

O **TelaHub** é um sistema **full-stack premium** projetado para gerenciar e transmitir telas interativas para dispositivos físicos (como smart TVs, tablets, totens e monitores) de maneira dinâmica e em tempo real.

### **Fluxo de Funcionamento:**
1. **Pareamento:** Dispositivos físicos geram um código de pareamento (`pairingCode`) único, que é inserido no painel administrativo para vincular a TV ao sistema.
2. **Editor Modular (Layout):** Administradores organizam telas usando um editor avançado de arrastar-e-soltar (React Grid Layout), definindo a ordem e a duração de cada página.
3. **Sincronização SSE:** Quando uma tela é editada no painel, a TV vinculada atualiza instantaneamente seus widgets sem precisar recarregar a página.
4. **Broadcasts (Transmissões):** Permite interromper a programação padrão para exibir anúncios e comunicados temporários de emergência em displays selecionados.

---

## 🛠️ 2. Arquitetura e Stack Tecnológica

O projeto adota uma arquitetura moderna e totalmente desacoplada:

### **Frontend (SPA)**
- **Biblioteca Base:** React 18.2 com TypeScript e empacotamento Vite.
- **Roteamento:** React Router DOM.
- **Estilização:** TailwindCSS (v4), Motion (framer-motion) para transições fluidas e ícones Lucide React.
- **Componentes de Layout/Gráficos:** React Grid Layout (painel organizador) e Recharts (gráficos financeiros).

### **Backend (API REST)**
- **Framework:** Node.js com Express (v5) e TypeScript.
- **Banco de Dados & ORM:** MySQL gerenciado de forma tipada com o Prisma ORM.
- **Segurança:** Autenticação stateless com JWT, criptografia BcryptJS e controle de acessos global via CORS.
- **Armazenamento e E-mails:** Multer (upload temporário local de mídias) e Nodemailer.

---

## ⚡ 3. Recursos Avançados de Performance
- **Server-Sent Events (SSE):** Permite atualizações em tempo real das TVs sem carregar a página inteira, caindo de volta para *polling* inteligente de 60 segundos se o SSE falhar (economia de ~96% de tráfego desnecessário).
- **Cache ETag & ?lastVersion:** Retorna `304 Not Modified` no backend caso o display não tenha sofrido alterações, poupando CPU do servidor e tráfego na rede.

---

## 📂 4. Catálogo Completo de Widgets Disponíveis

Qualquer widget adicionado ao editor pode usufruir de **estilos Glassmorphism** (efeito translúcido premium), alinhamentos finos, margens ajustáveis e animações de fundo personalizadas (como o efeito Aurora Boreal, chuva, neve e fluxos de gradientes dinâmicos).

Eles estão divididos em 4 grandes categorias:

### A. 🖼️ Básicos & Mídia
* **Texto (`TEXT`):** Exibe textos com controle de fontes, tamanhos, cores e animações de entrada (efeito typewriter/máquina de escrever, fade, slide, pulse ou bounce).
* **Imagem (`IMAGE`):** Exibe fotos locais ou links externos com controle de encaixe (`objectFit`: cover, contain, fill) e escalas.
* **Vídeo (`VIDEO`):** Player nativo com suporte a uploads e URLs do YouTube, incluindo controle de Autoplay, Loop, Mudo e barras de controle.
* **GIF (`GIF`):** Renderiza imagens animadas para dar dinamismo rápido à tela.
* **Info Geral (`FULL_INFO`):** Dashboard integrado combinando data, hora e status em um único widget compacto.

### B. 📅 Produtividade & Organização
* **Notas Adesivas (`NOTES`):** Lembretes estilizados em formato post-it com temas pré-definidos (`glass` translúcido, `yellow-sticky` clássico, `purple-haze` neon ou `neon-glow`).
* **Lista de Tarefas (`TODO`):** Lista de afazeres reativa e interativa com checkboxes e uma barra HSL que mede a porcentagem de progresso das tarefas concluídas.
* **Contagem Regressiva (`COUNTDOWN`):** Cronômetro visual e chamativo para contagem de metas, prazos ou eventos especiais, com aviso para tempo esgotado.
* **Quadro de Deveres (`CHORES`):** Painel de atribuições semanais que lista a tarefa, o dia da semana, o responsável (`assignee`) e o status de conclusão.
* **Cardápio Semanal (`MEAL_PLAN`):** Planejador de alimentação para refeitórios corporativos com slide horizontal intuitivo dividindo as refeições em Café da Manhã, Almoço, Jantar e Lanches.

### C. 📈 Finanças, Notícias & Clima
* **Previsão do Tempo (`WEATHER`):** Dados meteorológicos ao vivo de qualquer cidade com layouts dedicados e plano de fundo interativo que se adapta ao clima.
* **Relógio (`CLOCK`):** Exibição elegante da hora e data atualizadas.
* **Feed de Notícias RSS (`RSS`):** Consome feeds de portais de notícias em tempo real. Possui layout de letreiro rolável (`marquee`), coluna dividida ou imagem cheia.
* **Cotações e Cripto (`MARKET_WATCH`):** Monitora ações (ex: PETR4, AAPL) ou criptomoedas, mostrando setas de variação de preço coloridas HSL e pequenos gráficos sparkline via Recharts.

### D. 🔗 Integrações de Terceiros & Embeds (Seguros)
* **Iframe Genérico (`IFRAME`):** Carrega sites externos com suporte a zoom interno (`scale`), offsets de margem e modo interativo ou estático.
* **Snapshot de Navegador (`BROWSER_SNAPSHOT`):** Tira prints e exibe páginas externas de forma periódica dentro de uma moldura de navegador simulado.
* **Google Workspace (`GOOGLE_DOCS` e `CALENDAR`):** Integração segura de planilhas, documentos, slides, formulários e calendários públicos com temas estilizados.
* **Microsoft Office (`OFFICE_DOCS`):** Visualização nativa de arquivos Word, Excel e PowerPoint hospedados na nuvem da Microsoft.
* **Power BI (`POWER_BI`):** Exibição de relatórios corporativos e dashboards analíticos de KPIs em tempo real.
* **Airtable (`AIRTABLE`):** Incorporação direta de bases de dados do Airtable.
* **Documento PDF (`PDF_DOCUMENT`):** Renderiza documentos ou folhetos PDF hospedados remotamente.
* **HTML Customizado (`EMBED_HTML`):** Campo aberto para injeção de HTML e CSS customizados para maior controle de layouts específicos.
