# Resumo Geral da Landing Page — TelaHub

Este documento detalha a estrutura, o tom da copy de vendas, as seções e os elementos visuais da landing page do **TelaHub**, uma plataforma profissional de gerenciamento remoto de telas e sinalização digital (Digital Signage).

---

## 1. Identidade e Estilo Visual

A landing page utiliza um design moderno baseado em um tema escuro com estética de alta tecnologia:
*   **Cores Principais**: Fundo azul escuro profundo (`#0B0F19`), detalhes e elementos interativos em ciano neon (`#00F0FF`) e roxo/índigo para transições e orbes de iluminação ambiente.
*   **Efeitos Visuais**: Fundo interativo com partículas de constelação responsivas ao toque, texturas sutis de ruído digital, orbes de iluminação desfocados e layouts de cartões com efeito de vidro reflexivo (glassmorphism).
*   **Tipografia**: Família de fontes *Inter* para excelente legibilidade corporativa.
*   **Rolagem**: Rolagem nativa otimiza3da para alta performance, eliminando o atraso de scroll em desktops, combinada com transições de clique suaves via CSS e GSAP para revelações de elementos.

---

## 2. Estrutura Detalhada das Seções da LP

### Seção 1: Cabeçalho e Navegação (Navbar & Mobile Menu)
*   **Navbar Desktop**: Barra fixa transparente com desfoque de fundo (blur) contendo a logo com ícone de TV estilizado, links rápidos de navegação e botões de chamada para ação (CTA).
*   **Menu Hamburger Responsivo**: Menu exclusivo em tela cheia otimizado para dispositivos móveis com links táteis ilustrados por emojis e botão de conversão proeminente.
*   **Dock Flutuante Mobile**: Menu fixado na parte inferior da tela em smartphones que dá acesso rápido com apenas um clique aos principais blocos: *Recursos*, *Casos*, *Planos* e *CTA Grátis*.

---

### Seção 2: Seção Hero (Apresentação Principal)
*   **Copy de Vendas (Foco no Vendedor Silencioso)**:
    *   *Título*: "Transforme a TV da sua loja em um vendedor silencioso que trabalha 24 horas por dia."
    *   *Subtítulo*: Explicita a eliminação definitiva de pen-drives, fios soltos e telas pretas, promovendo exibição instantânea de promoções, cardápios e vídeos atualizados em 5 minutos.
    *   *Social Proof*: Marcador verde indicando "🟢 Mais de 200 empresas já aboliram o pen-drive no Brasil".
*   **Dashboard Mockup Interativo**:
    *   Simula o painel de controle principal da plataforma (`app.telahub.com.br/displays`) rodando em um navegador web.
    *   **Grelha de Displays**: Exibe 6 cartões de TV simulando telas reais em funcionamento (com status *Online* em ciano ou *Offline* desbotado).
    *   **Imagens de Signage Reais**: Cada TV exibe uma arte de sinalização digital condizente com seu ambiente (Boas-vindas na recepção, avisos no elevador e cardápio na cafeteria).
    *   **Dados de Automação**: Barra com estatísticas de uptime (99.7%), cenas ativas e sincronização simulando dados reais em segundos.
    *   **Notificação Flutuante**: Balão dinâmico simulando uma atualização de cardápio enviada com sucesso em tempo real.

---

### Seção 3: Tecnologia e Resiliência (Argumento Técnico)
*   **Gancho Comercial**: "Tela preta = cliente perdido. Isso acaba agora."
*   **Pilar 1 — Sincronização Instantânea**:
    *   *Detalhe*: Atualizações de preços ou grades enviadas do celular entram no ar no display físico em menos de 3 segundos, sem interrupção de mídia ou recarregamentos de página.
*   **Pilar 2 — Resiliência Failsafe (Cache Offline)**:
    *   *Detalhe*: As mídias e playlists são salvas localmente no armazenamento do aparelho (player). Se a conexão com a internet cair, a transmissão continua rodando perfeitamente sem exibir telas pretas ou avisos de erro de rede.

---

### Seção 4: Grade de Recursos (Bento Grid)
Layout composto por três cartões dinâmicos que destacam as maiores proezas técnicas da plataforma:
1.  **Estúdio Canvas Multi-Cenas**: 
    *   Explica o editor visual livre de templates fixos, com suporte a rotação vertical (9:16) ou horizontal (16:9).
    *   *Visual*: Exibição interativa das camadas de uma cena (Imagem de fundo, Títulos de preços e Vídeo promocional com tempos de transição individuais).
