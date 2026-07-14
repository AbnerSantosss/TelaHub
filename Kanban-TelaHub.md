---

kanban-plugin: board

---

## Backlog

- [ ] **EPIC A — Confiabilidade de Armazenamento de Mídia** #epic/armazenamento
- [ ] **US-001** — Como admin, quero que uploads de mídia sejam persistidos no Cloudflare R2 por padrão em produção, para não haver risco de perda de arquivos em reinícios de container. #epic/armazenamento
	- DADO um ambiente de produção, QUANDO o backend sobe sem variáveis de R2 configuradas, ENTÃO o processo deve falhar no boot com mensagem clara (não cair silenciosamente para disco local).
	- DADO R2 configurado, QUANDO um usuário faz upload de mídia, ENTÃO o arquivo deve ser gravado no bucket e a URL pública retornada deve apontar para o R2.
	- [ ] Tornar variáveis de ambiente do R2 obrigatórias em produção (`NODE_ENV=production`)
	- [ ] Adicionar validação de boot que falha com erro claro se R2 ausente em produção
	- [ ] Documentar variáveis de R2 no `README`/`.env.example`
- [ ] **US-002** — Como admin, quero migrar os arquivos já enviados via disco local para o R2, para não perder mídia existente ao ativar o modo R2. #epic/armazenamento
	- DADO arquivos existentes em `uploads/` local, QUANDO o script de migração roda, ENTÃO todos os arquivos devem aparecer no bucket R2 com os mesmos nomes/paths.
	- DADO a migração concluída, QUANDO um `Display` referencia uma mídia antiga, ENTÃO a URL deve resolver corretamente pelo R2.
	- [ ] Escrever script de migração disco → R2
	- [ ] Rodar em ambiente de homologação e validar contagem de arquivos
	- [ ] Atualizar referências de URL no banco, se necessário
- [ ] **EPIC B — Segurança de API** #epic/seguranca
- [ ] **US-003** — Como responsável técnico, quero rate limiting nas rotas de autenticação, para mitigar ataques de força bruta contra login/reset de senha. #epic/seguranca
	- DADO um IP fazendo mais de N tentativas de login em M minutos, QUANDO o limite é excedido, ENTÃO a API deve responder 429 e bloquear novas tentativas temporariamente.
	- [ ] Escolher e instalar middleware de rate limiting (ex.: `express-rate-limit`)
	- [ ] Aplicar limite em `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`
	- [ ] Adicionar teste de integração simulando excesso de tentativas
- [ ] **US-004** — Como responsável técnico, quero sanitização/validação de entrada nas rotas de displays/devices/broadcasts, para reduzir risco de injeção e dados malformados persistidos. #epic/seguranca
	- DADO um payload inválido ou malicioso em qualquer rota de escrita, QUANDO a requisição chega, ENTÃO deve ser rejeitada com 400 antes de tocar o banco.
	- [ ] Definir schemas de validação (ex.: Zod) para os payloads de escrita
	- [ ] Aplicar middleware de validação em `displays`, `devices`, `broadcasts`, `users`
	- [ ] Cobrir com testes de payload inválido
- [ ] **EPIC C — Hierarquia Multi-loja** #epic/multi-tenant
- [ ] **US-005** — Como dono de produto, quero um modelo de dados de Organização/Loja agrupando Displays, para viabilizar relatórios e gestão multi-cliente num único deploy. #epic/multi-tenant
	- DADO o novo modelo `Organization`, QUANDO um `Display` é criado, ENTÃO ele deve pertencer a uma Organização.
	- DADO displays existentes sem organização, QUANDO a migração roda, ENTÃO todos devem ser atribuídos a uma organização padrão sem perda de dados.
	- [ ] Modelar `Organization` no `schema.prisma` e relação com `Display`
	- [ ] Escrever migração de dados com organização padrão para displays existentes
	- [ ] Atualizar rotas de backend para filtrar por organização
- [ ] **US-006** — Como admin, quero filtrar/agrupar Displays por loja no Dashboard, para gerenciar múltiplas unidades sem confusão visual. #epic/multi-tenant
	- DADO múltiplas organizações/lojas cadastradas, QUANDO o admin abre o Dashboard, ENTÃO deve haver um seletor/filtro de loja que reflete na grade de displays.
	- [ ] Adicionar seletor de organização no `TopBar`/`ModuleNav`
	- [ ] Filtrar `DisplayGrid` pela organização selecionada
	- [ ] Persistir a última seleção do usuário (localStorage)
- [ ] **EPIC D — UX do Editor e Dashboard** #epic/ux
- [ ] **US-007** — Como usuário do Editor, quero receber feedback de erro consistente (toast) em vez de `alert()` nativo ao salvar uma cena, para ter uma experiência visualmente coerente com o restante do app. #epic/ux
	- DADO um erro ao salvar, QUANDO `handleSave` falha, ENTÃO deve aparecer um toast (`sonner`) com mensagem clara da causa, não um `alert()` do navegador.
	- [ ] Substituir `alert('Erro ao salvar.')` por toast de erro em `Editor.tsx`
	- [ ] Revisar mensagem seguindo os "3 I's" de microcopy (informativa, clara, sem culpar o usuário)
	- [ ] Auditar o restante do app por outros usos de `alert()` nativo
- [ ] **US-008** — Como usuário novo, quero ver estados vazios com orientação clara quando não há displays/dispositivos cadastrados, para saber o próximo passo sem depender de memorização. #epic/ux
	- DADO nenhum display cadastrado, QUANDO o Dashboard carrega, ENTÃO deve exibir uma mensagem de estado vazio com call-to-action para criar o primeiro display.
	- [ ] Criar componente de empty state reutilizável
	- [ ] Aplicar em `DisplayGrid` (sem displays) e `DeviceChips` (sem dispositivos pareados)
	- [ ] Revisar microcopy do empty state
