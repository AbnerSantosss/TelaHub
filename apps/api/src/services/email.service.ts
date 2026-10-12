import crypto from 'crypto';
import type { EmailMessage } from '@prisma/client';
import nodemailer from 'nodemailer';
import { settingsService } from './settings.service';
import prisma from '../lib/prisma';
import { emailQueueService, type OutgoingEmail } from './email-queue.service';
import { EmailDispatchDisabledError, isEmailDispatchEnabled } from '../lib/email-dispatch';
import fs from 'fs';
import path from 'path';

/**
 * ─── TODO ENVIO PASSA PELA FILA DESDE 2026-09-09 ─────────────────────────────
 *
 * As funções `send*Email` deste arquivo NÃO falam mais com o provedor: elas
 * MONTAM o HTML e ENFILEIRAM em `EmailMessage`. Quem entrega é
 * `email-queue.service` (job `email-dispatch`), reusando o `createTransporter`,
 * o `formatFrom` e o `getLogoAttachment` daqui.
 *
 * A assinatura pública de cada função continua a mesma de propósito: nenhum
 * chamador (rotas, `device.service`, `auth.service`, tratadores de checkout)
 * precisou mudar. O que mudou é o significado do retorno — "aceito para envio",
 * não "entregue". É a troca certa: antes, provedor fora do ar significava
 * e-mail PERDIDO; agora significa adiado, com retentativa e registro.
 *
 * CONSEQUÊNCIA DELIBERADA: estas funções não lançam mais
 * "Provedor de e-mail não configurado". Uma instalação sem SMTP enfileira
 * normalmente e as mensagens saem no dia em que o `master` configurar o
 * provedor — em vez de sumirem uma a uma com erro 500 na cara de quem clicou.
 */

// URL base do aplicativo — configurável via variável de ambiente
const APP_URL = process.env.APP_URL || 'https://devtelahubpainel.proxserverabner.site';
const LOGIN_URL = `${APP_URL}/#/login`;

/**
 * Base pública da API, usada só no link de descadastro.
 *
 * Precisa ser a URL da API, e não a do painel: `GET /api/email/unsubscribe/:token`
 * é uma rota do servidor. Em produção a API responde no mesmo domínio sob
 * `/api`, e é esse o padrão abaixo. ARMADILHA: se um dia a API for para outro
 * host, `API_PUBLIC_URL` PRECISA ser definida — senão o link de descadastro de
 * toda campanha aponta para uma página que não existe, e um descadastro que não
 * funciona é pior que nenhum (LGPD art. 18 e o requisito de um clique que
 * Gmail/Yahoo cobram desde 2024).
 */
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || `${APP_URL}/api`).replace(/\/+$/, '');

/** Endereço para onde o descadastro por e-mail (mailto) deve ir, quando houver. */
const UNSUBSCRIBE_MAILTO = process.env.UNSUBSCRIBE_EMAIL?.trim() || '';

/** Contexto opcional do destinatário — alimenta o histórico por organização. */
export interface EmailContext {
  organizationId?: string | null;
  userId?: string | null;
}

