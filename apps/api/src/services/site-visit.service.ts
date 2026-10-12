import { Prisma } from '@prisma/client';

import prisma from '../lib/prisma';
import { hashIp } from './checkout.service';

/**
 * Contagem própria de visitas — o denominador do funil.
 *
 * NÃO É ANALYTICS, e a diferença é o motivo de existir: o GA4 continua sendo a
 * ferramenta de mídia, mas ele **subconta** de propósito quem recusa cookie
 * (Consent Mode), enquanto leads, checkouts e pagamentos vêm do nosso banco.
 * Somar as duas fontes num funil só produz numerador e denominador de origens
 * diferentes — uma taxa de conversão que não significa nada e que ninguém
 * consegue refutar. Ver §2.7 do plano do backoffice.
 *
 * A tabela é AGREGADA no momento da escrita (um balde por dia × página ×
 * origem), não uma linha por visita: não existe id de pessoa, não existe
 * cookie, e nem a tabela nem o backup guardam algo que reconstitua a navegação
 * de alguém. O hash de IP do dedupe nem chega ao banco — vive 24 h em memória.
 */

/** Rótulo de origem ausente. O MESMO de `checkout.service`, para as tabelas casarem. */
export const SEM_ATRIBUICAO = '(sem atribuição)';

const PATH_MAX = 200;
const ORIGIN_MAX = 120;
const REFERRER_HOST_MAX = 120;

/**
 * Meia-noite UTC do dia da data. O balde é UTC, não America/Sao_Paulo.
 *
 * A consequência é conhecida e aceita: visita das 21h à meia-noite (BRT) cai no
 * dia seguinte. Aceita porque TODO o resto do funil (`Lead.createdAt`,
 * `CheckoutSession.startedAt`, `Payment.paidAt`) é timestamp UTC, e o relatório
 * compara visitas com esses campos dentro do mesmo intervalo. Um balde em fuso
 * local com um filtro em UTC daria diferença de até 3 h nas bordas do período —
 * erro pequeno, constante e invisível, que é a pior espécie.
 */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** `2026-09-09` a partir de um `Date`: chave de dia e formato de saída da API. */
export function utcDayKey(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/**
 * Caminho canônico da página, SEM query string.
 *
 * A query string é cortada por privacidade, não por estética: link de campanha
 * e link de recuperação carregam e-mail, token e telefone (`?email=...`,
 * `?t=<publicToken>`), e guardar isso numa tabela de contagem transformaria um
 * contador anônimo em base de dado pessoal — com retenção eterna, porque o
 * balde nunca expira.
 *
 * Também colapsa a barra final: `/planos` e `/planos/` são a MESMA página, e
 * mantê-las separadas divide em duas a linha da página mais visitada.
 */
export function normalizePath(raw: string | null | undefined): string {
  if (!raw) return '/';
  let value = raw.trim();
  if (!value) return '/';

  // O site às vezes manda `location.href` inteiro em vez do pathname.
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return '/';
    }
  }

  const cut = value.search(/[?#]/);
  if (cut >= 0) value = value.slice(0, cut);
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);

  return value.slice(0, PATH_MAX) || '/';
}

/**
 * SÓ o host do referrer — nunca a URL inteira.
 *
 * O referrer de uma busca ou de uma rede social vem com o termo pesquisado e
 * com ids de sessão na query (`?q=...`, `?fbclid=...`). Para responder "de onde
 * vieram as visitas", `google.com` basta; a URL completa seria dado de terceiro
 * guardado sem necessidade nenhuma.
 *
 * `www.` sai fora para `www.google.com` e `google.com` não virarem duas linhas
 * na tabela de origem.
 */
export function referrerHostOf(raw: string | null | undefined): string {
  if (!raw) return '';
  const value = raw.trim();
  if (!value) return '';

  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, '').slice(0, REFERRER_HOST_MAX);
  } catch {
    return '';
  }
}

