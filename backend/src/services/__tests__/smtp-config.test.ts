import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import prisma from '../../lib/prisma';
import { getEnvSmtpConfig, settingsService } from '../../services/settings.service';
import { EMAIL_PROVIDERS, findProvider } from '../../services/email-providers';

// Chaves tocadas por estes testes. O `Setting` é global (não tem tenant), então
// cada caso limpa o que escreveu para não contaminar o vizinho.
const SMTP_KEYS = [
  'smtp_provider',
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass',
  'smtp_from_email',
  'smtp_from_name',
];

const ENV_KEYS = [
  'SMTP_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
];

let envBackup: Record<string, string | undefined> = {};

async function clearSmtpSettings() {
  await prisma.setting.deleteMany({ where: { key: { in: SMTP_KEYS } } });
}

beforeEach(async () => {
  envBackup = {};
  for (const key of ENV_KEYS) {
    envBackup[key] = process.env[key];
    delete process.env[key];
  }
  await clearSmtpSettings();
});

afterEach(async () => {
  for (const key of ENV_KEYS) {
    if (envBackup[key] === undefined) delete process.env[key];
    else process.env[key] = envBackup[key];
  }
  await clearSmtpSettings();
});

describe('catálogo de provedores de e-mail', () => {
  it('todo provedor com preset tem host e porta utilizáveis', () => {
    for (const p of EMAIL_PROVIDERS) {
      if (p.id === 'custom') continue;
      expect(p.host, `${p.id} sem host`).toMatch(/\./);
      expect(p.port).toBeGreaterThan(0);
    }
  });

  it('porta 465 implica TLS implícito, e 587 implica STARTTLS', () => {
    for (const p of EMAIL_PROVIDERS) {
      if (p.port === 465) expect(p.secure, `${p.id} na 465 deveria ser secure`).toBe(true);
      if (p.port === 587) expect(p.secure, `${p.id} na 587 não deveria ser secure`).toBe(false);
    }
  });

  it('provedores de usuário fixo declaram qual é', () => {
    expect(findProvider('sendgrid')?.fixedUser).toBe('apikey');
    expect(findProvider('resend')?.fixedUser).toBe('resend');
  });
});

describe('padrão de fábrica vindo do ambiente', () => {
  it('deriva host, porta e criptografia do provedor quando só há usuário e senha', () => {
    process.env.SMTP_USER = 'notificacoes@exemplo.com';
    process.env.SMTP_PASS = 'senha-de-app';

    const cfg = getEnvSmtpConfig();

    expect(cfg).not.toBeNull();
    expect(cfg!.provider).toBe('gmail');
    expect(cfg!.host).toBe('smtp.gmail.com');
    expect(cfg!.port).toBe(587);
    expect(cfg!.secure).toBe(false);
    expect(cfg!.fromEmail).toBe('notificacoes@exemplo.com');
    expect(cfg!.source).toBe('ambiente');
  });

  it('respeita host e porta explícitos, para regiões alternativas e servidor próprio', () => {
    process.env.SMTP_PROVIDER = 'custom';
    process.env.SMTP_HOST = 'smtp.locaweb.com.br';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'sistema@empresa.com.br';
    process.env.SMTP_PASS = 'x';

    const cfg = getEnvSmtpConfig()!;

    expect(cfg.host).toBe('smtp.locaweb.com.br');
    expect(cfg.port).toBe(465);
    expect(cfg.secure).toBe(true);
  });

  it('sem usuário ou senha não há configuração — o sistema sobe sem e-mail', () => {
    process.env.SMTP_USER = 'so-o-usuario@exemplo.com';
    expect(getEnvSmtpConfig()).toBeNull();
  });
});

describe('precedência entre banco e ambiente', () => {
  it('o que o master salvou no painel vence o padrão de fábrica', async () => {
    process.env.SMTP_USER = 'padrao@exemplo.com';
    process.env.SMTP_PASS = 'padrao';

    await settingsService.setMultiple({
      smtp_provider: 'brevo',
      smtp_host: 'smtp-relay.brevo.com',
      smtp_port: '587',
      smtp_secure: 'false',
      smtp_user: 'operador@empresa.com.br',
      smtp_pass: 'chave-smtp',
      smtp_from_email: 'naoresponda@empresa.com.br',
      smtp_from_name: 'Empresa',
    });

    const cfg = await settingsService.getSmtpConfig();

    expect(cfg!.source).toBe('banco');
    expect(cfg!.provider).toBe('brevo');
    expect(cfg!.user).toBe('operador@empresa.com.br');
    expect(cfg!.fromEmail).toBe('naoresponda@empresa.com.br');
  });

  it('sem nada no banco, cai no padrão de fábrica', async () => {
    process.env.SMTP_USER = 'padrao@exemplo.com';
    process.env.SMTP_PASS = 'padrao';

    const cfg = await settingsService.getSmtpConfig();

    expect(cfg!.source).toBe('ambiente');
    expect(cfg!.user).toBe('padrao@exemplo.com');
  });

  it('config antiga (só user/pass, sem provider) continua funcionando como Gmail', async () => {
    // Regressão: instalações anteriores a 2026-07-29 gravaram só estas duas
    // chaves, quando o transporter era `service: 'gmail'` fixo. Se a leitura não
    // assumir Gmail, elas param de enviar e-mail no primeiro deploy.
    await settingsService.setMultiple({
      smtp_user: 'antigo@gmail.com',
      smtp_pass: 'senha-app',
    });

    const cfg = await settingsService.getSmtpConfig();

    expect(cfg!.provider).toBe('gmail');
    expect(cfg!.host).toBe('smtp.gmail.com');
    expect(cfg!.port).toBe(587);
    expect(cfg!.fromEmail).toBe('antigo@gmail.com');
    expect(cfg!.fromName).toBe('TelaHub');
  });

  it('sem banco e sem ambiente, devolve null em vez de uma config pela metade', async () => {
    expect(await settingsService.getSmtpConfig()).toBeNull();
  });
});