- [ ] **US-009** — Como usuário que navega por teclado, quero que os modais do Dashboard e Editor tenham foco e navegação acessíveis, para conseguir usar o produto sem mouse. #epic/ux
	- DADO um modal aberto (criar display, pairing, camadas), QUANDO o usuário pressiona Tab, ENTÃO o foco deve ficar preso dentro do modal e `Esc` deve fechá-lo.
	- [ ] Auditar todos os modais quanto a focus trap e tecla `Esc`
	- [ ] Corrigir ordem de tabulação onde necessário
	- [ ] Validar com leitor de tela básico (NVDA) nos fluxos principais
- [ ] **US-010** — Como editor de cenas, quero uma confirmação antes de publicar/sobrescrever uma cena já ativa numa tela, para evitar publicar algo errado por engano. #epic/ux
	- DADO uma cena já publicada num display, QUANDO o usuário clica em salvar/publicar, ENTÃO deve aparecer uma confirmação explícita antes de sobrescrever o conteúdo ao vivo.
	- [ ] Adicionar modal de confirmação antes de publicar
	- [ ] Incluir preview resumido do que será publicado
- [ ] **EPIC E — Deploy e CI/CD** #epic/infra
- [ ] **US-011** — Como responsável técnico, quero um pipeline de CI/CD com ambiente de staging, para validar mudanças antes de ir para produção. #epic/infra
	- DADO um PR aberto contra `main`, QUANDO o CI roda, ENTÃO build/testes devem rodar automaticamente e bloquear merge se falharem.
	- [ ] Configurar pipeline de CI (build + testes) para PRs
	- [ ] Provisionar ambiente de staging separado de produção
	- [ ] Documentar fluxo de promoção staging → produção
- [ ] **US-012** — Como responsável técnico, quero gestão de segredos por ambiente, para não depender de `.env` copiados manualmente entre dev/staging/produção. #epic/infra
	- DADO um novo ambiente provisionado, QUANDO a aplicação sobe, ENTÃO os segredos devem vir de um cofre/gestor central, não de arquivo versionado ou copiado manualmente.
	- [ ] Escolher solução de gestão de segredos compatível com a infra atual (Portainer/Cloudflare Tunnel)
	- [ ] Migrar segredos sensíveis (JWT_SECRET, SMTP, R2) para o cofre escolhido
- [ ] **EPIC F — Observabilidade** #epic/observabilidade
- [ ] **US-013** — Como admin, quero um painel de saúde dos dispositivos (heartbeat), para saber rapidamente quais telas estão online/offline. #epic/observabilidade
	- DADO dispositivos pareados, QUANDO o admin abre o painel de saúde, ENTÃO cada dispositivo deve mostrar status (online/offline) baseado no `lastSeen`.
	- [ ] Criar endpoint agregando status de todos os `Device` por `lastSeen`
	- [ ] Criar view no Dashboard com indicador visual online/offline
- [ ] **US-014** — Como admin, quero ser alertado quando um display fica offline por muito tempo, para agir antes que o cliente perceba a tela apagada. #epic/observabilidade
	- DADO um device sem heartbeat há mais de X minutos, QUANDO o limite é ultrapassado, ENTÃO um alerta (e-mail ou notificação in-app) deve ser disparado.
	- [ ] Definir job periódico de verificação de heartbeat
	- [ ] Implementar notificação (reaproveitar Nodemailer existente)
- [ ] **US-015 (card de teste — pode remover)** — Como usuário do sistema, quero ver este card de exemplo no quadro, para confirmar que a integração entre o Claude Code e o plugin Kanban do Obsidian está funcionando corretamente. #epic/ux #teste
	- DADO este card de teste, QUANDO o arquivo é aberto no Obsidian com o plugin Kanban ativo, ENTÃO ele deve aparecer como um card normal na coluna Backlog.
	- [ ] Confirmar visualmente no Obsidian que o card apareceu na coluna Backlog
	- [ ] Remover este card de teste depois da confirmação

## Em Análise (3)



## Em Desenvolvimento (2)



## Code Review (2)



## Teste (2)



## Concluído



## ℹ️ Políticas do Quadro

- [ ] **WIP (Work In Progress)** — Cada coluna ativa tem um limite máximo de itens simultâneos (mostrado entre parênteses no título da coluna). Heurística inicial de Anderson: `WIP = nº de pessoas no time × 2`. Ninguém deve mover um card para uma coluna que já está no limite — termine ou puxe (pull) algo daquela coluna antes.
- [ ] **Sistema pull** — Um item só avança para a próxima coluna quando há capacidade livre nela; ninguém "empurra" trabalho para frente.
- [ ] **Definition of Ready (DoR)** — Uma User Story só entra em "Em Análise" se: tem critérios de aceite em Gherkin escritos, dependências conhecidas, e é pequena o suficiente para ser estimável (INVEST).
- [ ] **Definition of Done (DoD)** — Uma US só vai para "Concluído" se: código revisado (Code Review), testes passando, critérios de aceite validados manualmente, e — quando aplicável — checklist de UX (7 blocos: responsividade, tipografia, acessibilidade, heurísticas, performance percebida, consistência de design system, microcopy) revisado.
- [ ] **Métricas de fluxo** — Acompanhar Lead Time, Cycle Time e Throughput periodicamente; usar como sinal para reduzir WIP se o Lead Time estiver crescendo (Lei de Little: Lead Time = WIP ÷ Throughput).


%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,false,false,false]}
```
%%