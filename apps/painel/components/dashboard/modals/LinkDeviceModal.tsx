/**
 * ⚠️ SUBSTITUÍDO em 2026-09-05 — nada mais monta este modal.
 *
 * O vínculo de TV agora é a tela `components/ConecteSuaTV.tsx` (rota
 * `#/conecte-sua-tv` e primeiro passo de conta nova). O motivo é de ativação,
 * não de estética: aqui o endereço do player aparecia num `<Input readOnly>` de
 * 12 px dentro de um modal, junto com três campos obrigatórios — quem tinha que
 * DIGITAR aquilo no controle remoto da TV não conseguia nem ler. E TV conectada
 * é a métrica que decide se a mídia paga fecha a conta.
 *
 * O arquivo continua aqui, sem nenhum importador, porque outros agentes estão
 * mexendo no painel em paralelo e apagá-lo agora quebraria o build de quem
 * tivesse acabado de importá-lo. Sem importador ele não entra no pacote final.
 * Pode ser removido com segurança quando o painel estiver estável.
 */
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { Tv, X, Link as LinkIcon, Loader2, Copy, ExternalLink } from 'lucide-react';
import { Display } from '../../../types';

interface LinkDeviceModalProps {
  open: boolean;
  onClose: () => void;
  displays: Display[];
  linkCode: string;
  setLinkCode: (value: string) => void;
  linkName: string;
  setLinkName: (value: string) => void;
  selectedDisplayId: string;
  setSelectedDisplayId: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export const LinkDeviceModal: React.FC<LinkDeviceModalProps> = ({
  open,
  onClose,
  displays,
  linkCode,
  setLinkCode,
  linkName,
  setLinkName,
  selectedDisplayId,
  setSelectedDisplayId,
  onSubmit,
  loading,
}) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-borda">
          <DialogTitle className="font-bold text-lg flex items-center gap-2 text-tinta">
            <Tv className="text-marca" size={20} /> Conectar nova TV
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="size-11 md:size-8 rounded-lg text-tinta-3 hover:text-tinta" aria-label="Fechar">
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">
              Código de Pareamento (6 dígitos)
            </label>
            <Input
              type="text"
              maxLength={6}
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="Ex: AB12CD"
              className="w-full text-center text-xl font-bold bg-papel border border-borda-3 text-marca font-mono focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-ring/30 h-12 rounded-xl placeholder:text-tinta-3"
              required
            />
            <p className="text-[13px] text-text-muted pl-0.5">
              Insira o código exibido na tela da TV ao abrir o Player.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">
              Nome do Dispositivo
            </label>
            <Input
              type="text"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Ex: TV Copa, Totem Entrada..."
              className="w-full bg-papel border border-border text-text placeholder:text-tinta-3 focus-visible:border-marca focus-visible:ring-3 focus-visible:ring-ring/30 h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-tinta-2 pl-0.5">
              Tela Associada (Conteúdo Inicial)
            </label>
            <Select value={selectedDisplayId} onValueChange={setSelectedDisplayId}>
              <SelectTrigger className="w-full h-11 rounded-xl text-tinta">
                <SelectValue placeholder="Selecione uma Tela..." />
              </SelectTrigger>
              <SelectContent>
                {displays.map(display => (
                  <SelectItem key={display.id} value={display.id}>
                    {display.name} ({display.orientation === 'vertical' ? 'Vertical 9:16' : 'Horizontal 16:9'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2 p-3 rounded-xl bg-marca-fundo border border-borda space-y-2">
            <label className="block text-sm font-semibold text-marca">
              Link do Player
            </label>
            <p className="text-[13px] text-text-muted">
              Acesse este link no navegador da TV ou dispositivo para abrir o player e gerar o código de pareamento:
            </p>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={`${window.location.origin}${window.location.pathname}#/player`}
                className="w-full text-sm bg-papel border border-borda-3 text-tinta h-11 md:h-9 rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/player`);
                }}
                className="h-9 px-3 border border-border rounded-lg text-text-muted hover:text-text shrink-0 flex items-center gap-1"
                title="Copiar link"
              >
                <Copy size={14} />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open('#/player', '_blank')}
                className="h-11 md:h-9 px-3 border border-borda-2 bg-papel rounded-lg text-marca hover:border-marca shrink-0 flex items-center gap-1"
                title="Abrir em nova aba"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Abrir</span>
              </Button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 md:h-10 px-5 rounded-lg text-tinta-2 font-semibold hover:bg-papel-3 hover:text-tinta"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={loading || !linkCode || !linkName || !selectedDisplayId}
              className="h-11 md:h-10 px-6 rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LinkIcon size={16} />
              )}
              <span>Conectar TV</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
