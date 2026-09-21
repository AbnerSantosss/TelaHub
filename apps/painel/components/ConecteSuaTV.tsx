import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Tv } from 'lucide-react';

import { getDevices, getDisplays, linkDevice, saveDisplay } from '../services/storage';
import { getActiveOrganizationId, getApiErrorMessage } from '../libs/api';
import { EVENT, META_EVENT, track } from '../libs/tracking';
import type { Device, Display } from '../types';
// tokens e efeitos do tema claro, antes do CSS da tela
import './claro.css';
import './ConecteSuaTV.css';

// =============================================================================
// GERADOR DE QR CODE — modo byte, nível de correção M, versões 1 a 10.
//
// POR QUE ESCREVER ISTO À MÃO em vez de instalar `qrcode`:
//   • o painel não tem nenhuma lib de QR no `package.json` e adicionar
//     dependência exige rebuild da imagem Docker + `npm ci` no deploy;
//   • a alternativa comum (`<img src="https://api.qrserver.com/...">`) manda o
//     endereço do player de um CLIENTE para um serviço de terceiro a cada
//     visita, e some quando o serviço cai — num passo de ATIVAÇÃO, que é a
//     métrica que decide a conta;
//   • script de CDN está proibido pelo próprio pedido.
//
// A implementação segue a ISO/IEC 18004. Nível M (recupera ~15%) porque o QR é
// lido de uma tela, muitas vezes fotografado de lado — L erra demais.
// Versões até 10 (57×57) cobrem 213 caracteres, ordens de grandeza acima de
// qualquer URL de player.
// =============================================================================

/** [códigos de correção por bloco, blocos G1, dados G1, blocos G2, dados G2]. */
const QR_EC_M: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [10, 1, 16, 0, 0], // v1
  [16, 1, 28, 0, 0], // v2
  [26, 1, 44, 0, 0], // v3
  [18, 2, 32, 0, 0], // v4
  [24, 2, 43, 0, 0], // v5
  [16, 4, 27, 0, 0], // v6
  [18, 4, 31, 0, 0], // v7
  [22, 2, 38, 2, 39], // v8
  [22, 3, 36, 2, 37], // v9
  [26, 4, 43, 1, 44], // v10
];

/** Centros dos padrões de alinhamento por versão. */
const QR_ALINHAMENTO: ReadonlyArray<readonly number[]> = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** Informação de versão (BCH 18 bits) — obrigatória a partir da versão 7. */
const QR_BITS_VERSAO: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

/** Informação de formato (15 bits) para o nível M, por máscara 0..7. */
const QR_BITS_FORMATO_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

// Tabelas do corpo de Galois GF(256), polinômio primitivo 0x11d.
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];

const polyMul = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) out[i + j] ^= gfMul(a[i], b[j]);
  }
  return out;
};

/** Polinômio gerador de Reed-Solomon de grau `grau`. */
const rsGerador = (grau: number): Uint8Array => {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < grau; i += 1) poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]));
  return poly;
};

/** Resto da divisão — os códigos de correção do bloco. */
const rsCodigos = (dados: Uint8Array, quantidade: number): Uint8Array => {
  const gerador = rsGerador(quantidade);
  const resto = new Uint8Array(quantidade);
  for (let n = 0; n < dados.length; n += 1) {
    const fator = dados[n] ^ resto[0];
    resto.copyWithin(0, 1);
    resto[quantidade - 1] = 0;
    for (let i = 0; i < quantidade; i += 1) resto[i] ^= gfMul(gerador[i + 1], fator);
  }
  return resto;
};

export interface QrMatriz {
  size: number;
  modules: boolean[][];
}

const MASCARAS: ReadonlyArray<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
  (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
];