// Logo do sistema como base64 para embedding inline no email
function getLogoBase64(): string {
  try {
    const logoPath = path.resolve(__dirname, '../../icones-do-sistema/icone-office-display.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return logoBuffer.toString('base64');
  } catch {
    return '';
  }
}

/**
 * Cria um transporter do nodemailer a partir da configuração em uso — a do
 * banco, se o `master` configurou pelo painel; senão a do ambiente.
 *
 * Antes de 2026-07-29 isto era `service: 'gmail'` fixo, o que amarrava a
 * plataforma inteira a um provedor: mudar de e-mail exigia mudar código.
 */
export async function createTransporter(
  options: { pooled?: boolean } = {}
): Promise<nodemailer.Transporter | null> {
  const smtp = await settingsService.getSmtpConfig();
  if (!smtp || !smtp.host) return null;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    // ─── Pool: obrigatório para a FILA, dispensável para envio avulso ─────────
    //
    // Sem `pool`, o nodemailer abre uma conexão NOVA — e portanto faz um login
    // novo — a cada `sendMail`. Reaproveitar o mesmo objeto `transporter` no
    // laço do lote não evita isso: o que se reaproveita é a configuração, não a
    // conexão.
    //
    // Foi exatamente o que aconteceu no primeiro lote real: 50 mensagens por
    // varredura, a cada 15 segundos, viraram 50 logins, e o Gmail respondeu
    // `454-4.7.0 Too many login attempts` em TODAS. O sintoma engana: parece
    // credencial errada ("Invalid login"), e manda quem investiga conferir
    // senha e provedor, quando o problema é a quantidade de conexões.
    //
    // `maxConnections: 1` porque o gargalo aqui nunca é vazão — é o provedor
    // tratar rajada como abuso. `rateDelta/rateLimit` põe um teto explícito de
    // mensagens por segundo, para que um dia de enxurrada (o alerta de tela
    // offline escala com o número de TELAS, não de clientes) não vire bloqueio
    // da conta inteira, que derrubaria junto convite e redefinição de senha.
    ...(options.pooled
      ? {
          pool: true,
          maxConnections: 1,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 5,
        }
      : {}),
  });

  // Trava de envio (INF-18): fora de produção, sem `EMAIL_DISPATCH_ENABLED`,
  // o transporte existe (o `verify` do painel continua testando a conexão),
  // mas `sendMail` recusa. É a segunda barreira — a primeira é a fila nem
  // começar a varredura. Ver `lib/email-dispatch.ts`.
  if (!isEmailDispatchEnabled()) {
    transporter.sendMail = (async () => {
      throw new EmailDispatchDisabledError();
    }) as typeof transporter.sendMail;
  }

  return transporter;
}

/**
 * Remetente exibido. Não é sempre o usuário da autenticação: SendGrid autentica
 * com o usuário literal `apikey` e o Resend com `resend` — usar isso no `from`
 * geraria um remetente inválido e a mensagem seria recusada.
 */
export function formatFrom(smtp: { fromName: string; fromEmail: string }): string {
  return `"${smtp.fromName}" <${smtp.fromEmail}>`;
}

/**
 * Testa a conexão SMTP.
 */
export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { ok: false, error: 'Credenciais SMTP não configuradas.' };
    }
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha na verificação SMTP.' };
  }
}

// ==============================================================================
// CORES DO SISTEMA
// ==============================================================================
const COLORS = {
  bgDark: '#020617',        // slate-950
  bgCard: '#0f172a',        // slate-900
  bgCardAlt: '#1e293b',     // slate-800
  border: '#334155',        // slate-700
  borderLight: '#475569',   // slate-600
  textPrimary: '#e2e8f0',   // slate-200
  textSecondary: '#94a3b8', // slate-400
  textMuted: '#64748b',     // slate-500
  textDark: '#334155',      // slate-700
  cyan: '#22d3ee',          // cyan-400
  indigo: '#6366f1',        // indigo-500
  indigoDeep: '#4f46e5',    // indigo-600
  cyanDeep: '#06b6d4',      // cyan-500
  purple: '#a78bfa',        // violet-400
  amber: '#fbbf24',         // amber-400
  amberBg: 'rgba(251,191,36,0.06)',
  amberBorder: 'rgba(251,191,36,0.15)',
  infoBg: 'rgba(99,102,241,0.06)',
  infoBorder: 'rgba(99,102,241,0.15)',
  gradientDivider: `linear-gradient(90deg,transparent,#22d3ee,#6366f1,transparent)`,
  gradientButton: `linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%)`,
};

