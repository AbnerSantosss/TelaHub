import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    // 3000 é o painel e 5173 é o site de vendas — o checkout usa 3030 para os
    // três rodarem juntos em desenvolvimento.
    port: 3030,
    host: '0.0.0.0',
    proxy: {
      // Em produção o Nginx faz o proxy de /api e o cliente sempre chama
      // caminho relativo (ver src/lib/api.ts). Em dev, quem faz esse papel é
      // este proxy.
      //
      // A porta virou configurável porque o valor fixo estava ERRADO e o
      // sintoma não denunciava a causa: aqui dizia 3001, enquanto o `.env` do
      // backend define `PORT=3002`. Quando a 3001 está ocupada por outro dev
      // server (o do painel usa essa faixa), o proxy encontra a SPA errada e
      // devolve HTML com status 200 no lugar do JSON da API — o checkout
      // falha com "este link não existe mais", que não tem relação nenhuma
      // com o problema real.
      //
      // Ajuste `BACKEND_PORT` (ou `BACKEND_URL` inteiro) para casar com o
      // backend que você está rodando.
      '/api': {
        target:
          process.env.BACKEND_URL ?? `http://localhost:${process.env.BACKEND_PORT ?? '3002'}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