/** Penalidade da norma: quanto MENOR, mais fácil o leitor acerta. */
const qrPenalidade = (m: boolean[][], size: number): number => {
  let total = 0;

  // Regra 1 — sequências de 5 ou mais módulos da mesma cor.
  const sequencias = (leitura: (i: number, j: number) => boolean) => {
    for (let a = 0; a < size; a += 1) {
      let cor = leitura(a, 0);
      let tamanho = 1;
      for (let b = 1; b < size; b += 1) {
        const atual = leitura(a, b);
        if (atual === cor) {
          tamanho += 1;
        } else {
          if (tamanho >= 5) total += tamanho - 2;
          cor = atual;
          tamanho = 1;
        }
      }
      if (tamanho >= 5) total += tamanho - 2;
    }
  };
  sequencias((r, c) => m[r][c]);
  sequencias((c, r) => m[r][c]);

  // Regra 2 — blocos 2×2 de uma cor só.
  for (let r = 0; r + 1 < size; r += 1) {
    for (let c = 0; c + 1 < size; c += 1) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) total += 3;
    }
  }

  // Regra 3 — padrão parecido com o localizador (1:1:3:1:1 + 4 claros).
  const padrao = [true, false, true, true, true, false, true, false, false, false, false];
  const invertido = [...padrao].reverse();
  const casa = (leitura: (i: number) => boolean, inicio: number, alvo: boolean[]) =>
    alvo.every((valor, i) => leitura(inicio + i) === valor);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c + 11 <= size; c += 1) {
      const leitura = (i: number) => m[r][i];
      if (casa(leitura, c, padrao) || casa(leitura, c, invertido)) total += 40;
    }
  }
  for (let c = 0; c < size; c += 1) {
    for (let r = 0; r + 11 <= size; r += 1) {
      const leitura = (i: number) => m[i][c];
      if (casa(leitura, r, padrao) || casa(leitura, r, invertido)) total += 40;
    }
  }

  // Regra 4 — desequilíbrio entre claro e escuro.
  let escuros = 0;
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (m[r][c]) escuros += 1;
  const proporcao = (escuros * 100) / (size * size);
  total += Math.floor(Math.abs(proporcao - 50) / 5) * 10;

  return total;
};

/**
 * Monta a matriz do QR para `texto`.
 * Devolve `null` quando o texto não cabe na versão 10 — nesse caso a tela
 * simplesmente não mostra QR (o endereço grande continua lá).
 */
