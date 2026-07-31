/**
 * Catálogo de provedores de e-mail (SMTP).
 *
 * Existe para que trocar de provedor seja escolher um item de lista, e não
 * descobrir host e porta na documentação de terceiro. O TelaHub sai de fábrica
 * no Gmail (ver `getEnvSmtpDefaults`), mas o operador pode migrar para qualquer
 * provedor daqui — ou para `custom`, informando host e porta à mão.
 *
 * Os dados foram conferidos na documentação oficial de cada provedor em
 * 2026-07-29. Quando um provedor mudar host ou porta, é este arquivo que muda —
 * nenhum outro lugar do código conhece endereço de servidor de e-mail.
 *
 * Convenção de `secure` (nodemailer): `true` = TLS implícito desde a conexão
 * (porta 465); `false` = conexão limpa promovida por STARTTLS (portas 587/2525).
 * Não existe terceira opção: `false` não significa "sem criptografia".
 */

export type EmailProviderId =
  | 'gmail'
  | 'google-workspace'
  | 'outlook'
  | 'microsoft365'
  | 'zoho'
  | 'zoho-workspace'
  | 'yahoo'
  | 'icloud'
  | 'sendgrid'
  | 'mailgun'
  | 'amazon-ses'
  | 'brevo'
  | 'postmark'
  | 'resend'
  | 'custom';

export interface EmailProvider {
  id: EmailProviderId;
  label: string;
  /** Pessoal/corporativo (caixa de e-mail) ou serviço transacional (relay). */
  kind: 'caixa' | 'transacional' | 'manual';
  host: string;
  port: number;
  secure: boolean;
  /** O que preencher no campo de usuário. */
  userHint: string;
  /** O que preencher no campo de senha. */
  passHint: string;
  /** Usuário fixo exigido pelo provedor (SendGrid, Resend). */
  fixedUser?: string;
  /** Onde o operador obtém a credencial. */
  credentialsUrl?: string;
  /** Ressalva que muda a decisão — mostrada na interface. */
  warning?: string;
}

