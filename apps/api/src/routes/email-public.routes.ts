import { Router, Request, Response } from 'express';

import prisma from '../lib/prisma';

/**
 * Descadastro de novidades — `GET /api/email/unsubscribe/:token`.
 *
 * Rota PÚBLICA de propósito: exigir login para sair de uma lista é obstáculo ao
 * direito de oposição (LGPD art. 18), e quem quer se descadastrar normalmente
 * não lembra (nem quer lembrar) a senha. O token opaco é a credencial.
 *
 * ── Por que a resposta é a MESMA para token inválido ─────────────────────────
 * Responder "token não encontrado" transformaria esta rota num oráculo: com uma
 * lista de tokens dá para descobrir quais existem, e um token existente prova
 * que aquele endereço está na base. Confirmar ou negar é vazamento de dado
 * pessoal por caminho lateral. Então a página é idêntica nos dois casos — e o
 * efeito colateral é bom: quem clica duas vezes no mesmo link (o segundo clique
 * não muda mais nada) vê a mesma confirmação em vez de um erro assustador.
 *
 * ── Por que também aceita POST ───────────────────────────────────────────────
 * O cabeçalho `List-Unsubscribe-Post: List-Unsubscribe=One-Click` que as
 * campanhas carregam faz Gmail e Yahoo dispararem um POST para esta URL quando
 * a pessoa usa o botão "cancelar inscrição" do próprio cliente de e-mail
 * (RFC 8058). Anunciar o cabeçalho sem atender o POST é pior que não anunciar:
 * o provedor registra a falha como remetente que não honra descadastro, e isso
 * atinge a reputação do domínio — ou seja, a entrega dos transacionais também.
 */
const router = Router();

const APP_URL = process.env.APP_URL || 'https://devtelahubpainel.proxserverabner.site';

/** Página de confirmação. Sem JS, sem imagem externa: precisa abrir em qualquer lugar. */
function confirmationPage(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descadastro confirmado | TelaHub</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:64px 24px;">
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:40px 32px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#e2e8f0;">
        Tela<span style="color:#22d3ee;">Hub</span>
      </h1>
      <h2 style="margin:24px 0 12px;font-size:18px;font-weight:700;color:#e2e8f0;">
        Você não vai receber mais novidades
      </h2>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.7;">
        Seu e-mail foi removido da lista de novidades e promoções do TelaHub.
        Não é preciso fazer mais nada.
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:1.7;">
        Você continua recebendo apenas os avisos essenciais da sua conta
        (cobrança, vencimento e segurança), que fazem parte da execução do
        contrato e não são publicidade.
      </p>
      <p style="margin:28px 0 0;">
        <a href="${APP_URL}" style="color:#22d3ee;font-size:13px;text-decoration:none;">
          Voltar para o TelaHub
        </a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Zera `marketingOptInAt`. O token NÃO é apagado: ele precisa continuar válido
 * para a pessoa poder repetir o descadastro a partir de um e-mail antigo que
 * ainda esteja na caixa dela — e para o dia em que ela optar por voltar a
 * receber e precisar de um link de saída de novo.
 *
 * Nunca lança: banco fora não pode virar uma página de erro no meio de um
 * direito que a lei garante. O pior caso vira "vou ver de novo" (a mensagem
 * seguinte ainda traz o link).
 */
async function unsubscribe(token: string): Promise<void> {
  try {
    // `updateMany` e não `update`: token inexistente devolve `count: 0` em vez
    // de lançar P2025 — o caminho do token inválido é normal aqui, não erro.
    await prisma.user.updateMany({
      where: { unsubscribeToken: token },
      data: { marketingOptInAt: null },
    });
  } catch (err) {
    console.error('[email-public] falha ao descadastrar:', err instanceof Error ? err.message : err);
  }
}

router.get('/unsubscribe/:token', async (req: Request, res: Response): Promise<void> => {
  await unsubscribe(req.params.token as string);
  res.status(200).type('html').send(confirmationPage());
});

/** One-click de Gmail/Yahoo (RFC 8058). Responde texto: nada é exibido. */
router.post('/unsubscribe/:token', async (req: Request, res: Response): Promise<void> => {
  await unsubscribe(req.params.token as string);
  res.status(200).type('text/plain').send('OK');
});

export default router;