export const construirQr = (texto: string): QrMatriz | null => {
  const bytes = new TextEncoder().encode(texto);

  let versao = 0;
  let totalDados = 0;
  for (let v = 1; v <= 10; v += 1) {
    const [, blocos1, dados1, blocos2, dados2] = QR_EC_M[v - 1];
    const capacidade = blocos1 * dados1 + blocos2 * dados2;
    // Indicador de tamanho: 8 bits até a versão 9, 16 bits da 10 em diante.
    const cabecalho = 4 + (v < 10 ? 8 : 16);
    if (cabecalho + bytes.length * 8 <= capacidade * 8) {
      versao = v;
      totalDados = capacidade;
      break;
    }
  }
  if (!versao) return null;

  // ── Fluxo de bits: modo byte + tamanho + dados + terminador + enchimento ──
  const bits: number[] = [];
  const empurrar = (valor: number, tamanho: number) => {
    for (let i = tamanho - 1; i >= 0; i -= 1) bits.push((valor >>> i) & 1);
  };
  empurrar(0b0100, 4);
  empurrar(bytes.length, versao < 10 ? 8 : 16);
  for (const b of bytes) empurrar(b, 8);
  const capacidadeBits = totalDados * 8;
  for (let i = 0; i < 4 && bits.length < capacidadeBits; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dados = new Uint8Array(totalDados);
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    dados[i / 8] = byte;
  }
  for (let i = bits.length / 8, n = 0; i < totalDados; i += 1, n += 1) {
    dados[i] = n % 2 === 0 ? 0xec : 0x11;
  }

  // ── Blocos + correção de erro, intercalados como manda a norma ────────────
  const [ecPorBloco, b1, d1, b2, d2] = QR_EC_M[versao - 1];
  const blocosDados: Uint8Array[] = [];
  const blocosEc: Uint8Array[] = [];
  let cursor = 0;
  for (let i = 0; i < b1 + b2; i += 1) {
    const tamanho = i < b1 ? d1 : d2;
    const bloco = dados.subarray(cursor, cursor + tamanho);
    cursor += tamanho;
    blocosDados.push(bloco);
    blocosEc.push(rsCodigos(bloco, ecPorBloco));
  }
  const codigos: number[] = [];
  const maiorBloco = Math.max(d1, d2);
  for (let i = 0; i < maiorBloco; i += 1) {
    for (const bloco of blocosDados) if (i < bloco.length) codigos.push(bloco[i]);
  }
  for (let i = 0; i < ecPorBloco; i += 1) {
    for (const bloco of blocosEc) codigos.push(bloco[i]);
  }

  // ── Matriz: padrões fixos ────────────────────────────────────────────────
  const size = versao * 4 + 17;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const fixo: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const marcar = (r: number, c: number, ligado: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    mod[r][c] = ligado;
    fixo[r][c] = true;
  };

  const localizador = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const anel = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const nucleo = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        marcar(r0 + dr, c0 + dc, anel || nucleo);
      }
    }
  };
  localizador(0, 0);
  localizador(0, size - 7);
  localizador(size - 7, 0);

  for (let i = 8; i < size - 8; i += 1) {
    marcar(6, i, i % 2 === 0);
    marcar(i, 6, i % 2 === 0);
  }

  const centros = QR_ALINHAMENTO[versao - 1];
  for (const r of centros) {
    for (const c of centros) {
      const sobreLocalizador =
        (r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8);
      if (sobreLocalizador) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          marcar(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // Áreas de formato reservadas agora, preenchidas depois de escolher a máscara.
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      marcar(8, i, false);
      marcar(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    marcar(8, size - 1 - i, false);
    marcar(size - 1 - i, 8, false);
  }
  // Módulo sempre escuro — depois das reservas, senão seria sobrescrito.
  marcar(size - 8, 8, true);

  if (versao >= 7) {
    const bitsVersao = QR_BITS_VERSAO[versao];
    for (let i = 0; i < 18; i += 1) {
      const ligado = ((bitsVersao >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      marcar(size - 11 + b, a, ligado);
      marcar(a, size - 11 + b, ligado);
    }
  }

  // ── Dados em ziguezague, da direita para a esquerda ──────────────────────
  const fluxo: number[] = [];
  for (const codigo of codigos) {
    for (let i = 7; i >= 0; i -= 1) fluxo.push((codigo >>> i) & 1);
  }
  let indice = 0;
  let subindo = true;
  for (let direita = size - 1; direita >= 1; direita -= 2) {
    // A coluna 6 é o padrão de tempo vertical e não recebe dados.
    if (direita === 6) direita = 5;
    for (let passo = 0; passo < size; passo += 1) {
      const r = subindo ? size - 1 - passo : passo;
      for (const c of [direita, direita - 1]) {
        if (fixo[r][c]) continue;
        // Bits que sobram (bits de resto da versão) ficam claros: é o previsto.
        mod[r][c] = indice < fluxo.length ? fluxo[indice] === 1 : false;
        indice += 1;
      }
    }
    subindo = !subindo;
  }

  // ── Máscara: testa as 8 e fica com a de menor penalidade ─────────────────
  const escreverFormato = (matriz: boolean[][], mascara: number) => {
    const formato = QR_BITS_FORMATO_M[mascara];
    for (let i = 0; i < 15; i += 1) {
      const ligado = ((formato >>> i) & 1) === 1;
      if (i < 6) matriz[i][8] = ligado;
      else if (i === 6) matriz[7][8] = ligado;
      else if (i === 7) matriz[8][8] = ligado;
      else if (i === 8) matriz[8][7] = ligado;
      else matriz[8][14 - i] = ligado;

      if (i < 8) matriz[8][size - 1 - i] = ligado;
      else matriz[size - 15 + i][8] = ligado;
    }
    matriz[size - 8][8] = true;
  };

  let melhor: boolean[][] | null = null;
  let melhorNota = Number.POSITIVE_INFINITY;
  for (let mascara = 0; mascara < 8; mascara += 1) {
    const teste = mod.map((linha) => [...linha]);
    const aplicar = MASCARAS[mascara];
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!fixo[r][c] && aplicar(r, c)) teste[r][c] = !teste[r][c];
      }
    }
    escreverFormato(teste, mascara);
    const nota = qrPenalidade(teste, size);
    if (nota < melhorNota) {
      melhorNota = nota;
      melhor = teste;
    }
  }

  return melhor ? { size, modules: melhor } : null;
};

/** Desenha o QR num `<canvas>` com módulos de tamanho inteiro (sem borrão). */
const QrCode: React.FC<{ valor: string; lado?: number }> = ({ valor, lado = 176 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const qr = construirQr(valor);
    const ctx = canvas.getContext('2d');
    if (!qr || !ctx) {
      setFalhou(true);
      return;
    }
    setFalhou(false);

    // Zona de silêncio de 4 módulos: sem ela muitos leitores nem tentam.
    const silencio = 4;
    const modulos = qr.size + silencio * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Escala inteira de propósito: módulo com fração de pixel vira borrão e o
    // leitor erra justamente na foto tirada de longe, que é o caso real.
    const escala = Math.max(2, Math.floor((lado * dpr) / modulos));
    const pixels = modulos * escala;

    canvas.width = pixels;
    canvas.height = pixels;
    canvas.style.width = `${pixels / dpr}px`;
    canvas.style.height = `${pixels / dpr}px`;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pixels, pixels);
    ctx.fillStyle = '#0a1223';
    for (let r = 0; r < qr.size; r += 1) {
      for (let c = 0; c < qr.size; c += 1) {
        if (qr.modules[r][c]) {
          ctx.fillRect((c + silencio) * escala, (r + silencio) * escala, escala, escala);
        }
      }
    }
  }, [valor, lado]);

  if (falhou) {
    return (
      <p className="ctv-qr-legenda">
        Não foi possível desenhar o código de leitura aqui. Use o endereço ao lado.
      </p>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="ctv-qr-canvas"
      role="img"
      aria-label={`Código de leitura para o endereço ${valor}`}
    />
  );
};