// ==============================================================================
// BASE LAYOUT — Wrapper compartilhado para todos os templates
// ==============================================================================
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TelaHub</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bgDark};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bgDark};padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:${COLORS.bgCard};border-radius:20px;border:1px solid ${COLORS.bgCardAlt};overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
          
          <!-- Header com Logo -->
          <tr>
            <td style="padding:40px 40px 24px;text-align:center;background:linear-gradient(180deg,#111827 0%,${COLORS.bgCard} 100%);">
              <!-- Logo Icon -->
              <div style="width:72px;height:72px;margin:0 auto 20px;background:linear-gradient(135deg,${COLORS.bgCardAlt} 0%,${COLORS.bgCard} 100%);border-radius:16px;border:1px solid ${COLORS.border};display:inline-block;line-height:72px;box-shadow:0 0 30px rgba(34,211,238,0.2);overflow:hidden;">
                <img src="cid:logo" alt="TelaHub" width="48" height="48" style="vertical-align:middle;" />
              </div>
              <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                <span style="color:${COLORS.textPrimary};">Tela</span><span style="color:${COLORS.cyan};">Hub</span>
              </h1>
              <p style="margin:8px 0 0;color:${COLORS.textMuted};font-size:13px;font-weight:500;">
                Conteúdo nas suas TVs, gerenciado pelo painel
              </p>
            </td>
          </tr>

          <!-- Divider gradient -->
          <tr>
            <td style="height:2px;background:${COLORS.gradientDivider};"></td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid ${COLORS.bgCardAlt};text-align:center;">
              <p style="margin:0;color:${COLORS.textDark};font-size:11px;line-height:1.6;">
                Este é um e-mail automático do <strong>TelaHub</strong>.<br>
                Se você não reconhece esta ação, ignore este e-mail com segurança.
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="margin:20px 0 0;color:${COLORS.bgCardAlt};font-size:10px;text-align:center;font-family:monospace;">
          &copy; ${new Date().getFullYear()} TelaHub System
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ==============================================================================
// BOTÃO COMPARTILHADO
// ==============================================================================
function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${url}" target="_blank" style="display:inline-block;background:${COLORS.gradientButton};color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 4px 20px rgba(34,211,238,0.3);">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// ==============================================================================
// TEMPLATE: CONVITE DE NOVO USUÁRIO
// ==============================================================================
function getInviteTemplate(email: string, password: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.textPrimary};font-size:20px;font-weight:700;">
      🎉 Bem-vindo ao TelaHub!
    </h2>
    <p style="margin:0 0 24px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      Um administrador criou uma conta para você. Use as credenciais abaixo para fazer seu primeiro acesso:
    </p>

    <!-- Credentials Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgDark};border-radius:12px;border:1px solid ${COLORS.bgCardAlt};overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 24px;border-bottom:1px solid ${COLORS.bgCardAlt};">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            E-mail de Acesso
          </p>
          <p style="margin:0;color:${COLORS.cyan};font-size:16px;font-weight:700;font-family:'Courier New',monospace;">
            ${email}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Senha Inicial
          </p>
          <p style="margin:0;color:${COLORS.purple};font-size:16px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;">
            ${password}
          </p>
        </td>
      </tr>
    </table>

    <!-- Security Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.amberBg};border:1px solid ${COLORS.amberBorder};border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:${COLORS.amber};font-size:12px;font-weight:600;line-height:1.5;">
            ⚠️ Recomendamos que você altere sua senha após o primeiro acesso.
          </p>
        </td>
      </tr>
    </table>

    ${emailButton('Acessar Painel →', LOGIN_URL)}
  `;
  return emailLayout(content);
}

// ==============================================================================
// TEMPLATE: REDEFINIÇÃO DE SENHA
// ==============================================================================
function getResetPasswordTemplate(resetUrl: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.textPrimary};font-size:20px;font-weight:700;">
      🔐 Redefinição de Senha
    </h2>
    <p style="margin:0 0 24px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      Recebemos uma solicitação para redefinir sua senha no TelaHub. 
      Clique no botão abaixo para criar uma nova senha:
    </p>

    <!-- Info Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.infoBg};border:1px solid ${COLORS.infoBorder};border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#818cf8;font-size:12px;font-weight:600;line-height:1.5;">
            ⏰ Este link expira em <strong>1 hora</strong>. Se você não solicitou essa redefinição, ignore este e-mail.
          </p>
        </td>
      </tr>
    </table>

    ${emailButton('Redefinir Minha Senha', resetUrl)}

    <p style="margin:24px 0 0;color:${COLORS.borderLight};font-size:11px;line-height:1.6;text-align:center;">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${resetUrl}" style="color:${COLORS.cyan};word-break:break-all;font-size:10px;">${resetUrl}</a>
    </p>
  `;
  return emailLayout(content);
}

