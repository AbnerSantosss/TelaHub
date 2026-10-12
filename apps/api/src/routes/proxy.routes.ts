import { Router, Request, Response } from 'express';
import { proxyRateLimit } from '../middlewares/rate-limit.middleware';
import { safeFetch, SsrfBlockedError, ResponseTooLargeError } from '../lib/safe-http';

const router = Router();

// Cache em memória de 5 minutos por URL de RSS
interface CacheEntry {
  timestamp: number;
  data: any;
}
const rssCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Sem teto, o cache é um vazamento de memória controlado por quem chama: cada
// URL nova cria uma entrada que nunca sai. Descarta a mais antiga ao encher.
const CACHE_MAX_ENTRIES = 200;

function rememberInCache(key: string, data: unknown): void {
  if (rssCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = rssCache.keys().next();
    if (!oldest.done) rssCache.delete(oldest.value);
  }
  rssCache.set(key, { timestamp: Date.now(), data });
}

function cleanCdata(text: string): string {
  if (!text) return '';
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
}

function extractTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, 'i'));
  return match ? cleanCdata(match[1]) : '';
}

function extractAttr(xml: string, tagName: string, attrName: string): string {
  const tagMatch = xml.match(new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}[^>]*>`, 'i'));
  if (!tagMatch) return '';
  const attrMatch = tagMatch[0].match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return attrMatch ? attrMatch[1] : '';
}

function parseRssXml(xml: string): any[] {
  const items: any[] = [];
  
  // Suporta tanto <item> (RSS 2.0) quanto <entry> (Atom)
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (const itemXml of itemMatches) {
    const title = extractTag(itemXml, 'title');
    let description = extractTag(itemXml, 'description') || extractTag(itemXml, 'summary');
    const content = extractTag(itemXml, 'encoded') || extractTag(itemXml, 'content') || description;
    let link = extractTag(itemXml, 'link');
    if (!link) {
      link = extractAttr(itemXml, 'link', 'href');
    }
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'published') || extractTag(itemXml, 'updated') || new Date().toISOString();
    const author = extractTag(itemXml, 'creator') || extractTag(itemXml, 'author') || extractTag(itemXml, 'name') || '';

    // Enclosures / Media URLs
    let mediaUrl = extractAttr(itemXml, 'enclosure', 'url') || 
                   extractAttr(itemXml, 'content', 'url') || 
                   extractAttr(itemXml, 'thumbnail', 'url');

    // Se não encontrou enclosure explícito, busca <img src="..."> no description ou content
    if (!mediaUrl) {
      const imgMatch = (description + ' ' + content).match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        mediaUrl = imgMatch[1];
      }
    }

    items.push({
      title,
      description,
      content,
      link,
      pubDate,
      author,
      thumbnail: mediaUrl || '',
      enclosure: mediaUrl ? { url: mediaUrl, link: mediaUrl } : null
    });
  }

  return items;
}

/**
 * GET /api/proxy/rss?url=...
 *
 * Rota **pública de propósito**: o widget de RSS roda no player, que é uma TV
 * pareada sem sessão de usuário — exigir JWT tiraria o feed do ar em todas as
 * telas. A guarda não é autenticação, é `lib/safe-http`: a URL só pode
 * terminar em um endereço da internet pública, nunca em `db:5432`,
 * `169.254.169.254` ou outro container da rede interna, nem via redirect ou
 * DNS rebinding.
 */
router.get('/rss', proxyRateLimit, async (req: Request, res: Response): Promise<void> => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';

  if (!rawUrl) {
    res.status(400).json({ error: 'Parâmetro "url" é obrigatório.' });
    return;
  }

  // Checa cache
  const cached = rssCache.get(rawUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  try {
    const response = await safeFetch(rawUrl, {
      maxBytes: 2 * 1024 * 1024,
      timeoutMs: 10_000,
      maxRedirects: 3,
      headers: {
        // Sem URL no User-Agent: o domínio que estava aqui (telahub.com.br) é de
        // TERCEIRO desde 2025, e todo feed que registra o agente passava a
        // apontar para o site de outra empresa. Enquanto o domínio próprio não
        // for decidido, o identificador vai sem endereço.
        'User-Agent': 'TelaHub-RSS-Reader/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      },
    });

    if (response.status < 200 || response.status >= 300) {
      res.status(502).json({ error: `Servidor RSS respondeu com status ${response.status}.` });
      return;
    }

    const xmlText = response.body;
    const items = parseRssXml(xmlText);

    const result = {
      status: 'ok',
      feed: {
        title: extractTag(xmlText, 'title'),
        link: extractTag(xmlText, 'link'),
        description: extractTag(xmlText, 'description'),
      },
      items,
      count: items.length,
    };

    rememberInCache(rawUrl, result);

    res.json(result);
  } catch (error: any) {
    // URL interna ou inválida é erro de quem pediu (400), não falha do servidor.
    // A mensagem não distingue "recusado" de "não resolveu" para não virar um
    // scanner de rede interna por diferença de resposta.
    if (error instanceof SsrfBlockedError) {
      res.status(400).json({ error: 'URL não permitida.' });
      return;
    }
    if (error instanceof ResponseTooLargeError) {
      res.status(413).json({ error: 'O feed é grande demais.' });
      return;
    }
    console.error('Erro ao buscar feed RSS via proxy:', error);
    res.status(502).json({ error: 'Não foi possível ler o feed.' });
  }
});

export default router;