// =============================================================================
// TELA "CONECTE SUA TV"
// =============================================================================

/** Guia curto por aparelho. Sem jargão e sem passo que dependa de loja de app. */
const GUIA_APARELHOS: ReadonlyArray<{ nome: string; passos: string[] }> = [
  {
    nome: 'Android TV / Google TV',
    passos: [
      'Abra o navegador da TV (Chrome ou Puffin, se já estiver instalado).',
      'Digite o endereço acima com o controle remoto.',
      'O código de 6 caracteres aparece na tela.',
    ],
  },
  {
    nome: 'Fire TV Stick',
    passos: [
      'Abra o navegador Silk, que já vem no aparelho.',
      'Digite o endereço acima.',
      'Anote o código que aparecer.',
    ],
  },
  {
    nome: 'Chromecast',
    passos: [
      'Abra o endereço no Chrome do computador.',
      'No menu do Chrome, escolha Transmitir e selecione a TV.',
      'Transmita a aba inteira para a imagem ocupar a tela.',
    ],
  },
  {
    nome: 'Computador ligado na TV',
    passos: [
      'Ligue o computador na TV pelo cabo HDMI.',
      'Abra o endereço no navegador e aperte F11 para tela cheia.',
      'É a forma mais estável quando a TV é antiga.',
    ],
  },
  {
    nome: 'Navegador da própria TV',
    passos: [
      'Samsung, LG e Philips têm navegador na lista de aplicativos.',
      'Digite o endereço acima na barra de endereços.',
      'Se o navegador não abrir vídeos, use um dos aparelhos acima.',
    ],
  },
];

export interface ConecteSuaTVProps {
  /**
   * `primeiro-passo` = conta sem nenhuma TV, exibido no lugar do painel.
   * `pagina` = aberto de propósito depois, pela rota `/conecte-sua-tv`.
   */
  variante?: 'primeiro-passo' | 'pagina';
  /**
   * Só existe no primeiro passo: sai desta tela e mostra o painel — tanto no
   * "fazer isso depois" quanto no "ir para o painel" da confirmação. Quem
   * decide sair é sempre a pessoa; a tela NÃO some sozinha ao conectar, senão
   * a confirmação apareceria e sumiria antes de ser lida.
   */
  onSair?: () => void;
  /** Avisa o painel para recarregar a lista de telas/TVs. */
  onConectado?: () => void;
}

