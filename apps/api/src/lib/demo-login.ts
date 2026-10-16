/**
 * Entrada de demonstração: um botão por plano na tela de login, sem senha.
 *
 * Decisão do dono em 15/10/2026: o painel de teste (stack 117,
 * devtelahubpainel) é público de propósito, e qualquer visitante deve poder
 * entrar como cliente de cada plano com um clique, sem senha à vista no site
 * nem cadastrada na stack.
 *
 * Como fica seguro o bastante:
 * - só liga com `DEMO_LOGIN=true` no backend. A stack principal
 *   (`docker-compose.yml`, telahub-novo) não passa essa variável, então lá a
 *   rota responde 404;
 * - só entra nas contas desta lista, criadas por `prisma/seed-demo-users.ts`,
 *   cada uma num tenant isolado. Nenhum admin da plataforma está aqui;
 * - a senha dessas contas é aleatória e ninguém precisa saber, porque a
 *   entrada é só por esta rota.
 */
export const DEMO_LOGIN_ACCOUNTS = [
  { plan: 'gratis', label: 'Grátis', email: 'demo.gratis@telahub.local' },
  { plan: 'loja', label: 'Loja', email: 'demo.loja@telahub.local' },
  { plan: 'rede', label: 'Rede', email: 'demo.rede@telahub.local' },
  { plan: 'enterprise', label: 'Enterprise', email: 'demo.enterprise@telahub.local' },
] as const;

export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN?.trim().toLowerCase() === 'true';
}

export function findDemoAccount(plan: unknown) {
  return DEMO_LOGIN_ACCOUNTS.find((a) => a.plan === plan) ?? null;
}
