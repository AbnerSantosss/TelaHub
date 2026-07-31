import nodemailer from 'nodemailer';
import type { Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { generateToken, hashPassword } from './auth.service';
import { settingsService } from './settings.service';
import { FREE_PLAN_CODE, subscriptionService, trialDaysRemaining } from './subscription.service';
import type { SignupInput } from '../schemas/signup.schema';

/** Erro de negócio com status HTTP associado, para a rota apenas repassar. */
export class SignupError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'SignupError';
  }
}

export interface SignupResult {
  token: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    email: string;
    role: string;
    organizationId: string | null;
  };
  organization: { id: string; name: string };
  subscription: {
    planCode: string;
    status: string;
    trialEndsAt: string | null;
    trialDaysRemaining: number;
  };
}

/**
 * Deriva um username livre a partir do e-mail. `username` é `@unique` no schema,
 * então precisamos resolver colisões antes de tentar inserir.
 */
async function deriveUsername(email: string, tx: Prisma.TransactionClient): Promise<string> {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 24) || 'usuario';

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const existing = await tx.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  // Fallback praticamente impossível de alcançar.
  return `${base}${Date.now()}`;
}

/**
 * E-mail de boas-vindas do auto-cadastro.
 *
 * NOTA: idealmente isso vive em `email.service.ts` como `sendWelcomeEmail()`,
 * mas aquele arquivo pertence a outra frente de trabalho neste momento. Quando
 * for possível, mover para lá e importar daqui.
 */
async function sendWelcomeEmail(to: string, name: string, companyName: string): Promise<void> {
  const smtp = await settingsService.getSmtpConfig();
  if (!smtp) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  await transporter.sendMail({
    from: `"TelaHub" <${smtp.user}>`,
    to,
    subject: '🎉 Sua conta TelaHub está pronta!',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;">Bem-vindo ao TelaHub, ${name}!</h2>
        <p style="line-height:1.7;color:#334155;">
          A conta da <strong>${companyName}</strong> foi criada no plano <strong>Grátis</strong>:
          1 tela para sempre, sem prazo e sem cartão de crédito.
        </p>
        <p style="line-height:1.7;color:#334155;">
          Quando você quiser conectar a 2ª tela, a cobrança começa apenas a partir dela e é
          proporcional aos dias restantes do período — a 1ª tela continua gratuita e nada é
          cobrado retroativamente.
        </p>
        <p style="line-height:1.7;color:#334155;">
          Acesse o painel com o e-mail <strong>${to}</strong> e a senha que você escolheu no cadastro.
        </p>
        <p style="margin:24px 0;">
          <a href="${appUrl}/#/login"
             style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;">
            Entrar no painel
          </a>
        </p>
        <p style="color:#64748b;font-size:12px;">Se você não criou esta conta, ignore este e-mail.</p>
      </div>
    `.trim(),
  });
}

export class SignupService {
  /** `true` quando o e-mail já pertence a alguma conta. */
  async isEmailTaken(email: string): Promise<boolean> {
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Auto-atendimento: cria organização + usuário admin + assinatura no plano
   * `gratis` (freemium, `active`, sem prazo) numa única transação e devolve
   * token de acesso (mesmo formato do login).
   */
  async signup(input: SignupInput): Promise<SignupResult> {
    const email = input.email.trim().toLowerCase();

    if (await this.isEmailTaken(email)) {
      // Mensagem deliberadamente genérica: não revela nada sobre a conta existente.
      throw new SignupError(
        'Este e-mail já está cadastrado. Faça login ou use a opção "esqueci minha senha".',
        409,
        'email_taken'
      );
    }

    const passwordHash = await hashPassword(input.password);

    const created = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.companyName.trim() },
      });

      const username = await deriveUsername(email, tx);

      const user = await tx.user.create({
        data: {
          username,
          name: input.name.trim(),
          email,
          password: passwordHash,
          role: 'admin',
          organizationId: organization.id,
        },
      });

      // Freemium: plano `gratis`, `active`, sem prazo e sem cartão.
      const subscription = await subscriptionService.createFreeSubscription(organization.id, tx);

      return { organization, user, subscription };
    });

    // Corrida entre dois cadastros simultâneos com o mesmo e-mail cai no unique
    // constraint do Prisma (P2002) e sobe como 409 pela rota.

    const token = generateToken({
      id: created.user.id,
      email: created.user.email,
      role: created.user.role,
      organizationId: created.user.organizationId,
    });

    // Não bloqueante: falha de SMTP nunca pode derrubar o cadastro.
    void sendWelcomeEmail(email, created.user.name || created.user.username, created.organization.name).catch(
      (err: unknown) => {
        console.warn(
          '[signup] falha ao enviar e-mail de boas-vindas (cadastro concluído):',
          err instanceof Error ? err.message : err
        );
      }
    );

    return {
      token,
      user: {
        id: created.user.id,
        username: created.user.username,
        name: created.user.name,
        email: created.user.email,
        role: created.user.role,
        organizationId: created.user.organizationId,
      },
      organization: { id: created.organization.id, name: created.organization.name },
      subscription: {
        planCode: FREE_PLAN_CODE,
        status: created.subscription.status,
        trialEndsAt: created.subscription.trialEndsAt?.toISOString() ?? null,
        trialDaysRemaining: trialDaysRemaining(created.subscription),
      },
    };
  }
}

export const signupService = new SignupService();
