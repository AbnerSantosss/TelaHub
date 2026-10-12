import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import prisma from '../lib/prisma';
import { PRIVACY_VERSION, TERMS_VERSION } from '../schemas/signup.schema';

/**
 * Segredo de assinatura do JWT.
 *
 * O fallback abaixo existe apenas para dev/teste. Em produção ele é PROIBIDO:
 * como o valor é público (está neste repositório), qualquer pessoa conseguiria
 * forjar um token de `master` e assumir a plataforma inteira. Por isso a
 * validação falha fechado no carregamento do módulo — e não no `server.ts` — de
 * modo que TODA porta de entrada (API, jobs, scripts de backfill, seed) morre
 * cedo e com mensagem clara, em vez de subir insegura.
 */
export const DEV_FALLBACK_SECRET = 'officecom-display-secret';
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Valida o segredo do JWT para um dado ambiente. Lança quando o segredo é
 * inseguro **em produção**; em dev/teste sempre passa.
 *
 * Função pura e exportada para ser testável — a chamada real acontece no
 * carregamento do módulo, logo abaixo.
 */
export function assertJwtSecretIsSafe(secret: string | undefined, nodeEnv: string | undefined): void {
  if (nodeEnv !== 'production') return;

  const value = secret?.trim();

  if (!value) {
    throw new Error(
      '❌ Boot abortado: JWT_SECRET é obrigatório em produção. ' +
      'Gere um segredo forte (ex.: `openssl rand -hex 32`) e configure a variável de ambiente.'
    );
  }
  if (value === DEV_FALLBACK_SECRET) {
    throw new Error(
      '❌ Boot abortado: JWT_SECRET está usando o valor padrão de desenvolvimento, que é público ' +
      '(está versionado neste repositório). Gere um segredo exclusivo (ex.: `openssl rand -hex 32`).'
    );
  }
  if (value.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `❌ Boot abortado: JWT_SECRET tem ${value.length} caracteres — o mínimo exigido é ${MIN_JWT_SECRET_LENGTH}. ` +
      'Gere um segredo forte (ex.: `openssl rand -hex 32`).'
    );
  }
}

const rawJwtSecret = process.env.JWT_SECRET?.trim();

assertJwtSecretIsSafe(rawJwtSecret, process.env.NODE_ENV);

const JWT_SECRET = rawJwtSecret || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = '7d';

/**
 * Payload do JWT. `organizationId` é o escopo de tenant do usuário e faz parte
 * do contrato — apenas o role `master` (proprietário da plataforma) pode tê-lo
 * nulo, pois opera acima das organizações.
 */
export interface JwtUserPayload {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JwtUserPayload): string => {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token: string): JwtUserPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as Partial<JwtUserPayload>;

  // Tokens emitidos antes do escopo multi-tenant não trazem `organizationId`.
  // Normalizamos para null — o `requireTenant` então bloqueia (403) qualquer
  // role diferente de `master`, forçando um novo login.
  return {
    id: String(decoded.id),
    email: String(decoded.email),
    role: String(decoded.role),
    organizationId: decoded.organizationId ?? null,
  };
};

/**
 * ─── Aceite de Termos e Privacidade ─────────────────────────────────────────
 *
 * Mora aqui, e não em `user.service.ts`, porque é uma condição de ACESSO: o
 * painel decide o que mostrar na primeira resposta autenticada, junto com
 * `mustChangePassword`. As duas perguntas — "esta sessão vale?" e "esta pessoa
 * consentiu?" — são respondidas no mesmo lugar.
 */

/**
 * `true` quando a pessoa ainda não aceitou, ou aceitou uma versão ANTERIOR.
 *
 * Duas situações caem aqui e as duas são reais:
 *
 * 1. Base existente: quem se cadastrou antes de 2026-09-05 tem
 *    `termsAcceptedAt = null` porque não assinou nada. Carimbar um aceite
 *    retroativo seria fabricar prova de consentimento — pior do que admitir
 *    que ele não existe (LGPD art. 8º §2º: o ônus da prova é do controlador).
 * 2. Texto novo: mudou `TERMS_VERSION`, o aceite antigo se refere a outro
 *    documento e precisa ser renovado.
 *
 * Função PURA de propósito: recebe o usuário já carregado. Assim o `/me` e o
 * login respondem sem uma consulta a mais, e o teste não precisa de banco.
 */
export function isTermsAcceptancePending(user: {
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
}): boolean {
  if (!user.termsAcceptedAt) return true;
  return user.termsVersion !== TERMS_VERSION;
}

/**
 * Grava o aceite de quem já tinha conta. A data é a de AGORA — não existe
 * aceite retroativo: a pessoa está consentindo neste instante, e é isso que o
 * registro tem que dizer.
 *
 * Retorna `null` quando o usuário não existe (token válido de conta apagada).
 */
export async function recordTermsAcceptance(
  userId: string,
  versions: { termsVersion?: string; privacyVersion?: string } = {}
): Promise<{ termsAcceptedAt: Date; termsVersion: string; privacyVersion: string } | null> {
  const acceptedAt = new Date();
  const termsVersion = versions.termsVersion || TERMS_VERSION;
  const privacyVersion = versions.privacyVersion || PRIVACY_VERSION;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: acceptedAt, termsVersion, privacyVersion },
    });
  } catch (error: any) {
    // P2025 = registro não encontrado. Qualquer outra falha é problema de
    // banco e deve subir para a rota responder 500.
    if (error?.code === 'P2025') return null;
    throw error;
  }

  return { termsAcceptedAt: acceptedAt, termsVersion, privacyVersion };
}
