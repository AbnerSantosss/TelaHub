# PROJECT_MEMORY

## Resumo do Estado Atual
O projeto "Display Office" consiste em uma aplicação full-stack para gerenciamento e exibição de páginas/telas em dispositivos (displays) através de códigos de pareamento. O sistema também possui um mecanismo de broadcasts (anúncios) e configurações do sistema. O backend expõe uma API REST conectada a um banco de dados MySQL, enquanto o frontend é construído como uma SPA (Single Page Application).

## Arquitetura e Tecnologias

### Frontend
- **Framework/Biblioteca:** React 18.2 construído com Vite.
- **Roteamento:** React Router DOM.
- **Estilização:** TailwindCSS (v4), Motion (framer-motion) para animações, Lucide React para ícones.
- **Componentes Avançados:** React Grid Layout (para estruturação de páginas/dashboard), Recharts (para relatórios ou métricas), Google Maps JS API.
- **Linguagem:** TypeScript.

### Backend
- **Framework:** Node.js com Express (v5) em TypeScript.
- **Banco de Dados:** MySQL gerenciado usando Prisma ORM.
- **Autenticação e Segurança:** JWT e BcryptJS (criptografia de senhas), além de middleware CORS mapeado globalmente.
- **Outras Dependências:** Multer para upload de arquivos/imagens e Nodemailer para envios de e-mails.

### Banco de Dados (Prisma Schema - MySQL)
- **Modelos Principais:**
  - `User`: Administradores e usuários do sistema.
  - `Display`: Telas ou painéis persistentes configurados com um layout de páginas (salvo via string/LongText).
  - `Device`: Dispositivos físicos pareados ao sistema por `pairingCode`, associados ou não a um `Display`.
  - `Broadcast`: Mensagens temporárias ou permanentes (`page`) para sobrescrever a exibição padrão de uma série de terminais (`displayIds`).
  - `Setting`: Configurações dinâmicas de Key-Value.

## Decisões Técnicas Importantes
- **Autenticação via JWT:** Usado para gerenciar estado seguro de login (stateless RESTful API).
- **ORM Prisma com MySQL:** Escolhido por tipagem forte, além da facilidade de lidar com armazenamentos grandes de atributos dinâmicos (`LongText`) nas configurações visuais das telas.
- **Arquitetura Desacoplada (Frontend/Backend):** Garantia de controle modular e facilidade no deploy de componentes através de múltiplos serviços/containers.

## Pendências e Próximos Passos
- **Homologação e Testes (Staging):** Concluir a implantação da stack de testes `display-testes` na branch `production` via Portainer, configurar a rota correspondente no túnel do Cloudflare e testar as TVs/Kiosks.
- **Fusão com a Branch Principal (Main):** Após a homologação e validação completa no ambiente de testes (`production`), realizar o merge (mesclagem) das alterações de volta para a branch `main` no repositório do GitHub.
- **Armazenamento de Mídia (Object Storage):** Refatorar o upload de imagens/vídeos (atualmente baseado via `multer` em disco local) para conectar com uma cloud de arquivos de forma a não perder os uploads em caso de restart do servidor na nuvem.
- **Segurança da API:** Considerar uso de limitações de IP (Rate Limiting) e sanitização dos dados que entram via endpoints.
- **Gestão de Segredos:** Criar fluxos para chaves de terceiros (SMTP, Database URI, JWT Secret) por ambiente de CI/CD.

## Histórico de Alterações (Changelog)
- **[Atualização Premium de Widgets (Concorrência) - Maio/2026]**:
  - **13 Novos Widgets Premium**: Integração completa de novos widgets interativos e de terceiros que colocam a plataforma em patamar superior de mercado:
    - *Bloco de Notas (`NOTES`)*: Notas adesivas estilizadas com temas premium (yellow-sticky, glassmorphism, neon, purple-haze).
    - *To-Do List (`TODO`)*: Lista de afazeres reativa com barra de progresso dinâmica baseada no status das checkboxes.
    - *Contagem Regressiva (`COUNTDOWN`)*: Cronômetro de alto impacto visual com data limite e mensagens customizadas de expiração.
    - *Quadro de Deveres (`CHORES`)*: Gerenciador de deveres semanais com campos para responsável, dia da semana e status.
    - *Cardápio Semanal (`MEAL_PLAN`)*: Planejador completo de refeições com suporte elegante de slide horizontal para os dias da semana.
    - *Ações & Criptomoedas (`MARKET_WATCH`)*: Painel de cotações financeiras com setas de variação HSL colorizadas e mini sparklines dinâmicos via Recharts.
    - *Snapshot de Navegador (`BROWSER_SNAPSHOT`)*: Visualizador inteligente de URLs externas com frame estilizado de navegador mockado.
    - *Suíte de Incorporadores (Google, Office, Power BI, Airtable, PDF, HTML Customizado)*: Componentização robusta e sanitizada com iframes isolados para exibir de forma segura e elegante documentos do Google Workspace, Office 365, relatórios Power BI, bases Airtable, arquivos PDF remotos e código HTML customizado do cliente.
  - **Paridade Absoluta e UI Glassmorphism**: Mapeamento completo dos novos widgets em `Editor.tsx` e `SceneEditor.tsx`, incluindo inicializadores padrão, listagem de camadas com ícones reativos, mini pré-visualizações fiéis no canvas e formulários administrativos detalhados com design Dark-Glassmorphism no painel direito de propriedades.
  - **Correções Estruturais de Reatividade**: Correção de problemas de concorrência de IDs na manipulação de listas e eliminação de seletores diretos de DOM e refs imperativas no preenchimento de dados reativos (como no Meal Plan), garantindo ciclo de vida limpo e renderização sincronizada no React.
  - **Validação Estática do Compilador**: Correção de pequenos erros de sintaxe no iframe do Calendário do Google em `Player.tsx`, alcançando compilação de produção do frontend (`vite build`) limpa e sem erros.
- **[Otimização de Performance e Polling Inteligente - Maio/2026]**:
  - **Mecanismo SSE com Fallback Inteligente**: Integração de Server-Sent Events (SSE) para sincronização instantânea em tempo real com fallback automático de polling a cada 60s. Otimização de tráfego de polling em ~96%.
  - **Mecanismo de Cache ETag e ?lastVersion**: Implementação de cache HTTP condicional baseado em `If-None-Match`, cabeçalho `x-last-version` e parâmetro de URL `?lastVersion` retornando `304 Not Modified` no backend sem serializar dados no banco, poupando CPU e largura de banda do servidor em TV players/kiosks.
  - **Padronização de Versões do Player**: Refatoração do componente `Player.tsx` para armazenar a versão do display estritamente como números (Unix timestamp em milissegundos), evitando type mismatches em verificações de versão subsequentes.
  - **Resolução de Erros de Compilação**: Correção de bug de tipagem no arquivo `broadcasts.routes.ts` (casting de `req.params.id as string`), garantindo compilação bem-sucedida do TypeScript no backend.
  - **Ambiente de Testes Isolado (Staging)**: Criação da branch `production` e alteração das portas de contêineres no `docker-compose.yml` (`frontend` para `8097`, `backend` para `3006`, `pgadmin` para `5051`) para permitir implantação concomitante via Portainer e testes através do Cloudflare Tunnel sem afetar as portas padrão (`8095`, `3005`, `5050`) do ambiente principal.
- **[Ata de Criação]**: Criação inicial da documentação contínua de memória técnica do projeto (`PROJECT_MEMORY.md`). Constatado que o `README.md` original do frontend era um template placeholder, fazendo necessária a implementação deste arquivo root que concentra o status do projeto.
