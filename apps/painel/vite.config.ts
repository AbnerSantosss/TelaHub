import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        // Bloco de portas do TelaHub em dev: 4100 site, 4110 painel, 4130 checkout.
        // Já foi 3000 e depois 3010; as duas são disputadas por outros projetos
        // desta máquina e, no Windows, dois processos bindam a mesma porta sem
        // erro. Quem responde é o que subiu primeiro, e o "Entrar" da LP abria
        // outro produto. `node check-env.js` acusa quando isso acontece.
        port: 4110,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '/uploads': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [react(), tailwindcss()],
      // Sem `define` de chave de API: o template original do AI Studio injetava
      // GEMINI_API_KEY no bundle do navegador, ou seja, publicava a chave para
      // qualquer visitante. Nenhum componente do painel usa essa variável.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 800,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                  return 'vendor-react';
                }
                if (id.includes('motion') || id.includes('framer-motion')) {
                  return 'vendor-motion';
                }
                if (id.includes('recharts') || id.includes('d3')) {
                  return 'vendor-recharts';
                }
              }
            }
          }
        }
      }
    };
});