// ==============================================================================
// TEMPLATE: BOAS-VINDAS (cadastro por conta própria)
// ==============================================================================
function getWelcomeTemplate(name: string, companyName: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.textPrimary};font-size:20px;font-weight:700;">
      👋 Bem-vindo ao TelaHub, ${name}!
    </h2>
    <p style="margin:0 0 20px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      A conta de <strong style="color:${COLORS.textPrimary};">${companyName}</strong> já está ativa.
      Você começa com <strong style="color:${COLORS.textPrimary};">1 tela gratuita, sem prazo e sem cartão de crédito</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgDark};border-radius:12px;border:1px solid ${COLORS.bgCardAlt};margin-bottom:20px;">
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0 0 10px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Primeiros passos
          </p>
          <p style="margin:0 0 6px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
            1. Crie seu primeiro display e monte a cena no editor.
          </p>
          <p style="margin:0 0 6px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
            2. Abra o player na TV e pareie usando o código exibido na tela.
          </p>
          <p style="margin:0;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
            3. Pronto. Se a tela cair, você recebe um aviso por e-mail.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;color:${COLORS.textMuted};font-size:13px;line-height:1.7;">
      Quando quiser ligar a segunda tela, a cobrança começa a partir dela e é proporcional ao período,
      nunca retroativa sobre a tela que já estava no ar.
    </p>

    ${emailButton('Acessar o painel', LOGIN_URL)}
  `;
  return emailLayout(content);
}

// ==============================================================================
// TEMPLATE: CONFIRMAÇÃO DE CONTRATAÇÃO (pós-checkout)
// ==============================================================================

/**
 * Formata centavos em Real. O checkout trabalha em centavos (inteiro) para não
 * arrastar erro de ponto flutuante; a conversão para exibição acontece só aqui.
 */
function formatBRL(amountCents: number): string {
  return (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/**
 * E-mail de quem acabou de comprar. Acumula dois papéis que o convite genérico
 * não cobria: é o **comprovante** da contratação (plano, telas, valor) e a
 * **credencial** de primeiro acesso.
 *
 * Regras de conteúdo (arts. 30 e 37 do CDC — oferta vincula, publicidade
 * enganosa é infração): nada aqui pode prometer o que o produto não entrega.
 * Sem "suporte 24/7", sem SLA, sem garantia de uptime. Só o que é verificável:
 * acesso liberado, o que foi contratado, como entrar e o direito de
 * arrependimento de 7 dias do art. 49, que já é praticado de fato.
 */
function getPurchaseTemplate(
  email: string,
  name: string,
  planName: string,
  screens: number,
  amountCents: number,
  password: string,
  simulated: boolean
): string {
  // O aviso de simulação fica colado ao valor, e não no rodapé, de propósito:
  // um comprovante que exibe "R$ 245,00/mês" sem dizer que nada foi cobrado
  // afirma uma cobrança inexistente. O bloco tem que ser lido junto do número.
  const simulatedWarning = simulated
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.amberBg};border:1px solid ${COLORS.amberBorder};border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;color:${COLORS.amber};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">
            ⚠️ Pagamento simulado
          </p>
          <p style="margin:0;color:${COLORS.amber};font-size:12px;font-weight:600;line-height:1.6;">
            Este foi um pagamento <strong>SIMULADO</strong>, usado para testes.
            <strong>Nenhum valor foi cobrado</strong> e nenhuma cobrança será feita no seu cartão.
            Este e-mail não é um comprovante de pagamento.
          </p>
        </td>
      </tr>
    </table>
  `
    : '';

  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.textPrimary};font-size:20px;font-weight:700;">
      ✅ Contratação confirmada, ${name}!
    </h2>
    <p style="margin:0 0 24px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      Seu acesso ao TelaHub já está liberado. Abaixo está o resumo do que foi contratado
      e as credenciais para o primeiro acesso.
    </p>

    <!-- Resumo da contratação -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgDark};border-radius:12px;border:1px solid ${COLORS.bgCardAlt};overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 24px;border-bottom:1px solid ${COLORS.bgCardAlt};">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Plano
          </p>
          <p style="margin:0;color:${COLORS.textPrimary};font-size:16px;font-weight:700;">
            ${planName}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;border-bottom:1px solid ${COLORS.bgCardAlt};">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Telas contratadas
          </p>
          <p style="margin:0;color:${COLORS.textPrimary};font-size:16px;font-weight:700;">
            ${screens} ${screens === 1 ? 'tela' : 'telas'}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Valor mensal
          </p>
          <p style="margin:0;color:${COLORS.cyan};font-size:20px;font-weight:800;">
            ${formatBRL(amountCents)}<span style="color:${COLORS.textMuted};font-size:13px;font-weight:600;">/mês</span>
          </p>
        </td>
      </tr>
    </table>

    ${simulatedWarning}

    <!-- Credenciais de acesso -->
    <p style="margin:0 0 12px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      Use estes dados para entrar no painel:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bgDark};border-radius:12px;border:1px solid ${COLORS.bgCardAlt};overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 24px;border-bottom:1px solid ${COLORS.bgCardAlt};">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            E-mail de Acesso
          </p>
          <p style="margin:0;color:${COLORS.cyan};font-size:16px;font-weight:700;font-family:'Courier New',monospace;">
            ${email}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0 0 4px;color:${COLORS.textMuted};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Senha Temporária
          </p>
          <p style="margin:0;color:${COLORS.purple};font-size:16px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;">
            ${password}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.amberBg};border:1px solid ${COLORS.amberBorder};border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:${COLORS.amber};font-size:12px;font-weight:600;line-height:1.5;">
            ⚠️ Esta senha é temporária. Troque-a no primeiro acesso, em Perfil → Alterar senha.
          </p>
        </td>
      </tr>
    </table>

    ${emailButton('Acessar o painel →', LOGIN_URL)}

    <p style="margin:24px 0 0;color:${COLORS.borderLight};font-size:11px;line-height:1.6;text-align:center;">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${LOGIN_URL}" style="color:${COLORS.cyan};word-break:break-all;font-size:10px;">${LOGIN_URL}</a>
    </p>

    <p style="margin:20px 0 0;color:${COLORS.textMuted};font-size:12px;line-height:1.7;">
      Você tem <strong style="color:${COLORS.textSecondary};">7 dias</strong> para desistir da contratação e
      receber o valor de volta, conforme o art. 49 do Código de Defesa do Consumidor.
      É só responder este e-mail pedindo o cancelamento.
    </p>
  `;
  return emailLayout(content);
}

// ==============================================================================
// TEMPLATE: DEVICE OFFLINE
// ==============================================================================
function getDeviceOfflineTemplate(deviceName: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:${COLORS.textPrimary};font-size:20px;font-weight:700;">
      📴 Tela desconectada
    </h2>
    <p style="margin:0 0 24px;color:${COLORS.textSecondary};font-size:14px;line-height:1.7;">
      A tela <strong style="color:${COLORS.textPrimary};">${deviceName}</strong> parou de enviar sinal
      (heartbeat) há mais tempo do que o esperado e pode estar desligada, sem internet ou com falha.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.amberBg};border:1px solid ${COLORS.amberBorder};border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:${COLORS.amber};font-size:12px;font-weight:600;line-height:1.5;">
            ⚠️ Verifique a tela fisicamente ou no painel de saúde de dispositivos assim que possível.
          </p>
        </td>
      </tr>
    </table>
  `;
  return emailLayout(content);
}

