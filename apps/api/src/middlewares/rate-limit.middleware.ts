import rateLimit from 'express-rate-limit';

// Mitiga força bruta contra login/reset de senha: 10 tentativas por IP a cada 15 minutos.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
});
