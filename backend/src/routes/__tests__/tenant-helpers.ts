// Utilitários compartilhados pelos testes de rota no mundo multi-tenant.
// Não é um arquivo de teste (vitest só coleta *.test.ts).
import prisma from '../../lib/prisma';
import { generateToken } from '../../services/auth.service';
import { subscriptionService } from '../../services/subscription.service';

let counter = 0;

/**
 * Cria uma organização real no banco — necessário por causa das FKs.
 *
 * A organização nasce com assinatura ativa no plano grátis, porque as rotas de
 * escrita passaram a exigir assinatura válida (`requireActiveSubscription`,
 * 402). Sem isso, todo teste de isolamento falharia por falta de assinatura em
 * vez de testar o que pretende testar. Cenários de assinatura inválida devem
 * alterar a assinatura explicitamente no próprio teste.
 */
export async function createTestOrganization(
  prefix = 'Tenant Teste',
  options: { features?: string[] } = {}
) {
  counter += 1;
  const organization = await prisma.organization.create({
    data: { name: `${prefix} ${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}` },
  });

  await subscriptionService.createFreeSubscription(organization.id);

  if (options.features) {
    await grantFeatures(organization.id, options.features);
  }

  return organization;
}

/**
 * Troca a assinatura da organização por um plano de teste com exatamente estas
 * features.
 *
 * Existe porque o gate `requireFeature` (2026-07-31) passou a recusar rotas que
 * o plano não inclui: um teste de uptime que nasce no plano grátis recebe 403 e
 * deixa de testar uptime. Aqui o teste declara de que plano ele precisa, em vez
 * de depender do que o catálogo real tem hoje — se amanhã `relatorios` mudar de
 * plano, estes testes continuam medindo o que se propõem a medir.
 *
 * O plano fica `active: false` para não poluir `GET /api/plans` nem a oferta de
 * upgrade que o middleware calcula a partir do catálogo ativo.
 */
export async function grantFeatures(organizationId: string, features: string[]) {
  // Código DETERMINÍSTICO a partir do conjunto de features, e `upsert`.
  //
  // A primeira versão sorteava um código por chamada. Como nenhum teste que usa
  // este helper rastreia ids de plano para apagar depois, cada execução da
  // suíte deixava linhas novas no banco de desenvolvimento — encontrei dez
  // acumuladas. Sendo determinístico, rodar mil vezes cria no máximo um plano
  // por combinação de features e as execuções seguintes reaproveitam a linha.
  const signature = [...features].sort().join('.') || 'vazio';
  const code = `test-feat-${signature}`;

  const data = {
    name: 'Plano de Teste',
    pricePerScreenCents: 4900,
    minScreens: 1,
    maxDevices: null,
    maxUsers: null,
    maxOrganizations: null,
    features: JSON.stringify(features),
    // `active: false` mantém o plano fora de `GET /api/plans` e da oferta de
    // upgrade — resíduo de teste não pode aparecer na vitrine do cliente.
    active: false,
  };

  const plan = await prisma.plan.upsert({
    where: { code },
    update: data,
    create: { code, ...data },
  });

  await prisma.subscription.update({
    where: { organizationId },
    data: { planId: plan.id, status: 'active' },
  });

  return plan;
}

export function authHeaderFor(options: {
  organizationId: string | null;
  role?: string;
  id?: string;
  email?: string;
}): string {
  const token = generateToken({
    id: options.id ?? 'test-user',
    email: options.email ?? 'test@example.com',
    role: options.role ?? 'admin',
    organizationId: options.organizationId,
  });
  return `Bearer ${token}`;
}

/** Master (proprietário da plataforma): sem organização, escopo "todas". */
export function masterAuthHeader(): string {
  return authHeaderFor({ organizationId: null, role: 'master', id: 'test-master', email: 'master@example.com' });
}
