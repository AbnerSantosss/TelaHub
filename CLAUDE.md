# Wiki TelaHub / Display de Vendas — Esquema

Esta é uma base de conhecimento pessoal (padrão LLM Wiki) sobre o projeto **Display de Vendas (TelaHub)**, cobrindo tanto o lado **técnico** (arquitetura, decisões de desenvolvimento, bugs, aprendizados do app em `backend/` e `frontend/`) quanto o lado de **negócio/produto** (mercado, concorrentes, estratégia de vendas, conteúdo do site).

## Camadas

- `raw/` — fontes brutas (artigos, transcrições, prints, notas soltas, links). **Imutável**: nunca editar ou apagar um arquivo aqui depois de adicionado. Anexos/imagens baixados ficam em `raw/assets/`.
- `wiki/` — páginas geradas e mantidas por mim (Claude). Organizadas em:
  - `wiki/tecnico/` — páginas sobre arquitetura, decisões técnicas, bugs resolvidos, aprendizados de desenvolvimento.
  - `wiki/negocio/` — páginas sobre mercado, concorrentes, estratégia, produto, conteúdo.
  - `wiki/index.md` — catálogo de todas as páginas, por categoria.
  - `wiki/log.md` — histórico cronológico, append-only.

## Workflow: ingest (processar uma fonte nova)

Quando o usuário adicionar um arquivo em `raw/` (ou colar um conteúdo) e pedir para processar:

1. Ler a fonte inteira.
2. **Modo supervisionado** (padrão deste vault): discutir com o usuário os pontos-chave e como eles se conectam ao que já existe na wiki antes de escrever — não processar em lote silenciosamente.
3. Escrever ou atualizar as páginas relevantes em `wiki/tecnico/` ou `wiki/negocio/` (ou ambas, se a fonte cruzar os dois domínios).
4. Atualizar `wiki/index.md` com links para páginas novas ou alteradas.
5. Adicionar uma entrada em `wiki/log.md` no formato:
   `## [YYYY-MM-DD] <tipo> | <resumo curto>`
   onde `<tipo>` é um de: `ingest`, `setup`, `query`, `lint`.

## Workflow: query (responder perguntas usando a wiki)

1. Ler `wiki/index.md` primeiro para localizar páginas relevantes.
2. Ler as páginas específicas encontradas.
3. Responder citando a página/fonte de onde veio a informação.
4. Se a resposta gerar uma síntese nova e valiosa (comparação, conexão entre técnico e negócio, análise), oferecer arquivá-la de volta como página nova em `wiki/`.

## Workflow: lint (manutenção periódica)

Quando o usuário pedir uma checagem de saúde da wiki:

- Contradições entre páginas (ex.: duas páginas descrevendo a mesma decisão técnica de formas diferentes).
- Páginas órfãs (sem nenhum link de entrada a partir de `wiki/index.md` ou outras páginas).
- Conceitos/entidades mencionados repetidamente mas sem página própria.
- Lacunas: perguntas de negócio ou técnicas em aberto sem fonte processada.

## Convenções

- **Frontmatter YAML** em toda página nova (este vault usa Obsidian, há suporte a Dataview):
  ```yaml
  ---
  tipo: tecnico | negocio | entidade
  atualizado: YYYY-MM-DD
  tags: [opcional]
  ---
  ```
- Links internos no formato Obsidian `[[nome-da-pagina]]`.
- Nomes de arquivo em kebab-case, sem acentos (ex.: `wiki/tecnico/arquitetura-multi-tenant.md`).
- Imagens/anexos de fontes vão para `raw/assets/`, referenciados a partir da página da wiki com caminho relativo.
- Tipos de página neste domínio: `tecnico` (arquitetura, decisão, bug/aprendizado), `negocio` (mercado, concorrente, estratégia), `entidade` (pessoa, empresa, ferramenta).

## Próximo passo

Adicionar a primeira fonte em `raw/` (técnica ou de negócio) e pedir para processá-la.