// ==============================================================================
// ENVIO DE E-MAILS
// ==============================================================================

/**
 * Prepara o attachment do logo para usar como CID inline.
 */
export function getLogoAttachment(): nodemailer.SendMailOptions['attachments'] {
  try {
    const logoPath = path.resolve(__dirname, '../../icones-do-sistema/icone-office-display.png');
    if (fs.existsSync(logoPath)) {
      return [{
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo',
      }];
    }
  } catch {
    // fallback: sem logo
  }
  return [];
}

// ==============================================================================
// DESCADASTRO DE CAMPANHA (LGPD art. 18 · List-Unsubscribe)
// ==============================================================================

/** Link público de descadastro. Vai dentro do e-mail e é clicado SEM sessão. */
export function unsubscribeUrl(token: string): string {
  return `${API_PUBLIC_URL}/email/unsubscribe/${encodeURIComponent(token)}`;
}

/**
 * Token opaco e estável do descadastro.
 *
 * Gerado sob demanda porque toda a base anterior a 2026-09-09 tem
 * `unsubscribeToken` nulo — sem isto, o primeiro disparo de campanha sairia com
 * um link quebrado justamente para os clientes mais antigos. `randomBytes(24)`
 * e não o `id` do usuário: o link circula em caixas de entrada e em provedores
 * de e-mail; um id previsível permitiria descadastrar terceiros por tentativa.
 */
