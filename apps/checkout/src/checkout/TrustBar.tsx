// Barra de confiança do topo.
//
// Só entra aqui o que é VERIFICÁVEL. Não há contador de oferta (não existe prazo
// real numa assinatura mensal), nem depoimento, estrela ou número de clientes
// (o produto não tem clientes) — ver "Dois padrões da referência que NÃO vamos
// reproduzir" no DESIGN.md.
import { CalendarCheck, MonitorCheck, Unlock } from 'lucide-react';

const FACTS = [
  { icon: Unlock, text: 'Sem fidelidade e sem multa' },
  { icon: MonitorCheck, text: 'Cancelamento pelo próprio painel' },
  { icon: CalendarCheck, text: '7 dias para desistir (art. 49 do CDC)' },
];

export const TrustBar = () => (
  <div className="bg-nav text-white">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-4 py-2.5 sm:px-6">
      {FACTS.map(({ icon: Icon, text }) => (
        <p key={text} className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
          <Icon aria-hidden="true" size={13} className="shrink-0 text-success" />
          {text}
        </p>
      ))}
    </div>
  </div>
);
