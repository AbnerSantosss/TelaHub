/**
 * Revelação ao rolar, com o padrão invertido: visível é o estado seguro.
 *
 * Substitui o GSAP + ScrollTrigger que vinham de dois <script> do cdnjs. O
 * motivo não é preferência por CSS — é que a montagem anterior tinha duas
 * formas de deixar a página EM BRANCO, e a segunda foi reproduzida:
 *
 *   1. CDN indisponível → os 26 elementos `.reveal` ficavam presos em
 *      opacity 0, porque `gsap.from` aplica o estado inicial na hora e espera
 *      um gatilho que nunca vem.
 *   2. Chegada por âncora (`/#precos` — o link que o painel e o checkout
 *      usam): tudo que ficava ACIMA do ponto de chegada nunca disparava, já
 *      que esses elementos não "entram" pela borda de baixo.
 *
 * Numa página pré-renderizada para que o conteúdo exista sem JavaScript,
 * esconder conteúdo COM JavaScript anula o trabalho — inclusive para o
 * crawler que executa JS.
 *
 * Aqui o CSS mantém `.reveal` visível por padrão. Só depois que este módulo
 * confirma que o IntersectionObserver existe é que a classe `reveal-ready`
 * entra no <html> e a animação passa a valer. Três defesas fecham o resto:
 *
 *   - o que já está visível (ou acima) na carga é marcado no mesmo quadro;
 *   - `prefers-reduced-motion` desliga a animação no CSS;
 *   - um failsafe revela tudo depois de 2,5s, aconteça o que acontecer.
 *
 * Também economiza ~70 KB de JavaScript de terceiro no caminho crítico de uma
 * página cujo argumento de existir é ranquear.
 */

const FAILSAFE_MS = 2500;

export function iniciarReveal() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const alvos = Array.from(document.querySelectorAll('.reveal'));
  if (alvos.length === 0) return () => {};

  const raiz = document.documentElement;

  // Sem observer (navegador antigo), o conteúdo fica como está: visível.
  if (!('IntersectionObserver' in window)) return () => {};

  const revelarTudo = () => {
    alvos.forEach((el) => el.classList.add('is-in'));
  };

  raiz.classList.add('reveal-ready');

  // Quem já está na tela — ou acima dela — aparece imediatamente, sem esperar
  // rolagem. É o que conserta a chegada por âncora.
  const alturaJanela = window.innerHeight || 0;
  alvos.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < alturaJanela * 0.92) el.classList.add('is-in');
  });

  const observer = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-in');
        observer.unobserve(entrada.target);
      });
    },
    // A margem negativa embaixo faz o elemento animar quando já entrou de
    // verdade, e não no instante em que a primeira linha encosta na borda.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );

  alvos.forEach((el) => {
    if (!el.classList.contains('is-in')) observer.observe(el);
  });

  // Failsafe. Se qualquer coisa acima falhar de um jeito que eu não previ,
  // o pior resultado possível passa a ser "a animação não aconteceu" — nunca
  // "o texto não apareceu".
  const timer = window.setTimeout(revelarTudo, FAILSAFE_MS);

  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}