async function ensureUnsubscribeToken(userId: string, current: string | null): Promise<string> {
  if (current) return current;

  const token = crypto.randomBytes(24).toString('base64url');
  await prisma.user.update({ where: { id: userId }, data: { unsubscribeToken: token } });
  return token;
}

/** Rodapé obrigatório de campanha. Texto curto e direto — ninguém deve caçá-lo. */
function campaignFooter(url: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:16px auto 0;">
    <tr>
      <td style="padding:16px 24px;text-align:center;color:${COLORS.textMuted};font-family:'Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.7;">
        Você recebe este e-mail porque autorizou o envio de novidades do TelaHub.<br>
        <a href="${url}" style="color:${COLORS.cyan};text-decoration:underline;">Descadastrar-me destas novidades</a>
      </td>
    </tr>
  </table>
  `;
}

/**
 * Prepara a entrega de uma mensagem `kind: 'campaign'`: rodapé de descadastro +
 * cabeçalhos `List-Unsubscribe`.
 *
 * POR QUE NA HORA DE ENVIAR, e não ao enfileirar: o token pode não existir
 * ainda (base antiga) e a campanha pode ficar horas na fila. Montar aqui
 * garante que o link do e-mail que SAIU é o link válido no momento da saída.
 *
 * `List-Unsubscribe` + `List-Unsubscribe-Post` são exigência de Gmail e Yahoo
 * para remetentes em volume desde fevereiro de 2024 — sem eles a campanha vai
 * para spam e ARRASTA JUNTO a reputação do domínio, ou seja, derruba também a
 * entrega dos transacionais (convite, redefinição de senha) que saem do mesmo
 * remetente. Por isso o par de cabeçalhos não é opcional aqui.
 *
 * O `mailto:` só entra quando `UNSUBSCRIBE_EMAIL` está configurada: anunciar um
 * endereço que ninguém lê é pior do que não anunciar.
 */
export async function buildCampaignDelivery(message: EmailMessage): Promise<OutgoingEmail> {
  const user = message.toUserId
    ? await prisma.user.findUnique({
        where: { id: message.toUserId },
        select: { id: true, unsubscribeToken: true },
      })
    : await prisma.user.findUnique({
        where: { email: message.toEmail },
        select: { id: true, unsubscribeToken: true },
      });

  // Sem usuário não há como descadastrar — e sem descadastro a campanha não
  // pode sair. A fila já suprime esse caso antes de chegar aqui (ninguém sem
  // cadastro tem opt-in demonstrável); este `throw` é a segunda tranca.
  if (!user) {
    throw new Error('destinatário de campanha sem usuário: não há token de descadastro');
  }

  const token = await ensureUnsubscribeToken(user.id, user.unsubscribeToken);
  const url = unsubscribeUrl(token);

  const headers: Record<string, string> = {
    'List-Unsubscribe': UNSUBSCRIBE_MAILTO
      ? `<${url}>, <mailto:${UNSUBSCRIBE_MAILTO}>`
      : `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };

  return {
    to: message.toEmail,
    subject: message.subject,
    html: `${message.htmlBody}${campaignFooter(url)}`,
    headers,
  };
}

