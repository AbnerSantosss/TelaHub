
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAccent } from './libs/theme';

// Reaplica a cor de destaque salva antes do primeiro paint, para não piscar
// a cor padrão em quem usa outro preset.
initAccent();

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
