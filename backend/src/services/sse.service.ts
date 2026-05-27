import { Response } from 'express';
import prisma from '../lib/prisma';

interface Client {
  id: string; // ID único de conexão
  res: Response;
  type: 'slug' | 'device';
  target: string; // slug do display ou deviceId
}

class SSEService {
  private clients: Client[] = [];

  addClient(type: 'slug' | 'device', target: string, res: Response) {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Configura os cabeçalhos HTTP para Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Envia mensagem inicial de sucesso
    res.write('data: {"status":"connected"}\n\n');

    // Intervalo de keep-alive a cada 30 segundos para manter a conexão aberta e detectar desconexões
    const pingInterval = setInterval(() => {
      res.write('data: {"type":"ping"}\n\n');
    }, 30000);

    const client: Client = { id, res, type, target };
    this.clients.push(client);

    console.log(`📡 [SSE] Cliente registrado. ID: ${id}, Tipo: ${type}, Target: ${target}. Conexões ativas: ${this.clients.length}`);

    // Ao fechar a conexão, remove do array de clientes e limpa o ping
    res.on('close', () => {
      clearInterval(pingInterval);
      this.clients = this.clients.filter(c => c.id !== id);
      console.log(`🔌 [SSE] Cliente desconectado. ID: ${id}. Conexões ativas: ${this.clients.length}`);
    });
  }

  // Notificar quando um display é salvo/alterado ou quando um broadcast associado é alterado
  async notifyDisplayUpdate(displayId: string) {
    try {
      console.log(`📣 [SSE] Recebida notificação de atualização para Display ID: ${displayId}`);
      
      const display = await prisma.display.findUnique({
        where: { id: displayId },
        select: { slug: true }
      });

      if (!display) {
        console.warn(`⚠️ [SSE] Display com ID ${displayId} não foi encontrado ao tentar notificar.`);
        return;
      }

      const slug = display.slug;
      
      // 1. Notificar clientes conectados via Slug (modo direto)
      this.clients.forEach(c => {
        if (c.type === 'slug' && c.target === slug) {
          console.log(`📱 [SSE] Enviando sinal de atualização para Player via Slug: ${slug}`);
          c.res.write('data: {"event":"update","type":"display"}\n\n');
        }
      });

      // 2. Notificar clientes conectados via Device vinculados a esse Display ID
      const devices = await prisma.device.findMany({
        where: { displayId },
        select: { id: true }
      });

      const deviceIds = devices.map(d => d.id);

      this.clients.forEach(c => {
        if (c.type === 'device' && deviceIds.includes(c.target)) {
          console.log(`📺 [SSE] Enviando sinal de atualização para Player Pareado (Device): ${c.target}`);
          c.res.write('data: {"event":"update","type":"display"}\n\n');
        }
      });

    } catch (error) {
      console.error('❌ [SSE] Erro no notifyDisplayUpdate:', error);
    }
  }

  // Notificar quando um dispositivo é pareado/atualizado/desvinculado
  async notifyDeviceUpdate(deviceId: string) {
    try {
      console.log(`📣 [SSE] Recebida notificação de atualização para Dispositivo ID: ${deviceId}`);
      this.clients.forEach(c => {
        if (c.type === 'device' && c.target === deviceId) {
          console.log(`📺 [SSE] Enviando sinal de atualização para Player Pareado: ${deviceId}`);
          c.res.write('data: {"event":"update","type":"device"}\n\n');
        }
      });
    } catch (error) {
      console.error('❌ [SSE] Erro no notifyDeviceUpdate:', error);
    }
  }
}

export const sseService = new SSEService();