/** Layout padrão do sistema aplicado a um corpo escrito pelo `master`. */
export function wrapInLayout(content: string): string {
  return emailLayout(content);
}

/**
 * Enfileira o e-mail de convite com as credenciais de acesso.
 */
export async function sendInviteEmail(
  to: string,
  password: string,
  context: EmailContext = {}
): Promise<void> {
  await emailQueueService.enqueue({
    toEmail: to,
    subject: '🎉 Você foi convidado para o TelaHub!',
    htmlBody: getInviteTemplate(to, password),
    kind: 'transactional',
    templateKey: 'invite',
    organizationId: context.organizationId ?? null,
    toUserId: context.userId ?? null,
  });
}

/**
 * Envia o e-mail de boas-vindas de quem se cadastrou por conta própria
 * (`POST /api/signup`). Diferente do convite, aqui a pessoa já escolheu a
 * própria senha — não há credencial a transmitir.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  companyName: string,
  context: EmailContext = {}
): Promise<void> {
  await emailQueueService.enqueue({
    toEmail: to,
    subject: '👋 Sua conta TelaHub está pronta',
    htmlBody: getWelcomeTemplate(name, companyName),
    kind: 'transactional',
    templateKey: 'welcome',
    organizationId: context.organizationId ?? null,
    toUserId: context.userId ?? null,
  });
}

/**
 * Envia o alerta de dispositivo offline por tempo prolongado para um administrador.
 */
export async function sendDeviceOfflineAlertEmail(
  to: string,
  deviceName: string,
  context: EmailContext = {}
): Promise<void> {
  await emailQueueService.enqueue({
    toEmail: to,
    subject: `📴 Tela offline: ${deviceName}`,
    htmlBody: getDeviceOfflineTemplate(deviceName),
    kind: 'transactional',
    templateKey: 'device_offline',
    organizationId: context.organizationId ?? null,
    toUserId: context.userId ?? null,
  });
}

/**
 * Envia a confirmação de contratação de quem comprou pelo checkout.
 *
 * Existe separado de `sendInviteEmail` porque o convite genérico ("você foi
 * convidado") não menciona compra nenhuma — quem acabou de pagar precisa ver o
 * que contratou e por quanto, junto da credencial de acesso.
 *
 * O assunto muda quando `simulated` é `true`: a pessoa precisa saber que não
 * houve cobrança já na caixa de entrada, antes mesmo de abrir a mensagem.
 */
export async function sendPurchaseConfirmationEmail(
  to: string,
  data: {
    name: string;
    planName: string;
    screens: number;
    amountCents: number;
    password: string;
    simulated: boolean;
  },
  context: EmailContext = {}
): Promise<void> {
  await emailQueueService.enqueue({
    toEmail: to,
    subject: data.simulated
      ? '🧪 TelaHub: simulação de contratação (nenhum valor cobrado)'
      : '✅ Contratação confirmada: seu acesso ao TelaHub',
    htmlBody: getPurchaseTemplate(
      to,
      data.name,
      data.planName,
      data.screens,
      data.amountCents,
      data.password,
      data.simulated
    ),
    kind: 'transactional',
    templateKey: 'purchase_confirmation',
    organizationId: context.organizationId ?? null,
    toUserId: context.userId ?? null,
  });
}

