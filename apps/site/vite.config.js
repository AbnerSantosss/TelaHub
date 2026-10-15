import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bloco de portas do TelaHub em dev: 4100 site, 4110 painel, 4130 checkout.
    // A 5173 (padrão do Vite) é disputada por outros projetos desta máquina e,
    // no Windows, dois processos bindam a mesma porta sem erro: quem responde é
    // o que subiu primeiro. `strictPort` faz o Vite falhar em vez de pular para
    // outra porta, o que deixaria os links dos outros apps apontando para o vazio.
    port: 4100,
    strictPort: true,
  },
})
