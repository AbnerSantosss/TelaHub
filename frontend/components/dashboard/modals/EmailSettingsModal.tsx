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
  Check 
} from 'lucide-react';

interface EmailSettingsModalProps {
  open: boolean;
  onClose: () => void;
  smtpUser: string;
  setSmtpUser: (value: string) => void;
  smtpPass: string;
  setSmtpPass: (value: string) => void;
  smtpHasSavedPass: boolean;
  smtpTestResult: { ok: boolean; message: string } | null;
  smtpLoading: boolean;
  onTestSmtp: () => void;
  onSaveSmtp: (e: React.FormEvent) => void;
}

export const EmailSettingsModal: React.FC<EmailSettingsModalProps> = ({
  open,
  onClose,
  smtpUser,
  setSmtpUser,
  smtpPass,
  setSmtpPass,
  smtpHasSavedPass,
  smtpTestResult,
  smtpLoading,
  onTestSmtp,
  onSaveSmtp,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Settings className="text-[#38bdf8]" size={20} /> Configurações de E-mail
          </h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSaveSmtp} className="p-6 space-y-4">
          {/* Setup Guide */}
          <div className="bg-gray-950/40 border border-border rounded-xl p-4.5 space-y-3">
            <p className="text-[10px] text-accent font-black uppercase tracking-widest flex items-center gap-1.5 pl-0.5">
              <Mail size={12} className="text-accent" /> Guia de Configuração (Gmail SMTP)
            </p>

            <ol className="space-y-2 text-[11px] text-text-muted list-decimal list-inside pl-1 leading-relaxed">
              <li>
                Ative a <span className="text-text font-bold">Verificação em 2 Etapas</span> na sua Conta Google.
              </li>
              <li>
                Acesse <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink size={10} /></a>.
              </li>
              <li>
                Insira um nome identificador (ex: <code className="text-text bg-black/40 px-1.5 py-0.5 rounded font-mono text-[10px]">TelaHub</code>) e clique em <span className="text-text font-medium">Criar</span>.
              </li>
              <li>
                Copie a senha de <span className="text-success font-bold">16 dígitos</span> gerada e insira abaixo.
              </li>
            </ol>

            <p className="text-[9px] text-text-muted/60 italic pl-0.5 mt-2 leading-relaxed">
              *O envio utiliza criptografia TLS na porta padrão 587.
            </p>
          </div>

          {/* Cost Zero Benefit */}
          <div className="bg-success/5 border border-success/20 rounded-xl p-3.5 flex items-start gap-3">
            <CheckCircle className="text-success shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-success text-xs font-black uppercase tracking-wider">Conexão Direta (Custo Zero)</p>
              <p className="text-text-muted text-[11px] mt-1 leading-relaxed">
                Ao conectar seu próprio e-mail SMTP, você realiza disparos de convites e alertas de redefinição de forma <span className="text-success font-bold">100% gratuita</span>, sem taxas adicionais.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">E-mail de Envio</label>
            <Input
              type="email"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="seuenvio@gmail.com"
              className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-text-muted uppercase tracking-wider pl-0.5">Senha de Aplicativo</label>
            <Input
              type="password"
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder={smtpHasSavedPass ? '(senha salva — deixe vazio para manter)' : 'xxxx xxxx xxxx xxxx'}
              className="w-full bg-gray-950/40 border border-border text-text placeholder:text-text-muted/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl font-mono tracking-wider"
            />
          </div>

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
        </form>
      </DialogContent>
    </Dialog>
  );
};
