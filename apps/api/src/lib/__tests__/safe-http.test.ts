import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  isBlockedAddress,
  isHostAllowed,
  safeFetch,
  SsrfBlockedError,
  ResponseTooLargeError,
} from '../safe-http';

describe('isBlockedAddress', () => {
  it('bloqueia os endereços que um SSRF procura', () => {
    const bloqueados = [
      '127.0.0.1', // loopback
      '127.1.2.3',
      '0.0.0.0',
      '10.0.0.5', // rede privada
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // metadados de nuvem — o alvo clássico
      '100.64.0.1', // CGNAT
      '224.0.0.1', // multicast
      '255.255.255.255',
      '::1', // loopback v6
      '::',
      'fc00::1', // unique-local v6
      'fd12:3456::1',
      'fe80::1', // link-local v6
      'ff02::1', // multicast v6
      '::ffff:127.0.0.1', // v4 mapeado em v6 — atalho fácil de esquecer
      '::ffff:169.254.169.254',
    ];

    for (const ip of bloqueados) {
      expect(isBlockedAddress(ip), `${ip} deveria ser bloqueado`).toBe(true);
    }
  });

  it('libera endereços públicos', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '200.147.67.142', '2606:4700::1111']) {
      expect(isBlockedAddress(ip), `${ip} deveria ser liberado`).toBe(false);
    }
  });

  it('bloqueia 172.15/172.32 fora do bloco privado corretamente', () => {
    // 172.16.0.0/12 vai de 172.16 a 172.31 — as bordas são onde a máscara erra.
    expect(isBlockedAddress('172.15.0.1')).toBe(false);
    expect(isBlockedAddress('172.32.0.1')).toBe(false);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
    expect(isBlockedAddress('172.31.0.1')).toBe(true);
  });
});

describe('isHostAllowed', () => {
  it('libera tudo quando a allowlist está vazia', () => {
    expect(isHostAllowed('qualquer.com', [])).toBe(true);
  });

  it('aceita o host e seus subdomínios quando a allowlist está definida', () => {
    const lista = ['globo.com'];
    expect(isHostAllowed('globo.com', lista)).toBe(true);
    expect(isHostAllowed('g1.globo.com', lista)).toBe(true);
    expect(isHostAllowed('outro.com', lista)).toBe(false);
    // "naoglobo.com" termina com "globo.com" em texto, mas não é subdomínio.
    expect(isHostAllowed('naoglobo.com', lista)).toBe(false);
  });
});

describe('safeFetch', () => {
  it('recusa URL de loopback', async () => {
    await expect(safeFetch('http://127.0.0.1:5432/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('recusa o endpoint de metadados de nuvem', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
  });

  it('recusa "localhost" — o nome resolve para loopback', async () => {
    await expect(safeFetch('http://localhost:3001/api/health')).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
  });

  it('recusa protocolos que não são http/https', async () => {
    await expect(safeFetch('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(safeFetch('gopher://exemplo.com/')).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('recusa URL malformada', async () => {
    await expect(safeFetch('nao-e-url')).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});

/**
 * Redirect é a via de escape mais fácil de esquecer: o host inicial é público,
 * passa na validação, e manda o servidor para dentro da rede interna.
 */
describe('safeFetch com servidor local', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect-interno') {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
        res.end();
        return;
      }
      if (req.url === '/gigante') {
        res.writeHead(200, { 'content-type': 'application/xml' });
        // 5 MiB contra um teto de 1 MiB.
        res.end('x'.repeat(5 * 1024 * 1024));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/xml' });
      res.end('<rss><channel><title>ok</title></channel></rss>');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  /**
   * Guarda de teste: libera o loopback (para o servidor local acima responder)
   * e mantém bloqueado o alvo clássico de metadados. Assim o primeiro salto
   * passa e o redirect precisa ser barrado pela revalidação — que é justamente
   * o que este teste existe para provar.
   */
  const permiteLoopbackBloqueiaMetadados = (ip: string) => ip.startsWith('169.254.');

  it('não segue redirect para endereço interno', async () => {
    await expect(
      safeFetch(`http://127.0.0.1:${port}/redirect-interno`, {
        addressGuard: permiteLoopbackBloqueiaMetadados,
      }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it('busca normalmente quando o destino é permitido', async () => {
    const resultado = await safeFetch(`http://127.0.0.1:${port}/feed`, {
      addressGuard: permiteLoopbackBloqueiaMetadados,
    });

    expect(resultado.status).toBe(200);
    expect(resultado.body).toContain('<title>ok</title>');
  });

  it('corta resposta acima do teto de bytes', async () => {
    await expect(
      safeFetch(`http://127.0.0.1:${port}/gigante`, {
        addressGuard: permiteLoopbackBloqueiaMetadados,
        maxBytes: 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(ResponseTooLargeError);
  });
});
