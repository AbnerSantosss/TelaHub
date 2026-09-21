import { renderToString } from 'react-dom/server';
import App from './App.jsx';

/**
 * Entrada do build de SSR. Só é usada por `scripts/prerender.mjs`, no build —
 * não há servidor Node em produção: o nginx serve HTML estático.
 *
 * ⚠️ ARMADILHA: `render()` recebe o CAMINHO da rota. Antes ele não recebia nada
 * e o `App` era sempre a home; com cinco páginas, esquecer esse argumento
 * geraria cinco arquivos com o mesmo conteúdo, todos com `<title>` diferente —
 * o crawler leria "Termos de uso" no título e a landing no corpo. Isso não
 * quebra o build nem aparece no navegador (o React re-renderiza a página certa
 * na hidratação): só o Google e as ferramentas de IA veem o erro.
 *
 * A tabela de rotas NÃO passa por aqui: `scripts/prerender.mjs` importa
 * `src/paginas/rotas.js` direto do disco. Ela é ESM puro, sem JSX e sem nada do
 * Vite, então o Node a lê como está — e reexportá-la daqui só criaria um
 * arquivo com exportações que não são componentes, o que o
 * `react-refresh/only-export-components` reprova no lint.
 */
export function render(caminho = '/') {
  return renderToString(<App url={caminho} />);
}