/**
 * Envia o e-mail de redefinição de senha.
 */
export async function sendResetPasswordEmail(
  to: string,
  token: string,
  context: EmailContext = {}
): Promise<void> {
  const resetUrl = `${APP_URL}/#/reset-password?token=${token}`;

  await emailQueueService.enqueue({
    toEmail: to,
    subject: '🔐 Redefinição de Senha do TelaHub',
    htmlBody: getResetPasswordTemplate(resetUrl),
    // O motivo de a fila ter prioridade por `kind`: este e-mail é o mais
    // urgente do sistema (a pessoa está parada na tela de login esperando) e
    // não pode ficar atrás de uma campanha de 500 destinatários.
    kind: 'transactional',
    templateKey: 'reset_password',
    organizationId: context.organizationId ?? null,
    toUserId: context.userId ?? null,
  });
}

/**
 * Avisa o comercial que um lead novo chegou pelo site.
 *
 * Destino: `COMMERCIAL_EMAIL` e, sem ele, o próprio remetente configurado no
 * SMTP — assim o aviso nunca some por falta de uma variável, ele só cai na
 * caixa de quem já é dono do envio.
 */
export async function sendLeadNotificationEmail(lead: {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  planCode: string | null;
  utmSource: string | null;
  referrer: string | null;
  createdAt: Date;
}): Promise<void> {
  const smtp = await settingsService.getSmtpConfig();
  const destino = process.env.COMMERCIAL_EMAIL || smtp?.fromEmail;

  // Único envio que não tem destinatário próprio: sem `COMMERCIAL_EMAIL` e sem
  // SMTP configurado não existe caixa para onde mandar. Enfileirar com
  // destinatário vazio criaria uma linha que nunca sai e ainda queimaria as 5
  // tentativas — o aviso some do mesmo jeito, só que com ruído no histórico.
  if (!destino) {
    console.warn('[email] lead sem destinatário: configure COMMERCIAL_EMAIL ou o SMTP.');
    return;
  }

  const linha = (rotulo: string, valor: string | null) =>
    valor ? `<tr><td style="padding:6px 12px;color:#55637d">${rotulo}</td><td style="padding:6px 12px;color:#0a1223"><strong>${valor}</strong></td></tr>` : '';

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#0a1223;margin:0 0 4px">Novo lead pelo site</h2>
      <p style="color:#55637d;margin:0 0 16px">Recebido em ${lead.createdAt.toLocaleString('pt-BR')}.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #dbe4ef;border-radius:8px">
        ${linha('Nome', lead.name)}
        ${/* O `replyTo` do lead se perdeu ao entrar na fila: `EmailMessage` não
             tem coluna para ele, e inventar uma para um único caso não pagaria.
             O e-mail vira link `mailto:` para responder continuar a um clique. */ ''}
        ${linha('E-mail', lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : null)}
        ${linha('Empresa', lead.company)}
        ${linha('Telefone', lead.phone)}
        ${linha('Plano de interesse', lead.planCode)}
        ${linha('Origem (utm_source)', lead.utmSource)}
        ${linha('Veio de', lead.referrer)}
      </table>
      <p style="color:#55637d;font-size:12px;margin-top:16px">Lead ${lead.id}</p>
    </div>
  `;

  await emailQueueService.enqueue({
    toEmail: destino,
    subject: `📩 Novo lead: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
    htmlBody: html,
    kind: 'transactional',
    templateKey: 'lead_notification',
    // Um lead só chega uma vez: a chave impede aviso repetido se o produtor do
    // e-mail for reexecutado (reentrega de evento, script manual).
    dedupeKey: `lead_notification:${lead.id}`,
  });
}
