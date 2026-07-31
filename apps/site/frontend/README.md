## Pendências de tracking (GTM / GA4 / Meta Pixel)

O Consent Mode v2 e o container do GTM já estão instalados em `index.html`
(client-side) e os eventos (`cta_click`, `modal_open`, `generate_lead`,
`use_case_tab_select`) já disparam via `dataLayer` (ver `src/lib/tracking.js`,
`src/App.jsx`, `src/components/UseCases.jsx`). O que falta é só configuração,
sem precisar mexer em código:

1. **Substituir o ID do container** — em `index.html`, troque as duas
   ocorrências de `GTM-XXXXXXX` (script assíncrono + `<noscript>`) pelo ID
   real do seu container GTM.
2. **Dentro do GTM (interface web, não código)**:
   - Criar uma tag GA4 Configuration com o Measurement ID (`G-XXXXXXX`).
   - Criar uma tag do Meta Pixel (template oficial ou custom HTML) com o
     Pixel ID, disparando no evento `generate_lead` do dataLayer.
   - Em "Consent Settings" de cada tag de marketing, marcar
     `ad_storage`/`ad_user_data` (Meta) e `analytics_storage` (GA4) — o
     Consent Mode já definido no `index.html` faz o resto automaticamente.
   - Mapear os eventos customizados (`cta_click`, `modal_open`,
     `use_case_tab_select`) como Variáveis de Camada de Dados + Triggers de
     evento customizado, conforme a tabela de eventos documentada no código.
3. Quando decidirem integrar CAPI (server-side) da Meta, o `event_id`
   (`crypto.randomUUID()`) já é gerado em cada `generate_lead` — reaproveitem
   o mesmo valor no payload da Conversions API para dedup automática com o
   Pixel.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
