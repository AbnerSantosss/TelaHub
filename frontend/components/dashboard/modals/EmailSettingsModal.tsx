import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Settings,
  X,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Check,
  AlertTriangle,
  Server
} from 'lucide-react';
import type { EmailProvider } from '../../../services/storage';

interface EmailSettingsModalProps {
  open: boolean;
  onClose: () => void;
  providers: EmailProvider[];
  provider: string;
  onSelectProvider: (id: string) => void;
  smtpHost: string;
  setSmtpHost: (value: string) => void;
  smtpPort: number;
  setSmtpPort: (value: number) => void;
  smtpSecure: boolean;
  setSmtpSecure: (value: boolean) => void;
  smtpUser: string;
  setSmtpUser: (value: string) => void;
  smtpPass: string;
  setSmtpPass: (value: string) => void;
  smtpFromEmail: string;
  setSmtpFromEmail: (value: string) => void;
  smtpFromName: string;
  setSmtpFromName: (value: string) => void;
  smtpSource: 'banco' | 'ambiente' | null;
  smtpHasSavedPass: boolean;
  smtpTestResult: { ok: boolean; message: string } | null;
  smtpLoading: boolean;
  onTestSmtp: () => void;
  onSaveSmtp: (e: React.FormEvent) => void;
}

const inputClass =
  'w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl';

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({
  open,
  onClose,
  providers,
  provider,
  onSelectProvider,
  smtpHost,
  setSmtpHost,
  smtpPort,
  setSmtpPort,
  smtpSecure,
  setSmtpSecure,
  smtpUser,
  setSmtpUser,
  smtpPass,
  setSmtpPass,
  smtpFromEmail,
  setSmtpFromEmail,
  smtpFromName,
  setSmtpFromName,
  smtpSource,
  smtpHasSavedPass,
  smtpTestResult,
  smtpLoading,
  onTestSmtp,
  onSaveSmtp,
}) => {
  const preset = providers.find((p) => p.id === provider);
  const isManual = provider === 'custom';
  // Provedores transacionais autenticam com usuário fixo (`apikey`, `resend`),
  // então o remetente precisa ser informado à parte.
  const needsFromEmail = !!preset?.fixedUser;

  const caixas = providers.filter((p) => p.kind === 'caixa');
  const transacionais = providers.filter((p) => p.kind === 'transacional');
  const manuais = providers.filter((p) => p.kind === 'manual');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <DialogTitle className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Settings className="text-[#38bdf8]" size={20} /> Configurações de E-mail
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSaveSmtp} className="p-6 space-y-4">
          {/* Origem da configuração em uso */}
          {smtpSource === 'ambiente' && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3.5 flex items-start gap-3">
              <Server className="text-accent shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-accent text-xs font-black uppercase tracking-wider">Usando o provedor padrão do sistema</p>
                <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                  Os envios já funcionam com a conta configurada na instalação. Salvar aqui substitui esse padrão
                  pela sua própria conta.
                </p>
              </div>
            </div>
          )}

          {/* Seletor de provedor */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Provedor de E-mail</label>
            <select
              value={provider}
              onChange={(e) => onSelectProvider(e.target.value)}
              className={`${inputClass} px-3 appearance-none`}
            >
              <optgroup label="Caixa de e-mail">
                {caixas.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </optgroup>
              <optgroup label="Serviço transacional (volume maior)">
                {transacionais.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </optgroup>
              <optgroup label="Outro">
                {manuais.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </optgroup>
            </select>
            {preset && !isManual && (
              <p className="text-[10px] text-text-muted/70 pl-0.5 font-mono">
                {preset.host}:{preset.port} · {preset.secure ? 'SSL/TLS' : 'STARTTLS'}
              </p>
            )}
          </div>

          {/* Ressalva do provedor — o que muda a decisão */}
          {preset?.warning && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="text-warning shrink-0 mt-0.5" size={16} />
              <p className="text-text-muted text-[11px] leading-relaxed">{preset.warning}</p>
            </div>
          )}

          {/* Onde obter a credencial */}
          {preset?.credentialsUrl && (
            <div className="bg-gray-950/40 border border-border rounded-xl p-4 space-y-2">
              <p className="text-[10px] text-accent font-black uppercase tracking-widest flex items-center gap-1.5 pl-0.5">
                <Mail size={12} className="text-accent" /> Onde obter a credencial
              </p>
              <a
                href={preset.credentialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-semibold inline-flex items-center gap-1 text-[11px] break-all"
              >
                {preset.credentialsUrl} <ExternalLink size={10} />
              </a>
            </div>
          )}

          {/* Host e porta — só no modo manual; nos presets são derivados */}
          {isManual && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Servidor (host)</label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.seuprovedor.com.br"
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Porta</label>
                <Input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          )}

          {isManual && (
            <label className="flex items-center gap-2 text-[11px] text-text-muted pl-0.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="accent-[#38bdf8] size-3.5"
              />
              Conexão SSL/TLS direta (porta 465). Deixe desmarcado para STARTTLS (587/2525).
            </label>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Usuário de Autenticação</label>
            <Input
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder={preset?.userHint || 'usuario@dominio.com'}
              className={inputClass}
              required
            />
            {preset?.userHint && (
              <p className="text-[10px] text-text-muted/70 pl-0.5 leading-relaxed">{preset.userHint}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Senha / Chave de API</label>
            <Input
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={smtpHasSavedPass ? '(senha salva — deixe vazio para manter)' : '••••••••••••'}
              className={`${inputClass} font-mono tracking-wider`}
            />
            {preset?.passHint && (
              <p className="text-[10px] text-text-muted/70 pl-0.5 leading-relaxed">{preset.passHint}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">
                E-mail Remetente {needsFromEmail && <span className="text-danger">*</span>}
              </label>
              <Input
                type="email"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder={needsFromEmail ? 'naoresponda@seudominio.com' : '(igual ao usuário)'}
                className={inputClass}
                required={needsFromEmail}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Nome Exibido</label>
              <Input
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="TelaHub"
                className={inputClass}
              />
            </div>
          </div>

          {needsFromEmail && (
            <p className="text-[10px] text-text-muted/70 pl-0.5 leading-relaxed">
              Este provedor autentica com o usuário fixo <code className="text-text bg-black/40 px-1 py-0.5 rounded font-mono">{preset?.fixedUser}</code>,
              então o remetente precisa ser um endereço verificado na conta.
            </p>
          )}

          {/* Test connection result */}
          {smtpTestResult && (
            <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-bold ${
              smtpTestResult.ok
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-danger/10 border-danger/30 text-danger'
            }`}>
              {smtpTestResult.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
              <span>{smtpTestResult.message}</span>
            </div>
          )}

          <div className="flex gap-3 justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onTestSmtp}
              disabled={smtpLoading || !smtpUser || (!smtpPass && !smtpHasSavedPass)}
              className="px-4 py-2.5 rounded-xl bg-gray-950/40 text-text border border-border hover:border-accent/40 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {smtpLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Testar Conexão
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={smtpLoading || !smtpUser || (!smtpPass && !smtpHasSavedPass)}
              className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={14} /> Salvar
            </Button>
          </div>

          <p className="text-[10px] text-text-muted/60 leading-relaxed pl-0.5">
            O teste verifica a conexão com a configuração <strong>já salva</strong>. Ao trocar de provedor,
            salve antes de testar.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
