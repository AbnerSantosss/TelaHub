import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Bloco de portas do TelaHub em dev: 4100 site, 4110 painel, 4130 checkout.
const PAINEL_DEV = 'http://localhost:4110'
const CHECKOUT_DEV = 'http://localhost:4130'
const API_DEV = process.env.BACKEND_URL ?? `http://localhost:${process.env.BACKEND_PORT ?? '3001'}`

// Atalhos do funil, iguais aos do gateway de produção (apps/gateway/nginx.conf).
// A query de /cadastro (plano, ciclo, utm_*) vai antes do `#`, que é onde o
// painel a lê.
function atalhosDoFunil() {
  return {
    name: 'telahub-atalhos-do-funil',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        let destino = null
        if (/^\/entrar\/?$/.test(url.pathname)) destino = '/app/#/login'
        if (/^\/cadastro\/?$/.test(url.pathname)) destino = `/app/${url.search}#/signup`
        // /app e /checkout sem a barra final: o vite de cada app só responde
        // dentro do `base`. O gateway faz o mesmo 301.
        if (url.pathname === '/app' || url.pathname === '/checkout') {
          res.statusCode = 301
          res.setHeader('Location', `${url.pathname}/${url.search}`)
          return res.end()
        }
        if (!destino) return next()
        res.statusCode = 302
        res.setHeader('Location', destino)
        res.end()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // Dev unificado: http://localhost:4100 serve os quatro apps no mesmo
  // endereço, como o gateway faz em produção. Os links do funil viram
  // relativos e passam pelo proxy abaixo.
  //
  // Variável já presente no ambiente vence o .env.development, por isso
  // atribuir aqui basta. `??=` respeita quem passar outro valor na linha de
  // comando. Para voltar aos endereços separados (4110/4130/3001 direto):
  //   TELAHUB_DEV_SEPARADO=1 npm run dev
  if (command === 'serve' && !process.env.TELAHUB_DEV_SEPARADO) {
    process.env.VITE_APP_URL ??= '/app'
    process.env.VITE_CHECKOUT_URL ??= '/checkout'
    process.env.VITE_API_URL ??= '/api'
  }

  return {
    plugins: [react(), atalhosDoFunil()],
    server: {
      // A 5173 (padrão do Vite) é disputada por outros projetos desta máquina e,
      // no Windows, dois processos bindam a mesma porta sem erro: quem responde é
      // o que subiu primeiro. `strictPort` faz o Vite falhar em vez de pular para
      // outra porta, o que deixaria os links dos outros apps apontando para o vazio.
      port: 4100,
      strictPort: true,
      proxy: {
        // `ws: true` leva junto o websocket do HMR do painel e do checkout.
        // Os dois têm `base` /app/ e /checkout/, então os caminhos chegam
        // a eles sem reescrita.
        // Chave com `^` é regex. Como texto, '/app' casaria também com
        // '/apple-touch-icon.png' (o Vite compara por prefixo).
        '^/app(/|\\?|$)': { target: PAINEL_DEV, ws: true },
        '^/checkout(/|\\?|$)': { target: CHECKOUT_DEV, ws: true },
        '^/api/': { target: API_DEV, changeOrigin: true },
        '^/uploads/': { target: API_DEV, changeOrigin: true },
      },
      fs: {
        // packages/marca (tokens da marca) fica fora da pasta do app.
        allow: [__dirname, path.resolve(__dirname, '../..')],
      },
    },
  }
})
