import prisma from '../lib/prisma';
import { DEFAULT_PROVIDER_ID, EmailProviderId, findProvider } from './email-providers';

export interface SmtpConfig {
  provider: EmailProviderId;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** Remetente exibido. Nem sempre é o `user`: em SendGrid/Resend o usuário é uma palavra fixa. */
  fromEmail: string;
  fromName: string;
  /** De onde a configuração em uso veio — o painel mostra isso ao operador. */
  source: 'banco' | 'ambiente';
}

export class SettingsService {
  async get(key: string): Promise<string | null> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async getMultiple(keys: string[]): Promise<Record<string, string>> {
    const settings = await prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async setMultiple(entries: Record<string, string>): Promise<void> {
    const ops = Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
    await prisma.$transaction(ops);
  }

  /**
   * Configuração de SMTP em uso, ou `null` se não há nenhuma.
   *
   * Duas origens possíveis, nesta ordem:
   *
   * 1. **banco** — o que o `master` salvou pelo painel. Ganha sempre, porque é a
   *    escolha explícita de quem opera a plataforma.
   * 2. **ambiente** — o padrão de fábrica, vindo das variáveis `SMTP_*`. É o que
   *    faz uma instalação nova já enviar e-mail sem ninguém configurar nada.
   *
   * A credencial padrão fica em variável de ambiente, e não no código, pelo
   * motivo já registrado na wiki: este repositório é público, e senha em
   * repositório é senha pública — inclusive para quem instalar o produto depois.
   */
  async getSmtpConfig(): Promise<SmtpConfig | null> {
    const saved = await this.getMultiple([
      'smtp_provider',
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_pass',
      'smtp_from_email',
      'smtp_from_name',
    ]);

    if (saved.smtp_user && saved.smtp_pass) {
      // Registros anteriores a 2026-07-29 têm só user/pass: eram Gmail por
      // definição (o transporter usava `service: 'gmail'` fixo). Tratar a
      // ausência de provider como Gmail mantém essas instalações funcionando.
      const provider = (saved.smtp_provider as EmailProviderId) || DEFAULT_PROVIDER_ID;
      const preset = findProvider(provider);

      return {
        provider,
        host: saved.smtp_host || preset?.host || '',
        port: Number(saved.smtp_port) || preset?.port || 587,
        secure: saved.smtp_secure ? saved.smtp_secure === 'true' : (preset?.secure ?? false),
        user: saved.smtp_user,
        pass: saved.smtp_pass,
        fromEmail: saved.smtp_from_email || saved.smtp_user,
        fromName: saved.smtp_from_name || 'TelaHub',
        source: 'banco',
      };
    }

    return getEnvSmtpConfig();
  }
}

/**
 * Padrão de fábrica lido do ambiente. `SMTP_USER` e `SMTP_PASS` bastam — o resto
 * sai do catálogo do provedor escolhido em `SMTP_PROVIDER` (Gmail, se omitido).
 */
export function getEnvSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const provider = (process.env.SMTP_PROVIDER?.trim() as EmailProviderId) || DEFAULT_PROVIDER_ID;
  const preset = findProvider(provider);

  return {
    provider,
    host: process.env.SMTP_HOST?.trim() || preset?.host || '',
    port: Number(process.env.SMTP_PORT) || preset?.port || 587,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : (preset?.secure ?? false),
    user,
    pass,
    fromEmail: process.env.SMTP_FROM_EMAIL?.trim() || user,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'TelaHub',
    source: 'ambiente',
  };
}

export const settingsService = new SettingsService();
