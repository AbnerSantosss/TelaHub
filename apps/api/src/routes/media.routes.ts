import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { mediaService, MediaScope } from '../services/media.service';
import { resolveDefaultOrganizationId } from '../services/organization.service';

const router = Router();

/**
 * Resolve o escopo de mídia da requisição.
 *
 * Retorna `null` quando não há tenant definido (master sem organização
 * escolhida) — nesse caso não existe prefixo para ler/gravar e a rota responde
 * 400 pedindo `X-Organization-Id`.
 */
async function resolveMediaScope(req: Request): Promise<MediaScope | null> {
  const organizationId = req.tenantId;
  if (!organizationId) return null;

  const defaultOrganizationId = await resolveDefaultOrganizationId();
  return {
    organizationId,
    isDefaultOrganization: organizationId === defaultOrganizationId,
  };
}

const MISSING_SCOPE_ERROR = {
  error: 'Escolha uma organização (header X-Organization-Id) para operar mídias.',
};

// Configura multer: R2 usa memoryStorage, local usa diskStorage.
// No modo local o destino é a pasta da organização — por isso `requireTenant`
// precisa rodar ANTES do multer.
const storage = mediaService.isR2Enabled()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const organizationId = (req as Request).tenantId;
        if (!organizationId) {
          cb(new Error('Escopo de organização ausente no upload.'), '');
          return;
        }
        try {
          cb(null, mediaService.getUploadsDirFor(organizationId));
        } catch (err) {
          cb(err as Error, '');
        }
      },
      filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}`;
        cb(null, uniqueName);
      },
    });

// Tipos que o Player e o Editor realmente sabem exibir. Sem esta lista o
// endpoint aceitava qualquer arquivo — e como o bucket R2 é público, a conta de
// um cliente viraria hospedagem de conteúdo arbitrário (executável, HTML com
// script, etc.) sob o nosso domínio.
const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  // SVG fica DE FORA de propósito: em modo local os uploads são servidos por
  // `express.static('/uploads')` na MESMA origem do app, e SVG pode carregar
  // script — seria XSS armazenado no domínio do painel. Para liberar SVG é
  // preciso antes servir mídia de outra origem (ou sanitizar no upload).
  'video/mp4',
  'video/webm',
  'video/ogg',
  'application/pdf',
]);

/**
 * Extensões aceitas, espelhando a lista de MIME acima.
 *
 * Checar só o MIME NÃO basta: o `Content-Type` é enviado pelo cliente e é
 * trivialmente falsificável. Sem esta segunda barreira, um `evil.html` declarado
 * como `image/png` passava pelo filtro e era gravado em disco preservando a
 * extensão `.html` — e como `express.static('/uploads')` serve a pasta na MESMA
 * origem do painel, viraria XSS armazenado. MIME **e** extensão precisam bater.
 */
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif',
  '.mp4', '.webm', '.ogv', '.ogg',
  '.pdf',
]);

/** Erro de tipo de mídia — traduzido para 415 pelo `handleUpload`. */
class UnsupportedMediaTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMediaTypeError';
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (ALLOWED_UPLOAD_MIME.has(file.mimetype) && ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
      cb(null, true);
      return;
    }

    // Mensagem no padrão dos "3 I's" de microcopy: diz o que houve, o que é
    // aceito, e não culpa quem enviou.
    cb(new UnsupportedMediaTypeError(
      `Tipo de arquivo não suportado (${file.mimetype || 'desconhecido'}${extension ? `, ${extension}` : ''}). ` +
      'Envie imagem (JPG, PNG, GIF, WebP, AVIF), vídeo (MP4, WebM, OGG) ou PDF.'
    ));
  },
});

/**
 * Envolve o multer para traduzir suas falhas em status HTTP corretos.
 *
 * Sem isso, arquivo de tipo proibido e arquivo acima do limite caíam no error
 * handler genérico como **500**, escondendo do usuário o motivo real da recusa.
 */
const handleUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof UnsupportedMediaTypeError) {
      res.status(415).json({ error: err.message });
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Arquivo muito grande. O limite por arquivo é 50 MB.' });
        return;
      }
      res.status(400).json({ error: 'Falha no upload do arquivo.' });
      return;
    }

    console.error('Erro inesperado no upload:', err);
    res.status(500).json({ error: 'Erro ao fazer upload.' });
  });
};

// POST /api/media/upload
router.post('/upload', authMiddleware, requireTenant, handleUpload, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.tenantId;
    if (!organizationId) {
      res.status(400).json(MISSING_SCOPE_ERROR);
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    let url: string;
    let filename: string;
    let key: string;

    if (mediaService.isR2Enabled()) {
      // Upload para Cloudflare R2, sob o prefixo da organização
      const uploaded = await mediaService.uploadToR2(
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        },
        organizationId
      );
      url = uploaded.url;
      filename = uploaded.filename;
      key = uploaded.key;
    } else {
      // Modo local: arquivo já foi salvo pelo multer diskStorage em uploads/<org>/
      // Usa caminho relativo para funcionar atrás de reverse proxy (Nginx/Cloudflare)
      filename = req.file.filename;
      key = `${organizationId}/${filename}`;
      url = `/uploads/${key}`;
    }

    res.json({ url, filename, key });
  } catch (error: any) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload.' });
  }
});

// GET /api/media — lista apenas o prefixo do tenant
router.get('/', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = await resolveMediaScope(req);
    if (!scope) {
      res.status(400).json(MISSING_SCOPE_ERROR);
      return;
    }

    if (mediaService.isR2Enabled()) {
      const files = await mediaService.listFilesR2(scope);
      res.json(files);
    } else {
      // Usa string vazia para gerar caminhos relativos (/uploads/...)
      res.json(mediaService.listFiles('', scope));
    }
  } catch (error: any) {
    console.error('Erro ao listar mídia:', error);
    res.status(500).json({ error: 'Erro ao listar mídia.' });
  }
});

// DELETE /api/media/:filename — 404 para chave fora do prefixo do tenant
router.delete('/:filename', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = await resolveMediaScope(req);
    if (!scope) {
      res.status(400).json(MISSING_SCOPE_ERROR);
      return;
    }

    const filename = req.params.filename as string;
    let deleted: boolean;

    if (mediaService.isR2Enabled()) {
      deleted = await mediaService.deleteFromR2(filename, scope);
    } else {
      deleted = mediaService.deleteFile(filename, scope);
    }

    if (!deleted) {
      // Também é o caminho de nomes inválidos (path traversal) e de chaves de
      // outro tenant: 404 uniforme, sem vazar existência.
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }

    res.json({ message: 'Arquivo removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar mídia:', error);
    res.status(500).json({ error: 'Erro ao deletar mídia.' });
  }
});

// POST /api/media/delete-batch (recebe array de filenames no body)
router.post('/delete-batch', authMiddleware, requireTenant, async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = await resolveMediaScope(req);
    if (!scope) {
      res.status(400).json(MISSING_SCOPE_ERROR);
      return;
    }

    const { filenames } = req.body;

    if (!Array.isArray(filenames) || filenames.length === 0) {
      res.status(400).json({ error: 'Lista de arquivos é obrigatória.' });
      return;
    }

    let deletedCount: number;
    if (mediaService.isR2Enabled()) {
      deletedCount = await mediaService.deleteBatchR2(filenames, scope);
    } else {
      deletedCount = mediaService.deleteBatch(filenames, scope);
    }

    res.json({ message: `${deletedCount} arquivo(s) removido(s).` });
  } catch (error: any) {
    console.error('Erro ao deletar mídias em batch:', error);
    res.status(500).json({ error: 'Erro ao deletar mídias.' });
  }
});

export default router;
