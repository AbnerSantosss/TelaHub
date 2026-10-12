import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        // 3010, não 3000: a 3000 é disputada por outros projetos desta máquina
        // (Next.js etc.) e, no Windows, dois processos bindam a mesma porta sem
        // erro — quem responde é o que subiu primeiro, e a LP abria o app errado.
        port: 3010,
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
