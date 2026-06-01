Refatore apenas a copy com com s instruçoes abaxo:



SEÇÃO 1: HERO SECTION (O Impacto Inicial e Retenção)
Objetivo da Seção: Prender a atenção do empresário nos primeiros 3 segundos. O foco não é vender "software", mas sim vender "uma loja mais moderna" e "o fim da dor de cabeça com a TV". O layout deve ser limpo, claro (Light Mode) e transmitir extrema credibilidade comercial.

1. COPY (Textos Persuasivos)
Badge (Prova Social Acima do Título):
🟢 Mais de 200 empresas já aboliram o pen-drive no Brasil.

Headline Principal (H1):
Transforme a TV da sua loja em um vendedor silencioso que trabalha 24 horas por dia.

Sub-headline (H2 / Apoio):
Diga adeus aos fios soltos, pen-drives e telas pretas. Exiba promoções, cardápios dinâmicos e vídeos institucionais em qualquer TV, atualizando tudo pelo celular ou computador em menos de 5 minutos.

Call to Action (Botão Primário):
Quero modernizar minhas telas agora

Micro-copy (Quebra de atrito abaixo do botão):
🔒 (utilize algum a biblioteca de incones ) Teste gratuito de 7 dias. Não exige cartão de crédito.

2. DIRETRIZES DE UI/UX E TAILWIND CSS (Mobile-First Absoluto)
A seção deve ser dividida em duas colunas no Desktop (Texto na esquerda, Mockup na direita) e empilhada no Mobile (Texto em cima, Mockup embaixo).

A. Container Principal (O Fundo):

Cores: Fundo totalmente branco para passar clareza e profissionalismo.

Tailwind Classes: w-full min-h-[90vh] bg-[#FFFFFF] flex items-center justify-center pt-24 pb-12 overflow-hidden

B. Grid Responsivo (O Alinhamento):

Tailwind Classes: container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center

C. Coluna da Esquerda (Textos e CTA):

Badge: Fundo verde ultra-claro com texto verde esmeralda para chamar a atenção de forma positiva.

Classes: inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[#10B981] text-xs sm:text-sm font-semibold mb-6

Headline (H1): Responsividade extrema para não quebrar palavras na tela do celular.

Classes: text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#111827] tracking-tight text-balance leading-tight mb-6

Sub-headline (p): Leitura confortável.

Classes: text-base sm:text-lg text-[#4B5563] text-pretty leading-relaxed mb-8 max-w-lg

Container dos Botões: Ocupa a largura total no mobile e o tamanho exato do texto no desktop.

Classes: flex flex-col sm:flex-row items-center gap-4

Botão CTA: Azul Corporativo Sólido, cantos levemente arredondados, sem bordas ou sombras exageradas.

Classes: w-full sm:w-auto px-8 py-4 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-md

Micro-copy: Texto pequeno, acinzentado, com ícone de cadeado.

Classes: flex items-center justify-center sm:justify-start gap-2 text-sm text-[#9CA3AF] mt-4 font-medium

D. Coluna da Direita (Mockup Visual):

Conceito da Imagem: Um mockup de alta qualidade mostrando uma Smart TV pendurada na parede de um ambiente real (uma padaria chique, clínica moderna ou recepção). Na tela da TV, a interface do TelaHub rodando uma oferta chamativa ou cardápio. Proibido usar mockups futuristas/cyberpunk.

Animação de Entrada (Framer Motion): Sugestão de entrada suave vindo da direita para a esquerda (initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}).

Tailwind Classes (Container do Mockup): relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-[#E5E7EB] bg-[#F9FAFB]

Tailwind Classes (Imagem): w-full h-full object-cover

extremamente importante o foco ser otimizado para celular 