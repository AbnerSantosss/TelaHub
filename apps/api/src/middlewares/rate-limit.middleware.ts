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
 * Heartbeat e status são públicos e chamados pela própria TV — o player bate
 * a cada 2 minutos (7,5 chamadas por janela de 15 min).
 *
 * **Não** dá para limitar por IP: uma rede com 300 telas sai por um NAT só e
 * somaria ~2.250 chamadas por janela, ou seja, o limite derrubaria justamente
 * o cliente grande. A chave é o id do dispositivo: cada TV tem folga de sobra
 * e nenhuma consegue martelar o backend sozinha.
 */
const deviceIdKey = (req: Request): string => `device:${req.params.id ?? 'desconhecido'}`;

export const deviceTelemetryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: positiveIntFromEnv('DEVICE_TELEMETRY_RATE_LIMIT', 60),
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
