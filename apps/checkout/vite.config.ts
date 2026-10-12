import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    // 3010 é o painel e 5173 é o site de vendas — o checkout usa 3030 para os
    // três rodarem juntos em desenvolvimento.
    port: 3030,
    host: '0.0.0.0',
    proxy: {
      // Em produção o Nginx faz o proxy de /api e o cliente sempre chama
      // caminho relativo (ver src/lib/api.ts). Em dev, quem faz esse papel é
      // este proxy.
      //
      // ⚠️ US-A-07 — O PADRÃO AQUI JÁ ESTEVE ERRADO E CUSTOU TEMPO.
      //
      // O padrão correto é 3001: é o que `apps/api/.env` (`PORT=3001`), o
      // `.env.example` e o próprio `server.ts` usam. O valor que estava escrito
      // aqui era 3002, e o sintoma NÃO denuncia a causa: nada escuta na 3002,
      // então o proxy responde erro de conexão que a tela traduz para "este
      // link de checkout não existe mais" ou "verifique sua conexão" — duas
      // mensagens que mandam procurar o defeito no lugar errado (sessão,
      // banco, rede) enquanto o problema é uma porta.
      //
      // Pior ainda quando alguma coisa ESTÁ escutando na porta errada: o proxy
      // encontra outra SPA e devolve HTML com status 200 no lugar do JSON da
      // API — aí o erro chega como "resposta de sessão inválida".
      //
      // Continua sobrescrevível por env para quem roda o backend em outra
      // porta: `BACKEND_PORT=3005 npm run dev`, ou `BACKEND_URL` inteiro
      // (contêiner, túnel, máquina remota).
      '/api': {
        target:
          process.env.BACKEND_URL ?? `http://localhost:${process.env.BACKEND_PORT ?? '3001'}`,
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
