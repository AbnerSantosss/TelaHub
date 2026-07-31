/**
 * Registro de contato de recuperação.
 *
 * O botão diz "Registrar contato" e não "Enviar mensagem" porque a API só grava
 * `recoveryNotifiedAt` + `recoveryChannel`: NÃO existe integração de WhatsApp
 * nem disparo de e-mail. Prometer envio aqui repetiria um erro que já custou
 * caro neste projeto — quem opera precisa saber que a mensagem é ele quem manda.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { AtSign, MessageCircle, MoreHorizontal, PhoneCall } from 'lucide-react';

import { isApiError } from '../lib/api';
import { registerRecovery } from './api';
import { formatDateTime, recoveryChannelLabel } from './format';
import type { AdminCheckoutSession, RecoveryChannel } from './types';
import { Button, Field, Modal, NoSendingNotice, cx, inputClass } from './ui';

const CHANNELS: Array<{ value: RecoveryChannel; label: string; icon: React.ReactNode }> = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle aria-hidden="true" className="h-4 w-4" /> },
  { value: 'email', label: 'E-mail', icon: <AtSign aria-hidden="true" className="h-4 w-4" /> },
  { value: 'phone', label: 'Telefone', icon: <PhoneCall aria-hidden="true" className="h-4 w-4" /> },
  { value: 'other', label: 'Outro', icon: <MoreHorizontal aria-hidden="true" className="h-4 w-4" /> },
];

const RecoveryModal = ({
  session,
  onClose,
  onRegistered,
}: {
  session: AdminCheckoutSession;
  onClose: () => void;
  onRegistered: (session: AdminCheckoutSession) => void;
}) => {
  const [channel, setChannel] = useState<RecoveryChannel>('whatsapp');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadName = session.name?.trim() || session.email || 'visitante anônimo';

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await registerRecovery(session.id, {
        channel,
        note: note.trim() ? note.trim() : undefined,
      });
      onRegistered(result.session);
      toast.success('Contato registrado.', {
        description: 'Nenhuma mensagem foi enviada pelo sistema — o envio é manual.',
      });
      onClose();
    } catch (registerError) {
      setError(
        isApiError(registerError)
          ? registerError.message
          : 'Não foi possível registrar o contato. Tente de novo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Registrar contato de recuperação"
      description={`Checkout de ${leadName}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="recovery-form" variant="primary" loading={submitting}>
            Registrar contato
          </Button>
        </>
      }
    >
      <form id="recovery-form" onSubmit={onSubmit} className="space-y-4">
        <NoSendingNotice />

        {session.recoveryNotifiedAt && (
          <p className="rounded-lg border border-line bg-app px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
            Já houve contato em <strong className="text-ink">{formatDateTime(session.recoveryNotifiedAt)}</strong>{' '}
            por <strong className="text-ink">{recoveryChannelLabel(session.recoveryChannel)}</strong>. Registrar
            de novo substitui essa marcação pela data de agora.
          </p>
        )}

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink">Canal usado</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHANNELS.map((option) => {
              const active = channel === option.value;
              return (
                <label
                  key={option.value}
                  className={cx(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2.5 text-[13px] font-semibold transition-colors',
                    active
                      ? 'border-accent bg-accent/10 text-[#0369A1]'
                      : 'border-line bg-surface text-ink-muted hover:bg-app'
                  )}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={option.value}
                    checked={active}
                    onChange={() => setChannel(option.value)}
                    className="sr-only"
                  />
                  {option.icon}
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field
          label="Observação"
          htmlFor="recovery-note"
          optional
          hint="Fica no histórico do checkout, junto do evento. Máximo de 500 caracteres."
        >
          <textarea
            id="recovery-note"
            value={note}
            maxLength={500}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: falei com o Marcos, vai decidir com o sócio até sexta."
            className={`${inputClass} resize-y`}
          />
        </Field>

        {(session.email || session.phone) && (
          <p className="text-xs leading-relaxed text-ink-subtle">
            Contato do lead:{' '}
            {session.email && <span className="font-medium text-ink-muted">{session.email}</span>}
            {session.email && session.phone && ' · '}
            {session.phone && <span className="money text-ink-muted">{session.phone}</span>}
          </p>
        )}

        {error && (
          <p role="alert" className="text-[13px] font-medium text-[#B91C1C]">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default RecoveryModal;
