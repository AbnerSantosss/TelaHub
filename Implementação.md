# Guia de Implementação: Substituição de Ícones por Modelos 3D na Grid do TelaHub

**Objetivo:** Substituir os ícones de linha atuais (Lucide) do menu lateral da "Biblioteca de Widgets" por novos ícones 3D premium (da biblioteca *3dicons*), mapeando os componentes conforme o ecossistema e o Design System do TelaHub.

---

### 1. Onde Buscar os Ícones (Passo a Passo do Download)

1. Acesse o site oficial da biblioteca open-source: **3dicons.co**
2. No catálogo, procure pelos termos em inglês equivalentes aos widgets do TelaHub (ex: *camera* para IMAGEM, *video* ou *clapperboard* para VÍDEO, *calendar* para AGENDA, *clock* para RELÓGIO).
3. **Filtro de Estilo:** Escolha a variação **"Dynamic"** (que possui reflexos sutis excelentes para o Dark Mode) ou **"Clay"** (mais fosca e minimalista).
4. **Configuração de Cor:** Use a ferramenta web do site para ajustar os detalhes ou reflexos secundários dos ícones para o tom **Violeta Tecnológico (`#7C3AED`)**, mantendo a base neutra (branca, cinza ou transparente).
5. **Download:** Baixe os ícones escolhidos no formato **PNG** (com fundo transparente) ou **WebP** na resolução de **250x250px** (não há necessidade de baixar resoluções maiores, como 4K, para economizar performance).

---

### 2. Onde Salvar no Projeto
Mova todas as imagens baixadas para o diretório de assets estáticos do seu frontend:
`frontend/src/assets/icons3d/` (ou dentro da pasta `public/icons3d/`, dependendo de como o seu Vite está configurado para servir imagens).

---

### 3. Mapeamento de Arquivo e Estrutura para a IA
Oriente a IA a varrer a pasta `frontend/components` (especialmente os arquivos de renderização de painel como `Dashboard.tsx`, `Editor.tsx` ou `MediaLibrary.tsx`) para localizar a grid de seleção de widgets. Ela deve alterar as propriedades ou elementos de ícone para apontar para os novos ativos tridimensionais, seguindo as categorias oficiais do sistema:

* **Categoria A: Básicos & Mídia (`BÁSICOS`)**
    * Widget `TEXT` (Texto) ➔ Ícone 3D de Bloco de Notas ou Letra "A/T" estilizada
    * Widget `IMAGE` (Imagem) ➔ Ícone 3D de Câmera Fotográfica ou Galeria
    * Widget `VIDEO` (Vídeo) ➔ Ícone 3D de Claquete ou Câmera de Cinema
    * Widget `GIF` (Gif) ➔ Ícone 3D de Caixa de Presente (Gift) ou elemento dinâmico
    * Widget `FULL_INFO` (Info Geral) ➔ Ícone 3D de Painel Combinado / Dashboard

* **Categoria B: Produtividade & Organização (`UTILITÁRIOS` / `INTERATIVOS`)**
    * Widget `NOTES` (Notas Adesivas) ➔ Ícone 3D de Post-it com dobra ou Prancheta
    * Widget `TODO` (Lista de Tarefas) ➔ Ícone 3D de Checkbox ou Prancheta de Afazeres
    * Widget `COUNTDOWN` (Contagem Regressiva) ➔ Ícone 3D de Ampulheta ou Alarme Dinâmico
    * Widget `CHORES` (Quadro de Deveres) ➔ Ícone 3D de Tabela ou Painel de Atribuições
    * Widget `MEAL_PLAN` (Cardápio Semanal) ➔ Ícone 3D de Prato com Talheres ou Menu

* **Categoria C: Finanças, Notícias & Clima**
    * Widget `WEATHER` (Previsão do Tempo) ➔ Ícone 3D de Sol com Nuvem
    * Widget `CLOCK` (Relógio) ➔ Ícone 3D de Relógio Analógico ou Cronômetro
    * Widget `RSS` (Feed de Notícias) ➔ Ícone 3D de Antena / Sinal de Transmissão
    * Widget `MARKET_WATCH` (Cotações e Cripto) ➔ Ícone 3D de Gráfico de Linha Ascendente ou Moeda

* **Categoria D: Integrações de Terceiros & Embeds**
    * Widgets de Integração (`IFRAME`, `GOOGLE_DOCS`, `CALENDAR`, `POWER_BI`, etc.) ➔ Mantenha ou utilize variações de ícones 3D neutros (como conexões, engrenagens ou globos tridimensionais) que representem ferramentas web.

---

### 4. Restrições Técnicas e Alinhamento ao Design System

Para garantir a **Austeridade Visual** e o padrão **Enterprise B2B** do TelaHub, aplique rigorosamente as seguintes diretrizes no código:

* **Controle de Escala Rígido (Atenção Crítica):** Ícones 3D possuem alto peso visual. Reduza o tamanho de renderização da imagem para ficar entre **40px e 48px** no máximo. O layout precisa respirar e o texto descritivo dos botões deve continuar perfeitamente legível.
* **Ajuste de Cores e Contraste:** Escolha variações de ativos 3D que conversem com as superfícies em Cinza Mineral (`#2D3139`) e fundos em Cinza Corporativo (`#1C1D22`). Dê preferência a modelos que tenham reflexos sutis ou detalhes no tom **Violeta Tecnológico (`#7C3AED`)** para criar consistência de marca ao passar o mouse (*hover*).
* **Padronização de Perspectiva:** Todos os novos assets tridimensionais carregados devem usar exatamente a mesma rotação de câmera e ângulo (ex: perspectiva isométrica padronizada). Nunca misture um ícone totalmente plano ou frontal com outros inclinados.
* **Responsividade da Grid:** Garanta que a tag `<img />` ou o container que envelopa o ícone 3D utilize propriedades de contenção e centralização proporcional (`object-contain`), adaptando-se suavemente caso a densidade de dados mude em visualizações mobile de controle ou displays verticais.