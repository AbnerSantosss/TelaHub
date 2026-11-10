/**
 * Regras puras de "Agendar publicação", sem React e sem imports de runtime.
 *
 * Ficam separadas para o teste (`regrasDePublicacao.test.mjs`) transpilar este arquivo
 * sozinho e importar por data URL, no mesmo padrão de `editor/canvasGeometry.test.mjs`.
 */

export type Orientacao = 'horizontal' | 'vertical';

export interface TelaComOrientacao {
  id: string;
  orientation?: Orientacao;
}

export interface GrupoPorOrientacao {
  orientation: Orientacao;
  displayIds: string[];
}

/**
 * Separa as telas escolhidas por orientação. Tela sem orientação conta como horizontal,
 * que é o padrão do player. Grupo vazio não volta, e a ordem é sempre horizontal, vertical.
 * Dois grupos = duas publicações (uma por orientação), com o mesmo modelo.
 */
export function dividirPorOrientacao(telas: TelaComOrientacao[]): GrupoPorOrientacao[] {
  const deitadas: string[] = [];
  const emPe: string[] = [];
  const vistos = new Set<string>();
  for (const tela of telas) {
    if (!tela || !tela.id || vistos.has(tela.id)) continue;
    vistos.add(tela.id);
    if (tela.orientation === 'vertical') emPe.push(tela.id);
    else deitadas.push(tela.id);
  }
  const grupos: GrupoPorOrientacao[] = [];
  if (deitadas.length > 0) grupos.push({ orientation: 'horizontal', displayIds: deitadas });
  if (emPe.length > 0) grupos.push({ orientation: 'vertical', displayIds: emPe });
  return grupos;
}

export type EstadoDaPublicacao = 'no-ar' | 'agendada' | 'encerrada';

export interface PublicacaoComJanela {
  active: boolean;
  is_permanent?: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

const lerData = (valor: string | null | undefined): number | null => {
  if (!valor) return null;
  const ms = Date.parse(valor);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Estado mostrado no selo do cartão. Mesma regra do player da TV: antes do início não passa;
 * depois do fim só passa se for permanente. Publicação tirada do ar (`active: false`) conta
 * como encerrada.
 */
export function estadoDaPublicacao(publicacao: PublicacaoComJanela, agora: number): EstadoDaPublicacao {
  if (!publicacao.active) return 'encerrada';
  const inicio = lerData(publicacao.start_time);
  if (inicio !== null && agora < inicio) return 'agendada';
  if (publicacao.is_permanent) return 'no-ar';
  const fim = lerData(publicacao.end_time);
  if (fim !== null && agora > fim) return 'encerrada';
  return 'no-ar';
}

export const ROTULO_DO_ESTADO: Record<EstadoDaPublicacao, string> = {
  'no-ar': 'No ar agora',
  agendada: 'Agendada',
  encerrada: 'Encerrada',
};

/** "Todas as telas", "1 tela", "3 telas" ou "Nenhuma tela". */
export function descreverAlvo(quantidade: number, totalDeTelas: number): string {
  if (quantidade <= 0) return 'Nenhuma tela';
  if (totalDeTelas > 1 && quantidade >= totalDeTelas) return 'Todas as telas';
  return quantidade === 1 ? '1 tela' : `${quantidade} telas`;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** "31/10 14:00", na hora local do navegador. */
export function formatarDataHora(ms: number): string {
  const d = new Date(ms);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** Valor para `<input type="datetime-local">` ("2026-10-31T14:00"), na hora local. */
export function paraDataHoraLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** Texto da janela de horário no cartão da lista. */
export function descreverJanela(publicacao: PublicacaoComJanela): string {
  const inicio = lerData(publicacao.start_time);
  const fim = lerData(publicacao.end_time);
  if (publicacao.is_permanent || fim === null) {
    return inicio === null ? 'Até você tirar do ar' : `Desde ${formatarDataHora(inicio)}, até você tirar do ar`;
  }
  if (inicio === null) return `Até ${formatarDataHora(fim)}`;
  return `${formatarDataHora(inicio)} até ${formatarDataHora(fim)}`;
}

/** Confere a janela "Em data e hora marcadas". Devolve a mensagem de erro ou `null`. */
export function validarJanela(inicio: string, fim: string): string | null {
  const a = lerData(inicio);
  const b = lerData(fim);
  if (a === null) return 'Informe o dia e a hora de início.';
  if (b === null) return 'Informe o dia e a hora de fim.';
  if (b <= a) return 'O fim precisa ser depois do início.';
  return null;
}

/**
 * Mesmo valor de `DEVICE_ONLINE_THRESHOLD_MS` (`lib/deviceStatus.ts`) e de
 * `ONLINE_THRESHOLD_MS` na API. Repetido aqui porque este arquivo não pode ter
 * import de runtime (o teste o transpila sozinho). Se mudar lá, mude aqui.
 */
export const LIMITE_ONLINE_MS = 150_000;

/** Mesma regra da tela de status: online se algum aparelho da tela falou dentro do limite. */
export function telaEstaOnline(
  displayId: string,
  aparelhos: { display_id: string | null; last_seen: number }[],
  agora: number,
): boolean {
  return aparelhos.some(a => a.display_id === displayId && agora - a.last_seen < LIMITE_ONLINE_MS);
}
