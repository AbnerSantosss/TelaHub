import { lookup as dnsLookup, LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { LookupFunction } from 'node:net';

/**
 * Busca HTTP com defesa contra SSRF.
 *
 * Por que este arquivo existe: `/api/proxy/rss` recebe uma URL do cliente e a
 * busca a partir do servidor. Sem guarda, qualquer visitante consegue fazer o
 * backend falar com serviços internos que ele não alcança de fora — `db:5432`,
 * `169.254.169.254` (metadados de nuvem), outros containers da rede
 * `telahub_net`, `localhost`.
 *
 * A rota é pública **de propósito**: o widget de RSS roda no player, que é uma
 * TV pareada sem sessão de usuário. Exigir JWT quebraria o produto. Então a
 * defesa não é autenticação, e sim **impedir que o destino seja um endereço
 * interno** — o que sobra é um proxy que só alcança a internet pública, que o
 * próprio navegador do player já alcançaria.
 *
 * Três armadilhas que uma checagem ingênua não cobre e que estão tratadas aqui:
 *
 * 1. **DNS rebinding.** Validar `new URL(x).hostname` e depois chamar `fetch`
 *    deixa uma janela: o DNS pode responder um IP público na validação e um IP
 *    privado na conexão. Por isso a validação acontece dentro do `lookup` que o
 *    socket usa — é o mesmo resultado de DNS que vai ser conectado.
 * 2. **Redirect.** `fetch` segue redirects sozinho; um host público pode
 *    redirecionar para `http://169.254.169.254/`. Aqui cada salto é validado.
 * 3. **Resposta gigante.** Um feed de 2 GB derruba o processo. Há teto de bytes
 *    e de tempo.
 */

export class SsrfBlockedError extends Error {
  readonly code = 'SSRF_BLOCKED';
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

export class ResponseTooLargeError extends Error {
  readonly code = 'RESPONSE_TOO_LARGE';
  constructor(message: string) {
    super(message);
    this.name = 'ResponseTooLargeError';
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

const BLOCKED_V4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8], // "este host"
  ['10.0.0.0', 8], // privado
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (metadados de nuvem)
  ['172.16.0.0', 12], // privado
  ['192.0.0.0', 24], // IETF
  ['192.0.2.0', 24], // documentação
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // privado
  ['198.18.0.0', 15], // benchmark
  ['198.51.100.0', 24], // documentação
  ['203.0.113.0', 24], // documentação
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reservado (inclui 255.255.255.255)
];

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // não parseou: nega por segurança
  for (const [base, bits] of BLOCKED_V4_RANGES) {
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (baseValue & mask) >>> 0) return true;
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split('%')[0]; // remove zona (fe80::1%eth0)

  // IPv4-mapped / IPv4-compatible: ::ffff:127.0.0.1 alcança o loopback.
  const mapped = normalized.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);

  if (normalized === '::' || normalized === '::1') return true; // indefinido / loopback

  const head = normalized.split(':')[0];
  if (!head) return false;
  const group = parseInt(head, 16);
  if (Number.isNaN(group)) return true;

  if ((group & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((group & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((group & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/** Endereço que o servidor não pode alcançar em nome de um cliente. */
export function isBlockedAddress(ip: string): boolean {
  return ip.includes(':') ? isBlockedIpv6(ip) : isBlockedIpv4(ip);
}

/** Predicado que decide se um IP resolvido é proibido. */
export type AddressGuard = (ip: string) => boolean;

/**
 * `lookup` usado pelo socket: resolve o nome e descarta endereços internos.
 * Como o resultado devolvido aqui é exatamente o que o socket conecta, não há
 * janela entre validar e conectar (fecha o DNS rebinding).
 */
function makeGuardedLookup(isBlocked: AddressGuard): LookupFunction {
  return (hostname, options, callback) => {
    dnsLookup(hostname, { ...(options as object), all: true }, (err, addresses) => {
      if (err) {
        callback(err, '', 0);
        return;
      }
      const list = (Array.isArray(addresses) ? addresses : [addresses]) as LookupAddress[];
      const allowed = list.filter((entry) => !isBlocked(entry.address));
      if (allowed.length === 0) {
        callback(
          new SsrfBlockedError(`O host "${hostname}" resolve para um endereço de rede interna.`),
          '',
          0,
        );
        return;
      }
      if ((options as { all?: boolean }).all) {
        callback(null, allowed as never, 0);
        return;
      }
      callback(null, allowed[0].address, allowed[0].family);
    });
  };
}

/**
 * Allowlist opcional. Vazia = qualquer host público. Definir
 * `HTTP_PROXY_ALLOWED_HOSTS=g1.globo.com,feeds.bbci.co.uk` restringe a esses
 * hosts e seus subdomínios — recomendado para instalações que não precisam de
 * feed arbitrário.
 */
function allowedHostsFromEnv(): string[] {
  return (process.env.HTTP_PROXY_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isHostAllowed(hostname: string, allowList = allowedHostsFromEnv()): boolean {
  if (allowList.length === 0) return true;
  const host = hostname.toLowerCase();
  return allowList.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export interface SafeFetchOptions {
  /**
   * Substitui a checagem de endereço interno. **Só para teste** — permite
   * apontar para um servidor de loopback e exercitar redirect e teto de bytes.
   * Em produção nunca é passado, e o padrão (`isBlockedAddress`) vale.
   */
  addressGuard?: AddressGuard;
  /** Teto de bytes lidos do corpo. Padrão 2 MiB. */
  maxBytes?: number;
  /** Teto de tempo total, em ms. Padrão 10 s. */
  timeoutMs?: number;
  /** Quantos redirects seguir, cada um revalidado. Padrão 3. */
  maxRedirects?: number;
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  status: number;
  body: string;
  contentType: string;
  finalUrl: string;
}

function validateUrl(rawUrl: string, isBlocked: AddressGuard, allowList?: string[]): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('URL inválida.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError('Apenas http e https são suportados.');
  }
  if (!isHostAllowed(parsed.hostname, allowList)) {
    throw new SsrfBlockedError(`O host "${parsed.hostname}" não está na lista permitida.`);
  }

  // Quando o host já é um IP literal, o Node conecta direto e **não** chama o
  // `lookup` — a guarda de DNS passaria batida e `http://169.254.169.254/`
  // funcionaria. Por isso o literal é checado aqui, antes de conectar.
  // (URL guarda IPv6 entre colchetes: `[::1]`.)
  const literal = parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(literal) !== 0 && isBlocked(literal)) {
    throw new SsrfBlockedError(`O endereço "${literal}" é de rede interna.`);
  }

  return parsed;
}

/** GET com guarda de SSRF, teto de tamanho, timeout e redirects validados. */
export function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const addressGuard = options.addressGuard ?? isBlockedAddress;
  const guardedLookup = makeGuardedLookup(addressGuard);

  const attempt = (rawTarget: string, redirectsLeft: number): Promise<SafeFetchResult> =>
    new Promise((resolve, reject) => {
      let target: URL;
      try {
        target = validateUrl(rawTarget, addressGuard);
      } catch (error) {
        reject(error);
        return;
      }

      const transport = target.protocol === 'https:' ? https : http;
      const request = transport.request(
        target,
        {
          method: 'GET',
          lookup: guardedLookup,
          headers: options.headers ?? {},
          timeout: timeoutMs,
        },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location;

          if (status >= 300 && status < 400 && location) {
            response.resume(); // libera o socket
            if (redirectsLeft <= 0) {
              reject(new SsrfBlockedError('Excesso de redirecionamentos.'));
              return;
            }
            let next: string;
            try {
              next = new URL(location, target).toString();
            } catch {
              reject(new SsrfBlockedError('Redirecionamento para URL inválida.'));
              return;
            }
            resolve(attempt(next, redirectsLeft - 1));
            return;
          }

          const chunks: Buffer[] = [];
          let total = 0;
          response.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > maxBytes) {
              request.destroy();
              reject(new ResponseTooLargeError(`Resposta excede ${maxBytes} bytes.`));
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => {
            resolve({
              status,
              body: Buffer.concat(chunks).toString('utf8'),
              contentType: String(response.headers['content-type'] ?? ''),
              finalUrl: target.toString(),
            });
          });
          response.on('error', reject);
        },
      );

      request.on('timeout', () => {
        request.destroy(new Error('Tempo limite excedido ao buscar a URL.'));
      });
      request.on('error', reject);
      request.end();
    });

  return attempt(rawUrl, maxRedirects);
}