2.  **Widgets Corporativos**:
    *   Chips interativos com blocos prontos de arrastar e soltar (Previsão do tempo, Notícias RSS, Letreiro de avisos rolável, Relógio e QR Code).
3.  **Integrações de Elite**:
    *   Badges de conexão direta e segura com bases de dados dinâmicas (Power BI, Airtable, Google Sheets, SharePoint e PDFs remotos) sem necessidade de exportação manual diária.

---

### Seção 5: Segmentação Interativa (Casos de Uso)
Mecanismo de abas animadas que permite ao visitante simular o TelaHub em sua vertical de negócio:
*   **Abas Disponíveis**:
    1.  *🏢 Condomínios*: Substitui murais de papel por telas verticais em elevadores. (Visual: TV simulada exibindo comunicado urgente de manutenção do condomínio Alameda Verde).
    2.  *🏙️ Prédios Corporativos*: Recepções modernas, diretórios de andares e boas-vindas customizado integrado à agenda. (Visual: TV simulada exibindo mensagem de recepção ao visitante "Carlos Mendes" da TechBridge Ltda).
    3.  *🍽️ Varejo & Alimentação*: Cardápios dinâmicos alterados em segundos no celular, aumentando as vendas em 22%. (Visual: TV simulada exibindo menu do dia de prato principal com preços destacados).
    4.  *📣 Endomarketing & RH*: Metas de vendas, avisos segmentados por setor e aniversariantes integrados. (Visual: TV simulada exibindo progresso de vendas atualizado ao vivo via Power BI).
*   **Micro-Interação Premium**: Ao passar o cursor (ou tocar) em qualquer uma das TVs simuladas, a caixa de informações de texto esmaece suavemente, revelando a arte gráfica do display no painel traseiro em tela cheia.

---

### Seção 6: Planos e Preços (Modelo por Tela)
Tabela comercial clara, estruturada para que o cliente pague estritamente pelas telas que conectar:
*   **Plano Starter (R$ 69/mês)**: 
    *   *Perfil*: Lojas de bairro, pequenos condomínios e clínicas.
    *   *Entrega*: Até 2 telas conectadas, widgets essenciais, cache offline e suporte por e-mail.
*   **Plano Business (R$ 149/mês — Mais Vendido)**:
    *   *Perfil*: Redes de varejo, médias empresas e edifícios comerciais sérios.
    *   *Entrega*: Até 6 telas conectadas, transições avançadas, integração com Power BI/Airtable, agendamento de grade horária e suporte prioritário com SLA.
*   **Plano Enterprise (Sob consulta)**:
    *   *Perfil*: Redes com mais de 10 telas e franquias.
    *   *Entrega*: White Label completo (logo e marca do cliente no painel de administração), APIs personalizadas e gerente de conta dedicado via WhatsApp.

---

### Seção 7: Chamada Final (Footer CTA Strip)
*   **Tom de Urgência Máxima**: "Daqui 5 minutos, sua tela pode estar no ar. Ou você pode continuar com o pen-drive."
*   **Ação**: Contém os links de registro imediato ("Quero ativar agora") e botão secundário para agendamento de reunião ao vivo.

---

## 3. Estrutura de Arquivos da Infraestrutura de Deploy

A landing page possui suporte a duas distribuições idênticas no repositório:
1.  **Site Estático (`/index.html`)**: Contém a página de vendas compilada em um único arquivo HTML super rápido com CSS e JS embutidos, otimizado para carregamento instantâneo.
2.  **Aplicação SPA React (`/frontend/`)**: Versão refatorada e modularizada em componentes React (Vite) estruturada para futuras expansões e integração direta com o ecossistema SaaS da plataforma.
3.  **Arquivos Docker na Raiz**:
    *   `docker-compose.yml`: Orquestra o container Nginx na porta customizada **`42938`**.
    *   `frontend/Dockerfile`: Build multi-stage enxuto que compila o app e serve as páginas estáticas com alto desempenho.
    *   `frontend/nginx.conf`: Configurações de gzip, cache HTTP rigoroso e roteamento de SPA seguro no Nginx.
