# Wiki TelaHub / Display de Vendas — Esquema

## LEMBRAR O DONO NO INÍCIO DE TODA SESSÃO (atualizado em 2026-09-26)

A primeira mensagem da sessão, antes de qualquer outra coisa, tem de:

1. **Colar na íntegra** o último bloco "### Resposta final desta sessão" de `wiki/log.md`. Esse bloco já traz o que foi feito e a lista numerada do que falta, dizendo quem faz cada item.
2. **Perguntar** quais itens o dono já fez desde a última sessão, em especial:
   - o redeploy das stacks 117, 118 e 119 da versão nova;
   - o conserto do P1010 da produção antiga (`telahub-novo`, com os clientes reais).

   Se ele disser que fez, rodar `bash scripts/verificar-deploy-dev.sh` e conferir `https://telahub.proxserverabner.site/api/health` antes de seguir.
3. Retomar pelo "### Para continuar" da mesma entrada do log, que tem os passos detalhados.

**Push, redeploy no Portainer e leitura do banco de produção ficam com o dono.** A permissão automática do Claude Code barra essas ações mesmo com autorização escrita. Preparar o comando ou os cliques e não retentar (`wiki/tecnico/deploy-e-infraestrutura.md` §3.6).

Quando a produção antiga voltar ou for desligada por decisão do dono, e a versão nova estiver verificada nos nomes `devtelahub*`, trocar esta seção por uma versão mais curta, que só peça o último bloco do log, e registrar no `wiki/log.md`.

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

## Workflow: atualizar a wiki a cada modificação do projeto (obrigatório)

Decisão do dono em 2026-07-29: **a wiki não é atualizada só quando chega fonte nova em `raw/`** — ela acompanha o código. Sempre que uma sessão alterar o projeto (código, schema, config, deploy, conteúdo de página de vendas), antes de encerrar:

1. Identificar qual(is) página(s) de `wiki/` o trabalho contradiz ou completa — normalmente `tecnico/arquitetura-e-entidades` (domínio, rotas), `tecnico/seguranca-e-conformidade-tecnica` (classe de falha nova), `tecnico/deploy-e-infraestrutura` (infra, dev local) ou as de `negocio/` (preço, oferta, copy).
2. Atualizar a página **e o campo `atualizado:`** do frontmatter.
3. Registrar uma entrada em `wiki/log.md` descrevendo o que mudou e **por quê** — a decisão, não só o diff.
4. Atualizar `wiki/index.md` se surgiu página nova ou se a descrição de uma delas ficou desatualizada.

Escrever o **raciocínio e a armadilha**, não o changelog: o valor da wiki está em impedir que o mesmo erro se repita daqui a seis meses. Correção de rumo (algo que a wiki afirmava e não era verdade) tem prioridade sobre acréscimo — registre explicitamente que o registro anterior estava errado, como já foi feito com "multi-loja concluído".

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
