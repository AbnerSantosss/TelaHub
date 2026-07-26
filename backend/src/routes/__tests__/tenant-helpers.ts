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
export async function createTestOrganization(prefix = 'Tenant Teste') {
  counter += 1;
  const organization = await prisma.organization.create({
    data: { name: `${prefix} ${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}` },
  });

  await subscriptionService.createFreeSubscription(organization.id);

  return organization;
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