/**
 * Origem normalizada para a chave do balde.
 *
 * ⚠️ DEVOLVE STRING VAZIA, NUNCA `null`/`undefined`. As colunas de origem de
 * `SiteVisit` são `String @default("")` exatamente por isto: no Postgres,
 * `NULL` não é igual a `NULL` dentro de um índice único, então um balde com
 * origem nula NUNCA é reencontrado pelo `upsert` — cada visita direta criaria
 * uma linha nova, o total continuaria certo e a lista por origem encheria de
 * duplicatas. É a falha que não quebra nada e corrompe o relatório em silêncio.
 *
 * Não faz `toLowerCase()`: `Lead` e `CheckoutSession` guardam a UTM crua, e
 * baixar a caixa só aqui faria as três tabelas não casarem no relatório de
 * origem. A unificação de caixa acontece na LEITURA (`admin-metrics.service`).
 */
export function normalizeOrigin(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().slice(0, ORIGIN_MAX);
}

export interface RecordVisitInput {
  path?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  /** Decidido no SERVIDOR (ver `isFirstVisitToday`), nunca enviado pelo navegador. */
  isUnique?: boolean;
  /** Injetável só para teste; produção usa "agora". */
  at?: Date;
}

export interface VisitBucketKey {
  day: Date;
  path: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referrerHost: string;
}

export interface VisitSummary {
  period: { startDate: string; endDate: string };
  totals: { views: number; uniques: number };
  byDay: Array<{ day: string; views: number; uniques: number }>;
  byPath: Array<{ path: string; views: number; uniques: number }>;
  bySource: Array<{
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    referrerHost: string;
    views: number;
    uniques: number;
  }>;
}

// ─── Dedupe de visitante único (memória, 24 h) ───────────────────────────────

/**
 * Hashes de IP vistos hoje. Fica em MEMÓRIA de propósito.
 *
 * Persistir isto seria criar exatamente o que a decisão de não usar cookie
 * evitou: uma tabela que diz "este visitante voltou", ou seja, um identificador
 * de pessoa com retenção. Em memória, o conjunto morre com o processo e com a
 * virada do dia, e o pior que acontece é `uniques` ficar um pouco alto depois
 * de um deploy — número de tendência, não de cobrança.
 *
 * Consequência aceita: com mais de uma instância da API, cada uma tem seu
 * conjunto e `uniques` conta o mesmo visitante uma vez por instância. `views`
 * continua exato. Quando houver segunda réplica, mover para Redis — nunca para
 * o Postgres, que é onde isto voltaria a ser dado pessoal persistido.
 */
const seenToday = new Map<string, Set<string>>();

/**
 * Teto por dia. Sem ele, um dia de tráfego anômalo (ou um bot com IPs
 * rotativos) faria o conjunto crescer sem limite até derrubar o processo — e
 * derrubar a API para contar visita é trocar receita por métrica. Estourado o
 * teto, o excedente conta como "não único": `uniques` SUBESTIMA, que é o erro
 * seguro.
 */
const MAX_HASHES_PER_DAY = 200_000;

/**
 * `true` na primeira vez que este IP aparece hoje.
 *
 * O sal do hash é o de `hashIp` (`CHECKOUT_IP_SALT`/`JWT_SECRET`, a mesma
 * função do checkout — sem sal, um hash de IPv4 é reversível por força bruta em
 * segundos). A rotação DIÁRIA vem de a chave do mapa incluir o dia: na virada,
 * o conjunto inteiro é descartado e nenhum hash sobrevive para ligar o
 * visitante de ontem ao de hoje. Sem sal configurado, `hashIp` devolve `null` e
 * tudo conta como não único — preferimos subcontar a guardar IP cru.
 */
export function isFirstVisitToday(ip: string | null | undefined, at: Date = new Date()): boolean {
  const hash = hashIp(ip);
  if (!hash) return false;

  const key = utcDayKey(at);

  // Descartar os dias anteriores é o que concretiza o "só em memória por 24 h".
  for (const existing of seenToday.keys()) {
    if (existing !== key) seenToday.delete(existing);
  }

  let set = seenToday.get(key);
  if (!set) {
    set = new Set<string>();
    seenToday.set(key, set);
  }

  if (set.has(hash)) return false;
  if (set.size >= MAX_HASHES_PER_DAY) return false;

  set.add(hash);
  return true;
}

/** Só para teste: zera o conjunto de únicos entre casos. */
export function resetUniqueVisitorMemory(): void {
  seenToday.clear();
}

