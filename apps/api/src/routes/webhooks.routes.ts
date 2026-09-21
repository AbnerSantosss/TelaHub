import { Router, Request, Response } from 'express';

import { timingSafeTokenMatch } from '../services/asaas.provider';
import { paymentService, type AsaasWebhookBody } from '../services/payment.service';

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS DE GATEWAY
//
// Rota PÚBLICA de propósito: quem chama é o servidor do Asaas, que não tem
// sessão nem JWT. A autenticação é o token combinado no cadastro do webhook,
// enviado no header `asaas-access-token`.
//
// ── As três regras que sustentam esta rota ──────────────────────────────────
//
// 1. RESPONDA 200 QUASE SEMPRE. O Asaas reenvia por dias o que não recebe 200
//    e, pior, uma fila de webhook travada SUSPENDE as notificações da conta
//    inteira — inclusive as de pagamentos legítimos de outros clientes. Evento
//    desconhecido vira `ignored` com 200; falha nossa vira `failed` no banco,
//    também com 200, e é o reenvio que a retoma.
//    A ÚNICA resposta não-200 é a de token inválido: aí não é o Asaas falando.
//
// 2. IDEMPOTÊNCIA ANTES DE TUDO. O evento cru é gravado em `WebhookEvent` ANTES
//    de qualquer processamento, e `@@unique([provider, eventId])` garante que a
//    segunda entrega não reprocessa. Confirmar duas vezes o mesmo pagamento
//    duplicaria a receita no relatório e poderia provisionar duas contas.
//
// 3. NENHUMA REGRA DE NEGÓCIO AQUI. A rota valida, delega e responde. Quem
//    decide o que cada evento faz é `payment.service` — testável sem HTTP.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

/**
 * POST /api/webhooks/asaas
 *
 * Cadastre esta URL no painel do Asaas (Integrações → Webhooks) com o mesmo
 * token de `ASAAS_WEBHOOK_TOKEN`.
 */
router.post('/asaas', async (req: Request, res: Response): Promise<void> => {
  const expected = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();

  // Sem token configurado a rota fica FECHADA. A alternativa — aceitar tudo
  // quando não há token — transformaria um esquecimento de configuração numa
  // porta aberta para qualquer um confirmar pagamentos que nunca existiram, que
  // é o mesmo risco que a trava do provedor simulado existe para conter.
  if (!expected) {
    console.warn(
      '[webhook/asaas] ASAAS_WEBHOOK_TOKEN não configurado: o webhook está recusando tudo. ' +
        'Configure a variável com o mesmo valor cadastrado no painel do Asaas.'
    );
    res.status(503).json({ error: 'Webhook não configurado.', code: 'webhook_not_configured' });
    return;
  }

  const received = req.header('asaas-access-token');

  // Comparação em tempo constante: `===` vazaria o prefixo correto pelo tempo
  // de resposta, e com o token um atacante libera conta paga de graça.
  if (!timingSafeTokenMatch(received, expected)) {
    res.status(401).json({ error: 'Token de webhook inválido.', code: 'invalid_webhook_token' });
    return;
  }

  const body = (req.body ?? {}) as AsaasWebhookBody;

  try {
    // O corpo cru é guardado como TEXTO em `WebhookEvent.payload`: numa disputa
    // de cobrança, o que vale é o que o gateway mandou, não a nossa
    // interpretação dele.
    const result = await paymentService.handleAsaasWebhook(body, JSON.stringify(body));
    res.status(200).json({ received: true, status: result.status });
  } catch (error) {
    // Só chega aqui se o próprio registro do evento falhar (banco fora do ar).
    // 500 é o certo neste caso — e é o único em que QUEREMOS o reenvio.
    console.error('[webhook/asaas] falha ao registrar o evento:', error);
    res.status(500).json({ received: false, error: 'Falha ao registrar o evento.' });
  }
});

export default router;
