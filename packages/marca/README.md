# packages/marca

Identidade "Vitrine Acesa" do TelaHub, compartilhada por `apps/site`, `apps/painel` e `apps/checkout`.

| Arquivo | Uso |
|---|---|
| `tokens.css` | Variáveis CSS de cor, fonte, raio e sombra. Importar uma vez na entrada CSS de cada app. |
| `tailwind-theme.css` | Ponte para o Tailwind v4 (`@theme inline`). Só painel e checkout. |
| `logo.svg` | Logo oficial: grade de telas ligadas a um centro. O componente `LogoHub` do painel desenha o mesmo traço. |
| `favicon.svg` | Favicon dos três apps. |

Não é pacote npm: os apps importam por caminho relativo (`../../packages/marca/tokens.css`). Por isso o build Docker de cada app usa contexto na raiz do monorepo e cada `vite.config` libera a raiz em `server.fs.allow`.

Regra: app nenhum escreve hex solto. Faltou um tom, ele entra em `tokens.css` primeiro, com o contraste medido no comentário do cabeçalho.