export class SiteVisitService {
  /**
   * Soma uma visita no balde `(dia, página, utm×3, host do referrer)`.
   *
   * `upsert` com incremento, e não `create`: a tabela é um contador. Uma linha
   * por visita daria a mesma resposta hoje e um `count(*)` de milhões daqui a
   * um ano, além de reintroduzir o dado bruto que agregar na escrita eliminou.
   */
  async record(input: RecordVisitInput): Promise<void> {
    const bucket: VisitBucketKey = {
      day: startOfUtcDay(input.at ?? new Date()),
      path: normalizePath(input.path),
      utmSource: normalizeOrigin(input.utmSource),
      utmMedium: normalizeOrigin(input.utmMedium),
      utmCampaign: normalizeOrigin(input.utmCampaign),
      referrerHost: referrerHostOf(input.referrer),
    };

    const uniques = input.isUnique ? 1 : 0;

    try {
      await prisma.siteVisit.upsert({
        where: { site_visit_bucket: bucket },
        create: { ...bucket, views: 1, uniques },
        update: { views: { increment: 1 }, uniques: { increment: uniques } },
      });
    } catch (error) {
      // P2002 = duas visitas simultâneas criaram o MESMO balde. O `upsert` do
      // Prisma não é atômico (consulta e só então insere), então dois pedidos no
      // mesmo milissegundo colidem na chave única; é corriqueiro em página de
      // campanha. A segunda tentativa sempre encontra a linha que a primeira
      // acabou de criar. Sem este retry a visita seria perdida em silêncio,
      // porque a rota engole o erro para não incomodar o visitante.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await prisma.siteVisit.update({
          where: { site_visit_bucket: bucket },
          data: { views: { increment: 1 }, uniques: { increment: uniques } },
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Visitas do período, por dia e por origem.
   *
   * As bordas são normalizadas para meia-noite UTC porque `day` é coluna
   * `date`: passar um `Date` com hora faria o Postgres comparar
   * `date >= timestamp` e o PRIMEIRO dia do período sumiria do relatório toda
   * vez que a tela mandasse "hoje às 14h" como início.
   */
  async summary(range: { startDate?: Date; endDate?: Date } = {}): Promise<VisitSummary> {
    const endDate = range.endDate ?? new Date();
    const startDate = range.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where = { day: { gte: startOfUtcDay(startDate), lte: startOfUtcDay(endDate) } };

    const [byDay, byPath, bySource] = await Promise.all([
      prisma.siteVisit.groupBy({
        by: ['day'],
        where,
        _sum: { views: true, uniques: true },
        orderBy: { day: 'asc' },
      }),
      prisma.siteVisit.groupBy({
        by: ['path'],
        where,
        _sum: { views: true, uniques: true },
      }),
      prisma.siteVisit.groupBy({
        by: ['utmSource', 'utmMedium', 'utmCampaign', 'referrerHost'],
        where,
        _sum: { views: true, uniques: true },
      }),
    ]);

    const days = byDay.map((row) => ({
      day: utcDayKey(row.day),
      views: row._sum.views ?? 0,
      uniques: row._sum.uniques ?? 0,
    }));

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totals: {
        views: days.reduce((acc, row) => acc + row.views, 0),
        uniques: days.reduce((acc, row) => acc + row.uniques, 0),
      },
      byDay: days,
      byPath: byPath
        .map((row) => ({
          path: row.path,
          views: row._sum.views ?? 0,
          uniques: row._sum.uniques ?? 0,
        }))
        .sort((a, b) => b.views - a.views),
      bySource: bySource
        .map((row) => ({
          // Na LEITURA a string vazia vira rótulo legível; no banco ela continua
          // vazia, que é o que faz o balde somar (ver `normalizeOrigin`).
          utmSource: row.utmSource || SEM_ATRIBUICAO,
          utmMedium: row.utmMedium || SEM_ATRIBUICAO,
          utmCampaign: row.utmCampaign || SEM_ATRIBUICAO,
          referrerHost: row.referrerHost || SEM_ATRIBUICAO,
          views: row._sum.views ?? 0,
          uniques: row._sum.uniques ?? 0,
        }))
        .sort((a, b) => b.views - a.views),
    };
  }
}

export const siteVisitService = new SiteVisitService();
