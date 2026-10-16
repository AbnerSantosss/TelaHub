
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Até 15/10/2026 o painel tinha seis cores de destaque à escolha e guardava a
// escolhida em localStorage. A cor agora é a da marca, fixa; a chave antiga só
// ocupa espaço. try/catch porque o acesso ao storage pode lançar (aba anônima,
// dados de site bloqueados).
try {
  window.localStorage.removeItem('telahub-accent');
} catch {
  /* sem storage, nada a limpar */
}

// A TV (#/player) não segue a identidade do painel: mantém a fonte e o fundo
// escuro do conteúdo exibido. O index.css lê este atributo
// (`html[data-superficie="tv"]`). Com HashRouter a rota mora no hash, então
// basta olhar o hash na carga e a cada troca.
const marcarSuperficie = () => {
  const naTv = window.location.hash.startsWith('#/player');
  if (naTv) {
    document.documentElement.dataset.superficie = 'tv';
  } else {
    delete document.documentElement.dataset.superficie;
  }
};
marcarSuperficie();
window.addEventListener('hashchange', marcarSuperficie);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
