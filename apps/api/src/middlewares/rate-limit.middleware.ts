import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Mitiga força bruta contra login/reset de senha: 10 tentativas por IP a cada 15 minutos.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
});

function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * POST /api/devices/register é público e recebe um código de pareamento.
 * A ameaça é adivinhar o código de outra loja para sequestrar a TV, então o
 * limite é por IP — quem tenta em massa vem de poucos endereços.
 *
 * Instalação em massa (shopping parear 300 telas no mesmo dia, atrás de um
 * NAT só) é o caso legítimo que esbarra nisso: suba
 * `DEVICE_REGISTER_RATE_LIMIT` durante o rollout.
 */
export const deviceRegisterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: positiveIntFromEnv('DEVICE_REGISTER_RATE_LIMIT', 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de registro. Aguarde alguns minutos.' },
});

/**
 * Heartbeat e status são públicos e chamados pela própria TV. Conta por janela
 * de 15 min, POR TV (o contador é compartilhado entre as duas rotas):
 *   - pareada: 15 heartbeats (um a cada 60 s) + 15 consultas de status = 30;
 *   - aguardando pareamento: 90 consultas de status (uma a cada 10 s) + 15
 *     heartbeats = 105.
 * O padrão era 60: a TV na tela de pareamento tomava 429 depois de dez minutos
 * esperando o código ser digitado. 150 cobre os dois casos com folga e ainda é
 * uma chamada a cada 6 s — nenhuma TV consegue martelar o backend sozinha.
 *
 * **Não** dá para limitar por IP: uma rede com 300 telas sai por um NAT só e
 * somaria ~2.250 chamadas por janela, ou seja, o limite derrubaria justamente
 * o cliente grande. A chave é o id do dispositivo: cada TV tem folga de sobra
 * e nenhuma consegue martelar o backend sozinha.
 */
const deviceIdKey = (req: Request): string => `device:${req.params.id ?? 'desconhecido'}`;

export const deviceTelemetryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: positiveIntFromEnv('DEVICE_TELEMETRY_RATE_LIMIT', 150),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: deviceIdKey,
  message: { error: 'Muitas chamadas para este dispositivo. Aguarde alguns minutos.' },
});

/**
 * O proxy de RSS busca uma URL de fora em nome de quem chama. Mesmo com a
 * guarda de SSRF (`lib/safe-http`), sem limite ele viraria um amplificador de
 * tráfego para a internet pública. O player legítimo consulta um feed a cada
 * poucos minutos.
 */
export const proxyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: positiveIntFromEnv('PROXY_RATE_LIMIT', 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições ao proxy. Aguarde alguns minutos.' },
});

/**
 * Formulário de contato do site. É público e manda e-mail, então sem limite
 * vira ferramenta de spam contra a caixa do comercial.
 */
export const leadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: positiveIntFromEnv('LEAD_RATE_LIMIT', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos envios. Aguarde alguns minutos antes de tentar novamente.' },
});

/**
 * IA de criação: cada chamada custa dinheiro na conta do provedor. Além do
 * limite mensal por organização (configurado no admin), este teto curto evita
 * rajada por clique repetido ou script. A chave é o usuário autenticado, não o
 * IP: várias pessoas de uma rede saem pelo mesmo NAT.
 */
export const aiRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: positiveIntFromEnv('AI_RATE_LIMIT', 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => `ai-user:${req.user?.id ?? 'anonimo'}`,
  message: { error: 'Muitos pedidos de IA em pouco tempo. Aguarde alguns minutos.' },
});
