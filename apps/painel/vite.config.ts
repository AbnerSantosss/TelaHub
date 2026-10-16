import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_DEV =
  process.env.BACKEND_URL ?? `http://localhost:${process.env.BACKEND_PORT ?? '3001'}`;

export default defineConfig(({ command }) => {
    // Dev unificado (http://localhost:4100 com tudo, ver apps/site/vite.config.js):
    // os endereços dos outros apps viram relativos ao mesmo domínio, como no
    // gateway de produção. Variável já presente no ambiente vence o `.env`,
    // por isso atribuir aqui basta, sem mexer nele. `??=` respeita quem passar
    // outro valor na linha de comando. Para os endereços separados de antes:
    //   TELAHUB_DEV_SEPARADO=1 npm run dev
    if (command === 'serve' && !process.env.TELAHUB_DEV_SEPARADO) {
      process.env.VITE_API_URL ??= '/api';
      process.env.VITE_SITE_URL ??= '/';
      process.env.VITE_CHECKOUT_URL ??= '/checkout';
    }

    return {
      // O painel vive em /app/ no domínio único (gateway em produção, proxy
      // do site em dev). Asset absoluto escrito à mão tem de passar por
      // import.meta.env.BASE_URL, ou sai da pasta do painel.
      base: '/app/',
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
          '/api': {
            target: API_DEV,
            changeOrigin: true,
          },
          '/uploads': {
            target: API_DEV,
            changeOrigin: true,
          },
        },
        fs: {
          // packages/marca (tokens da marca) fica fora da pasta do app.
          allow: [__dirname, path.resolve(__dirname, '../..')],
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
