import { randomUUID } from 'crypto';
import { Response } from 'express';
import prisma from '../lib/prisma';

type ClientType = 'slug' | 'device';

interface Client {
  id: string; // ID único de conexão
  res: Response;
  type: ClientType;
  target: string; // slug do display ou deviceId
  ping: NodeJS.Timeout;
}

/** Intervalo do keep-alive. Tem de ser menor que o `proxy_read_timeout` do gateway. */
const PING_INTERVAL_MS = 30_000;

/**
 * Teto de conexões abertas para o MESMO alvo. Um slug pode estar aberto em
 * várias TVs da mesma loja, então o teto é folgado; ele existe para que um
 * script em laço (ou uma aba esquecida reconectando) não esgote os sockets do
 * processo abrindo o mesmo stream indefinidamente — a rota é pública.
 */
const MAX_CLIENTS_PER_TARGET = Number(process.env.SSE_MAX_CLIENTS_PER_TARGET) || 50;

/** Teto global de conexões SSE neste processo. */
const MAX_CLIENTS_TOTAL = Number(process.env.SSE_MAX_CLIENTS) || 5000;

const keyOf = (type: ClientType, target: string) => `${type}:${target}`;

/**
 * Canal de atualização em tempo real dos players (Server-Sent Events).
 *
 * LIMITE CONHECIDO: os clientes ficam na memória DESTE processo. Com uma única
 * instância da API (o caso de hoje) funciona. Para rodar duas instâncias atrás
 * de um balanceador, a notificação precisa passar por um barramento (Redis
 * pub/sub), senão o player conectado na instância B não recebe o aviso gerado
 * na instância A. O polling de 60 s do player cobre essa falha, com atraso.
 */
class SSEService {
  /** Clientes indexados por alvo: notificar é O(conexões do alvo), não O(todas). */
  private clients = new Map<string, Map<string, Client>>();
  private total = 0;

  get connectionCount(): number {
    return this.total;
  }

  addClient(type: ClientType, target: string, res: Response) {
    const key = keyOf(type, target);
    const sameTarget = this.clients.get(key);

    if (this.total >= MAX_CLIENTS_TOTAL || (sameTarget?.size ?? 0) >= MAX_CLIENTS_PER_TARGET) {
      console.warn(`[SSE] Conexão recusada por limite (${key}). Ativas: ${this.total}`);
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Muitas conexões abertas. Tente novamente em instantes.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      // Sem isto o nginx (gateway) junta os eventos num buffer e o player só
      // recebe o aviso quando o buffer enche — a atualização "em tempo real"
      // chegava com minutos de atraso, ou só pelo polling.
      'X-Accel-Buffering': 'no',
    });

    // `retry` orienta o EventSource nativo; o player também aplica recuo próprio.
    res.write('retry: 5000\ndata: {"status":"connected"}\n\n');

    const id = randomUUID();
    const ping = setInterval(() => this.send(client, '{"type":"ping"}'), PING_INTERVAL_MS);
    const client: Client = { id, res, type, target, ping };

    const bucket = sameTarget ?? new Map<string, Client>();
    bucket.set(id, client);
    this.clients.set(key, bucket);
    this.total += 1;

    res.on('close', () => this.removeClient(client));
    res.on('error', () => this.removeClient(client));
  }

  private removeClient(client: Client) {
    clearInterval(client.ping);
    const key = keyOf(client.type, client.target);
    const bucket = this.clients.get(key);
    if (!bucket?.delete(client.id)) return;
    this.total -= 1;
    if (bucket.size === 0) this.clients.delete(key);
  }

  /**
   * Escreve um evento. Socket morto não pode derrubar o laço de notificação
   * nem o processo: o cliente com erro é descartado e os outros seguem.
   */
  private send(client: Client, data: string) {
    try {
      if (client.res.writableEnded || client.res.destroyed) {
        this.removeClient(client);
        return;
      }
      client.res.write(`data: ${data}\n\n`);
    } catch {
      this.removeClient(client);
    }
  }

  private broadcast(type: ClientType, target: string, data: string) {
    const bucket = this.clients.get(keyOf(type, target));
    if (!bucket) return;
    // Cópia: `send` pode remover o cliente do Map durante a iteração.
    for (const client of [...bucket.values()]) this.send(client, data);
  }

  // Notificar quando um display é salvo/alterado ou quando um broadcast associado é alterado
  async notifyDisplayUpdate(displayId: string) {
    // Ninguém conectado: não gasta consulta no banco a cada salvamento.
    if (this.total === 0) return;

    try {
      const display = await prisma.display.findUnique({
        where: { id: displayId },
        select: { slug: true },
      });
      if (!display) return;

      const payload = '{"event":"update","type":"display"}';

      // 1. Players abertos direto pelo slug
      this.broadcast('slug', display.slug, payload);

      // 2. Players pareados (device) que exibem este display
      const devices = await prisma.device.findMany({
        where: { displayId },
        select: { id: true },
      });
      for (const device of devices) this.broadcast('device', device.id, payload);
    } catch (error) {
      console.error('[SSE] Erro no notifyDisplayUpdate:', error);
    }
  }

  // Notificar quando um dispositivo é pareado/atualizado/desvinculado
  async notifyDeviceUpdate(deviceId: string) {
    try {
      this.broadcast('device', deviceId, '{"event":"update","type":"device"}');
    } catch (error) {
      console.error('[SSE] Erro no notifyDeviceUpdate:', error);
    }
  }
}

export const sseService = new SSEService();