export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    kind: 'caixa',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    userHint: 'O endereço Gmail completo (ex.: notificacoes@gmail.com)',
    passHint: 'Senha de app de 16 dígitos — a senha da conta não funciona',
    credentialsUrl: 'https://myaccount.google.com/apppasswords',
    warning:
      'Exige Verificação em 2 Etapas ativa. Limite aproximado de 500 destinatários/dia numa conta gratuita.',
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace (domínio próprio)',
    kind: 'caixa',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    userHint: 'O e-mail do domínio (ex.: naoresponda@suaempresa.com.br)',
    passHint: 'Senha de app gerada na conta do Workspace',
    credentialsUrl: 'https://myaccount.google.com/apppasswords',
    warning: 'Limite de ~2.000 destinatários/dia por usuário.',
  },
  {
    id: 'outlook',
    label: 'Outlook.com / Hotmail',
    kind: 'caixa',
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    userHint: 'O endereço Outlook/Hotmail completo',
    passHint: 'Senha de app da conta Microsoft',
    credentialsUrl: 'https://account.live.com/proofs/AppPassword',
    warning:
      'A Microsoft vem desativando autenticação básica em contas pessoais; se o envio falhar com erro de autenticação, o caminho é migrar para um provedor transacional.',
  },
  {
    id: 'microsoft365',
    label: 'Microsoft 365 / Exchange Online',
    kind: 'caixa',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    userHint: 'A caixa corporativa (ex.: sistema@suaempresa.com.br)',
    passHint: 'Senha da caixa (quando a organização ainda permitir SMTP AUTH)',
    warning:
      'A Microsoft desativou autenticação básica no Exchange Online em outubro de 2022. Só funciona se o administrador tiver reativado SMTP AUTH para essa caixa — do contrário exige OAuth2, que o TelaHub ainda não implementa.',
  },
  {
    id: 'zoho',
    label: 'Zoho Mail (conta pessoal)',
    kind: 'caixa',
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    userHint: 'O endereço @zoho.com',
    passHint: 'Senha da conta, ou senha de aplicativo se houver 2FA',
    credentialsUrl: 'https://accounts.zoho.com/home#security',
  },
  {
    id: 'zoho-workspace',
    label: 'Zoho Mail (domínio próprio)',
    kind: 'caixa',
    host: 'smtppro.zoho.com',
    port: 587,
    secure: false,
    userHint: 'O e-mail do domínio hospedado no Zoho',
    passHint: 'Senha da conta, ou senha de aplicativo se houver 2FA',
    warning:
      'Contas de domínio usam `smtppro`, não `smtp` — trocar o host é o erro mais comum aqui.',
  },
  {
    id: 'yahoo',
    label: 'Yahoo Mail',
    kind: 'caixa',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    userHint: 'O endereço Yahoo completo',
    passHint: 'Senha de app (obrigatória — a senha da conta é recusada)',
    credentialsUrl: 'https://login.yahoo.com/account/security',
  },
  {
    id: 'icloud',
    label: 'iCloud Mail',
    kind: 'caixa',
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    userHint: 'O endereço @icloud.com',
    passHint: 'Senha específica de app gerada no Apple ID',
    credentialsUrl: 'https://appleid.apple.com/account/manage',
    warning: 'A Apple recusa a senha normal do Apple ID no SMTP, com ou sem 2FA.',
  },
  {
    id: 'sendgrid',
    label: 'SendGrid',
    kind: 'transacional',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    fixedUser: 'apikey',
    userHint: 'Literalmente `apikey` — o provedor exige essa palavra',
    passHint: 'A API Key gerada no painel (começa com SG.)',
    credentialsUrl: 'https://app.sendgrid.com/settings/api_keys',
  },
  {
    id: 'mailgun',
    label: 'Mailgun',
    kind: 'transacional',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    userHint: 'Usuário SMTP do domínio (normalmente postmaster@seudominio)',
    passHint: 'Senha SMTP do domínio',
    credentialsUrl: 'https://app.mailgun.com/settings/api_security',
    warning:
      'Domínio na região europeia usa `smtp.eu.mailgun.org` — nesse caso escolha "Servidor SMTP manual".',
  },
  {
    id: 'amazon-ses',
    label: 'Amazon SES',
    kind: 'transacional',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    userHint: 'SMTP username gerado pelo SES (não é a access key da AWS)',
    passHint: 'SMTP password gerado junto com o username',
    credentialsUrl: 'https://console.aws.amazon.com/ses/home#/smtp',
    warning:
      'O host muda conforme a região. Fora de us-east-1, escolha "Servidor SMTP manual" e informe `email-smtp.<regiao>.amazonaws.com`. Conta nova começa em sandbox: só envia para endereços verificados.',
  },
  {
    id: 'brevo',
    label: 'Brevo (ex-Sendinblue)',
    kind: 'transacional',
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    userHint: 'O e-mail de login da conta Brevo',
    passHint: 'A chave SMTP (não a API Key)',
    credentialsUrl: 'https://app.brevo.com/settings/keys/smtp',
    warning: 'Usar a API Key no lugar da chave SMTP é a causa mais comum de falha aqui.',
  },
  {
    id: 'postmark',
    label: 'Postmark',
    kind: 'transacional',
    host: 'smtp.postmarkapp.com',
    port: 587,
    secure: false,
    userHint: 'O Server API Token (o mesmo valor no usuário e na senha)',
    passHint: 'O Server API Token',
    credentialsUrl: 'https://account.postmarkapp.com/servers',
  },
  {
    id: 'resend',
    label: 'Resend',
    kind: 'transacional',
    host: 'smtp.resend.com',
    port: 587,
    secure: false,
    fixedUser: 'resend',
    userHint: 'Literalmente `resend` — o provedor exige essa palavra',
    passHint: 'A API Key da conta (começa com re_)',
    credentialsUrl: 'https://resend.com/api-keys',
    warning: 'Exige domínio verificado antes do primeiro envio.',
  },
  {
    id: 'custom',
    label: 'Servidor SMTP manual',
    kind: 'manual',
    host: '',
    port: 587,
    secure: false,
    userHint: 'O usuário que o seu provedor informou',
    passHint: 'A senha que o seu provedor informou',
    warning:
      'Use para hospedagens nacionais (Locaweb, KingHost, UOL Host, Hostinger) e para regiões alternativas de Mailgun/SES.',
  },
];

export function findProvider(id: string | null | undefined): EmailProvider | undefined {
  return EMAIL_PROVIDERS.find((p) => p.id === id);
}

export const DEFAULT_PROVIDER_ID: EmailProviderId = 'gmail';
