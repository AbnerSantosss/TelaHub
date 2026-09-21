/**
 * E-mail avulso do backoffice para UM cliente.
 *
 * É a mensagem individual que alguém escreve para um cliente específico —
 * cobrança, aviso, resposta a um chamado. Não é campanha, e a diferença não é
 * de tamanho: o servidor manda esta como `transactional`, então ela **não
 * passa pelo filtro de opt-in**. É correto (responder um cliente é execução do
 * contrato, não marketing), e é exatamente por isso que este caminho não pode
 * virar atalho para "novidades": mandar conteúdo promocional por aqui furaria o
 * consentimento de toda a base, um destinatário por vez, sem deixar rastro de
 * campanha. O aviso no rodapé do formulário existe para dizer isso a quem
 * escreve.
 */
import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { toast } from 'sonner';

import { isApiError } from '../../lib/api';
import { sendOrganizationEmail } from '../backoffice-api';
import type { ClienteDetail } from '../backoffice-types';
import { Button, cx } from '../ui';

interface Props {
  detail: ClienteDetail;
  onClose: () => void;
  onSent?: () => void;
}

/** Mínimo do servidor para o corpo. Repetido aqui só para avisar ANTES do 400. */
const CORPO_MINIMO = 20;

const EmailAvulsoModal = ({ detail, onClose, onSent }: Props) => {
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [reason, setReason] = useState('');
  const [enviando, setEnviando] = useState(false);

  // O destinatário é decidido pelo SERVIDOR (o contato da organização), e não
  // por um campo aqui. Deixar o operador digitar o endereço transformaria a
  // tela num cliente de e-mail genérico, capaz de mandar qualquer coisa para
  // qualquer um usando a identidade da plataforma.
  const organizacao = detail.organization.name;

  const corpoCurto = htmlBody.trim().length > 0 && htmlBody.trim().length < CORPO_MINIMO;
  const podeEnviar =
    subject.trim().length >= 3 && htmlBody.trim().length >= CORPO_MINIMO && reason.trim().length >= 3;

  async function enviar(): Promise<void> {
    if (!podeEnviar || enviando) return;
    setEnviando(true);
    try {
      await sendOrganizationEmail(detail.organization.id, {
        subject: subject.trim(),
        htmlBody: htmlBody.trim(),
        reason: reason.trim(),
      });
      // "Enfileirado", nunca "enviado": o envio real acontece no job, e dizer
      // "enviado" aqui seria afirmar algo que ainda não aconteceu — e que pode
      // falhar no provedor. O histórico da organização é onde se confere.
      toast.success('E-mail enfileirado. Acompanhe em E-mail → Histórico.');
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(
        isApiError(err) ? err.message : 'Não foi possível enfileirar o e-mail.'
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-avulso-titulo"
    >
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="email-avulso-titulo" className="flex items-center gap-2 text-lg font-bold text-ink">
              <Mail aria-hidden="true" className="h-5 w-5" />
              Enviar e-mail para o cliente
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Vai para o contato de <strong className="text-ink">{organizacao}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-app hover:text-ink"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">Assunto</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              placeholder="Ex.: Sobre a sua fatura de setembro"
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:border-ink-subtle focus-visible:ring-2 focus-visible:ring-ink/10"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">Mensagem (HTML simples)</span>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={8}
              placeholder="<p>Olá! Passando para avisar que…</p>"
              className="rounded-lg border border-line bg-white px-3 py-2 font-mono text-[13px] leading-relaxed text-ink outline-none focus-visible:border-ink-subtle focus-visible:ring-2 focus-visible:ring-ink/10"
            />
            <span className={cx('text-[12px]', corpoCurto ? 'text-danger' : 'text-ink-subtle')}>
              {corpoCurto
                ? `O servidor recusa mensagens com menos de ${CORPO_MINIMO} caracteres.`
                : 'Use HTML simples. O rodapé e a identidade visual são adicionados no envio.'}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">Motivo (fica registrado)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Ex.: cliente pediu segunda via por telefone"
              className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus-visible:border-ink-subtle focus-visible:ring-2 focus-visible:ring-ink/10"
            />
            <span className="text-[12px] text-ink-subtle">
              Entra na trilha de auditoria desta organização, junto com quem enviou.
            </span>
          </label>

          <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
            Esta mensagem sai como <strong className="text-ink">transacional</strong> e por isso
            chega mesmo a quem não aceitou receber novidades. Isso é correto para falar de
            contrato, cobrança ou suporte.{' '}
            <strong className="text-ink">Não use este caminho para divulgação:</strong> conteúdo
            promocional deve ir por Campanha, que respeita o consentimento de cada pessoa.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="button" onClick={enviar} disabled={!podeEnviar || enviando}>
            {enviando ? 'Enfileirando…' : 'Enfileirar e-mail'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailAvulsoModal;