const gerarId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Contexto sem crypto: cai no gerador abaixo.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const ConecteSuaTV: React.FC<ConecteSuaTVProps> = ({
  variante = 'pagina',
  onSair,
  onConectado,
}) => {
  const navigate = useNavigate();

  const [displays, setDisplays] = useState<Display[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [codigo, setCodigo] = useState('');
  const [nomeTv, setNomeTv] = useState('');
  const [displayId, setDisplayId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [conectado, setConectado] = useState(false);
  const [idConectado, setIdConectado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  /**
   * Endereço que a pessoa vai DIGITAR no controle remoto da TV.
   * Montado da própria origem para funcionar em qualquer domínio onde o painel
   * esteja publicado — endereço fixo em constante já quebrou aqui quando o
   * painel mudou de host.
   */
  const enderecoPlayer = useMemo(
    () => `${window.location.origin}${window.location.pathname}#/player`,
    []
  );

  const carregar = useCallback(async () => {
    const [listaDisplays, listaDevices] = await Promise.all([getDisplays(), getDevices()]);
    setDisplays(listaDisplays);
    setDevices(listaDevices);
    setDisplayId((atual) => atual || listaDisplays[0]?.id || '');
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar().catch(() => setCarregando(false));
  }, [carregar]);

  /**
   * Estado ao vivo. O sinal que interessa depois do vínculo é `online`: é ele
   * que prova que a TV está de fato puxando conteúdo, e não só cadastrada.
   * 6 segundos porque a TV manda batida a cada minuto — mais rápido que isso
   * só gera requisição à toa.
   */
  useEffect(() => {
    const intervalo = setInterval(() => {
      getDevices()
        .then(setDevices)
        .catch(() => {
          // Falha de rede aqui não pode apagar a tela: mantém o último estado.
        });
    }, 6000);
    return () => clearInterval(intervalo);
  }, []);

  const tvsConectadas = devices.filter((d) => d.status === 'linked');
  const dispositivoConectado = idConectado
    ? devices.find((d) => d.id === idConectado) ?? null
    : null;

  const copiarEndereco = async () => {
    try {
      await navigator.clipboard.writeText(enderecoPlayer);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Área de transferência bloqueada (http sem TLS, permissão negada):
      // o endereço continua visível e selecionável na tela, então não há
      // motivo para assustar ninguém com um erro.
      window.prompt('Copie o endereço abaixo:', enderecoPlayer);
    }
  };

  const conectar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const codigoLimpo = codigo.trim().toUpperCase();
    const nomeLimpo = nomeTv.trim() || 'TV';
    if (!codigoLimpo) return;

    setEnviando(true);
    setErro(null);

    try {
      // Conta nova pode não ter nenhuma tela ainda, e `POST /devices/link`
      // exige uma. Criar aqui evita mandar a pessoa para outro lugar no meio
      // da ativação — que é exatamente onde ela desiste.
      let alvo = displayId;
      if (!alvo) {
        const nova: Display = {
          id: gerarId(),
          name: nomeLimpo,
          slug: `${nomeLimpo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
          pages: [{ id: `p${Date.now()}`, order: 1, duration: 15, layout: [] }],
          updatedAt: Date.now(),
          orientation: 'horizontal',
        };
        await saveDisplay(nova);
        alvo = nova.id;
      }

      await linkDevice(codigoLimpo, alvo, nomeLimpo);

      // Recarrega para descobrir o id do aparelho: `POST /devices/link` não
      // devolve o registro, e o id é o que identifica a ativação na medição.
      const atualizados = await getDevices();
      setDevices(atualizados);
      const encontrado =
        atualizados.find((d) => d.pairing_code === codigoLimpo && d.status === 'linked') ?? null;
      setIdConectado(encontrado?.id ?? null);

      // A ativação real do produto. `track` devolve o eventID de deduplicação
      // com a Conversions API; aqui não há chamada de servidor para repassá-lo,
      // então o id é só do navegador mesmo.
      track({
        event: EVENT.DEVICE_LINKED,
        params: {
          org_id: getActiveOrganizationId() ?? null,
          device_id: encontrado?.id ?? null,
        },
        metaEvent: META_EVENT.TELA_PAREADA,
      });

      setConectado(true);
      setCodigo('');
      await getDisplays().then(setDisplays).catch(() => undefined);
      onConectado?.();
    } catch (error) {
      setErro(
        getApiErrorMessage(
          error,
          'Não conseguimos conectar com esse código. Confira se ele ainda está na tela da TV.'
        )
      );
    } finally {
      setEnviando(false);
    }
  };

  // ── Confirmação ──────────────────────────────────────────────────────────
  if (conectado) {
    const noAr = dispositivoConectado?.online === true;
    return (
      <div className="ctv">
        <div className="ctv-wrap">
          <div className="ctv-sucesso">
            <span className="ctv-sucesso-selo" aria-hidden="true">
              <Check size={30} strokeWidth={3} />
            </span>
            <h1 className="ctv-sucesso-titulo">TV conectada</h1>
            <p className="ctv-sucesso-texto">
              {noAr
                ? 'A TV já está exibindo o conteúdo. O que você publicar no painel aparece nela em segundos.'
                : 'Pronto. Assim que a TV terminar de carregar, o conteúdo começa a aparecer sozinho. Pode levar alguns segundos.'}
            </p>
            {/* A linha ao vivo só aparece quando sabemos QUAL aparelho observar.
                Sem o id, dizer "aguardando o sinal" seria um estado que nunca
                se resolve — pior do que não dizer nada. */}
            {idConectado && (
              <div className="ctv-estado ctv-estado-espera" aria-live="polite" style={{ justifyContent: 'center' }}>
                {!noAr && <span className="ctv-ponto" aria-hidden="true" />}
                <span>
                  {noAr ? 'Sinal recebido: a TV está no ar.' : 'Aguardando o primeiro sinal da TV…'}
                </span>
              </div>
            )}
            <div className="ctv-acoes" style={{ justifyContent: 'center', marginTop: 18 }}>
              <button
                type="button"
                className="ctv-btn ctv-btn-primario"
                onClick={() => (variante === 'pagina' ? navigate('/') : onSair?.())}
              >
                Ir para o painel
              </button>
              <button
                type="button"
                className="ctv-btn ctv-btn-secundario"
                onClick={() => {
                  setConectado(false);
                  setIdConectado(null);
                  setNomeTv('');
                }}
              >
                Conectar outra TV
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Passo a passo ────────────────────────────────────────────────────────
  return (
    <div className="ctv">
      <div className="ctv-wrap">
        <header className="ctv-topo">
          <div>
            <h1 className="ctv-titulo">Conecte sua TV</h1>
            <p className="ctv-subtitulo">
              São dois passos: abrir um endereço na TV e digitar aqui o código que aparecer nela.
              Funciona com qualquer TV que já esteja na parede: condomínio, escritório, clínica, loja,
              academia.
            </p>
          </div>
          {variante === 'pagina' ? (
            <button type="button" className="ctv-btn ctv-btn-secundario" onClick={() => navigate('/')}>
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </button>
          ) : (
            onSair && (
              <button type="button" className="ctv-btn ctv-btn-texto" onClick={onSair}>
                Fazer isso depois
              </button>
            )
          )}
        </header>

        {/* Passo 1 — o endereço, em letras grandes, e o QR ao lado. */}
        <section className="ctv-cartao">
          <div className="ctv-passo">
            <span className="ctv-passo-num" aria-hidden="true">
              1
            </span>
            <h2 className="ctv-passo-titulo">Abra este endereço na TV</h2>
          </div>
          <p className="ctv-passo-apoio">
            Use o navegador da TV, do Fire Stick ou do aparelho ligado nela. Digite exatamente como
            está escrito.
          </p>

          <div className="ctv-endereco-linha">
            <div className="ctv-endereco-caixa">
              <p className="ctv-endereco-rotulo">Endereço para digitar na TV</p>
              <p className="ctv-endereco">{enderecoPlayer}</p>
              <div className="ctv-acoes">
                <button type="button" className="ctv-btn ctv-btn-secundario" onClick={copiarEndereco}>
                  {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copiado ? 'Endereço copiado' : 'Copiar endereço'}
                </button>
                <button
                  type="button"
                  className="ctv-btn ctv-btn-secundario"
                  onClick={() => window.open(enderecoPlayer, '_blank', 'noopener')}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  Abrir aqui para testar
                </button>
              </div>
            </div>

            <div className="ctv-qr-caixa">
              <QrCode valor={enderecoPlayer} />
              <p className="ctv-qr-legenda">
                Aponte a câmera do celular para abrir o mesmo endereço sem digitar.
              </p>
            </div>
          </div>
        </section>

        {/* Passo 2 — o código de 6 caracteres. */}
        <section className="ctv-cartao">
          <div className="ctv-passo">
            <span className="ctv-passo-num" aria-hidden="true">
              2
            </span>
            <h2 className="ctv-passo-titulo">Digite o código que apareceu na TV</h2>
          </div>
          <p className="ctv-passo-apoio">
            Assim que o endereço abre, a TV mostra um código de 6 caracteres. Ele é dessa TV e
            dessa vez.
          </p>

          <form className="ctv-form" onSubmit={conectar}>
            <div className="ctv-campo">
              <label className="ctv-rotulo" htmlFor="ctv-codigo">
                Código da TV
              </label>
              <input
                id="ctv-codigo"
                className="ctv-input ctv-input-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                placeholder="ABC123"
                required
              />
            </div>

            <div className="ctv-grid-2">
              <div className="ctv-campo">
                <label className="ctv-rotulo" htmlFor="ctv-nome">
                  Nome desta TV
                </label>
                <input
                  id="ctv-nome"
                  className="ctv-input"
                  value={nomeTv}
                  onChange={(e) => setNomeTv(e.target.value)}
                  placeholder="Recepção, Portaria, Vitrine…"
                />
                <span className="ctv-ajuda">
                  Serve para você reconhecer a TV depois, quando houver mais de uma.
                </span>
              </div>

              <div className="ctv-campo">
                {displays.length > 0 ? (
                  <>
                    <label className="ctv-rotulo" htmlFor="ctv-tela">
                      Conteúdo que vai aparecer
                    </label>
                    <select
                      id="ctv-tela"
                      className="ctv-select"
                      value={displayId}
                      onChange={(e) => setDisplayId(e.target.value)}
                    >
                      {displays.map((display) => (
                        <option key={display.id} value={display.id}>
                          {display.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <span className="ctv-rotulo">Conteúdo que vai aparecer</span>
                    <span className="ctv-ajuda">
                      {carregando
                        ? 'Carregando…'
                        : 'Você ainda não montou nenhum conteúdo. Vamos criar um em branco com o nome desta TV, e você edita depois no painel.'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {erro && (
              <p className="ctv-estado ctv-estado-erro" role="alert">
                {erro}
              </p>
            )}

            {!erro && (
              <p className="ctv-estado ctv-estado-espera" aria-live="polite">
                <span className="ctv-ponto" aria-hidden="true" />
                <span>
                  {tvsConectadas.length > 0
                    ? `Aguardando a TV conectar. Esta conta já tem ${tvsConectadas.length} ${tvsConectadas.length === 1 ? 'TV conectada' : 'TVs conectadas'}.`
                    : 'Aguardando a TV conectar. Deixe o endereço aberto na TV enquanto digita o código.'}
                </span>
              </p>
            )}

            <div className="ctv-acoes">
              <button
                type="submit"
                className="ctv-btn ctv-btn-primario"
                disabled={enviando || codigo.trim().length === 0}
              >
                {enviando ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Tv size={16} aria-hidden="true" />}
                {enviando ? 'Conectando…' : 'Conectar TV'}
              </button>
            </div>
          </form>
        </section>

        {/* Guia por aparelho. */}
        <section className="ctv-cartao">
          <div className="ctv-passo">
            <h2 className="ctv-passo-titulo">Onde abrir, por tipo de aparelho</h2>
          </div>
          <div className="ctv-guia">
            {GUIA_APARELHOS.map((aparelho) => (
              <article className="ctv-guia-item" key={aparelho.nome}>
                <h3 className="ctv-guia-nome">{aparelho.nome}</h3>
                <ol className="ctv-guia-passos">
                  {aparelho.passos.map((passo) => (
                    <li key={passo}>{passo}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <p className="ctv-nota" style={{ marginTop: 14 }}>
            A TV precisa ficar ligada e com internet. Se ela desligar, o conteúdo volta sozinho
            quando ela ligar de novo. Não precisa conectar outra vez.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ConecteSuaTV;
