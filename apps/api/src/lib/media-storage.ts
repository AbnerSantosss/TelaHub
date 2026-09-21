/**
 * Onde a mídia enviada pelos clientes é guardada (2026-09-18, INF-01).
 *
 * Antes: o `server.ts` abortava o boot em produção sem as 4 variáveis do R2, e
 * o `media.service` decidia sozinho pelo disco local quando faltava alguma.
 * Duas regras diferentes para a mesma pergunta — e o compose de produção, ao
 * ligar `NODE_ENV=production` sem R2, derrubava a API inteira no boot.
 *
 * Agora a pergunta tem UMA resposta, lida por quem precisa dela:
 *
 * `MEDIA_STORAGE`:
 * - `r2`    → exige as 4 variáveis do R2; faltando alguma, o boot aborta.
 * - `local` → disco (`apps/api/uploads`). Em produção, só com volume
 *             persistente — sem ele, cada deploy apaga as mídias.
 * - não definida → `r2` se as 4 variáveis existirem; senão `local`, com aviso.
 */

export type MediaStorageMode = 'r2' | 'local';

export const R2_ENV_VARS = ['R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET'] as const;

export interface MediaStorageResolution {
  mode: MediaStorageMode;
  /** `explicit` = veio de `MEDIA_STORAGE`; `auto` = deduzido das variáveis do R2. */
  source: 'explicit' | 'auto';
  missingR2Vars: string[];
  /** Mensagem para logar no boot (não impede subir). */
  warning?: string;
  /** Configuração impossível: quem sobe o servidor deve abortar. */
  fatal?: string;
}

export function resolveMediaStorage(env: NodeJS.ProcessEnv = process.env): MediaStorageResolution {
  const missingR2Vars = R2_ENV_VARS.filter((key) => !env[key]);
  const hasR2 = missingR2Vars.length === 0;
  const isProd = env.NODE_ENV === 'production';
  const raw = (env.MEDIA_STORAGE ?? '').trim().toLowerCase();

  if (raw === 'r2') {
    return hasR2
      ? { mode: 'r2', source: 'explicit', missingR2Vars }
      : {
          mode: 'r2',
          source: 'explicit',
          missingR2Vars,
          fatal:
            `MEDIA_STORAGE=r2, mas faltam variáveis do R2: ${missingR2Vars.join(', ')}. ` +
            'Configure-as ou use MEDIA_STORAGE=local com volume persistente.',
        };
  }

  if (raw === 'local') {
    return {
      mode: 'local',
      source: 'explicit',
      missingR2Vars,
      warning: isProd
        ? 'Mídia em disco local (MEDIA_STORAGE=local). Garanta um volume persistente em /app/uploads — sem ele, cada deploy apaga as mídias dos clientes.'
        : undefined,
    };
  }

  if (raw !== '') {
    return {
      mode: 'local',
      source: 'explicit',
      missingR2Vars,
      fatal: `MEDIA_STORAGE="${env.MEDIA_STORAGE}" inválido. Use "r2" ou "local".`,
    };
  }

  if (hasR2) return { mode: 'r2', source: 'auto', missingR2Vars };

  return {
    mode: 'local',
    source: 'auto',
    missingR2Vars,
    warning:
      (isProd ? 'PRODUÇÃO sem R2: ' : '') +
      `mídia em disco local (faltam ${missingR2Vars.join(', ')}). ` +
      'Defina MEDIA_STORAGE explicitamente para silenciar este aviso.',
  };
}

let cached: MediaStorageResolution | null = null;

/** Resolução memorizada do processo (o ambiente não muda depois do boot). */
export function getMediaStorage(): MediaStorageResolution {
  if (!cached) cached = resolveMediaStorage();
  return cached;
}

/** Só para testes. */
export function resetMediaStorageCache(): void {
  cached = null;
}
