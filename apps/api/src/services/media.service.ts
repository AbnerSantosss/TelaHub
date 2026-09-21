import path from 'path';
import fs from 'fs';

// Modo local: servir de disco. Modo R2: servir do Cloudflare R2 (S3-compatible).
const USE_R2 = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY && process.env.R2_BUCKET);

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Garante que a pasta local existe (para dev e fallback)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- R2 Client (lazy-loaded) ---
let s3Client: any = null;

async function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
  return s3Client;
}

/**
 * Um nome de arquivo aceitável do cliente: sem separador de diretório, sem `..`,
 * sem byte nulo, sem caminho absoluto/drive do Windows.
 *
 * Isso é a barreira contra path traversal (`../../etc/passwd`,
 * `..%2f`, `C:\Windows\...`) e contra tentar alcançar o prefixo de outro tenant.
 */
export function isSafeBaseName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const value = name.trim();
  if (value.length === 0 || value.length > 512) return false;
  if (value.includes('\0')) return false;
  if (value.includes('/') || value.includes('\\')) return false;
  if (value === '.' || value === '..' || value.includes('..')) return false;
  if (/^[a-zA-Z]:/.test(value)) return false;
  return true;
}

/** Valida um `organizationId` usado como prefixo de chave. */
function isSafeOrganizationId(organizationId: unknown): organizationId is string {
  return typeof organizationId === 'string' && /^[A-Za-z0-9._-]+$/.test(organizationId);
}

export interface MediaScope {
  /** Organização dona das mídias desta requisição. */
  organizationId: string;
  /**
   * Se esta organização é a organização padrão. Só ela "herda" os arquivos
   * legados que estão na raiz do bucket/pasta (sem prefixo de organização).
   */
  isDefaultOrganization: boolean;
}

export class MediaService {
  getUploadsDir() {
    return UPLOADS_DIR;
  }

  /** Pasta local de uploads da organização (criada sob demanda). */
  getUploadsDirFor(organizationId: string) {
    if (!isSafeOrganizationId(organizationId)) {
      throw new Error('organizationId inválido para prefixo de upload.');
    }
    const dir = path.join(UPLOADS_DIR, organizationId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  isR2Enabled() {
    return USE_R2;
  }

  /**
   * Resolve as chaves que uma requisição do tenant tem permissão de tocar para um
   * nome de arquivo informado pelo cliente.
   *
   * Retorna `[]` quando o nome é inválido/malicioso — a rota deve responder 404.
   * Para a organização padrão inclui também a chave legada (sem prefixo), o que
   * mantém compatibilidade com arquivos anteriores ao multi-tenant.
   */
  resolveTenantKeys(rawName: unknown, scope: MediaScope): string[] {
    if (!isSafeOrganizationId(scope.organizationId)) return [];

    if (typeof rawName !== 'string') return [];
    let value = rawName.trim();

    // Aceita também a chave completa já prefixada (`<orgId>/arquivo.png`), desde
    // que o prefixo seja exatamente o do tenant.
    if (value.includes('/')) {
      const [prefix, ...rest] = value.split('/');
      if (prefix !== scope.organizationId) return [];
      value = rest.join('/');
      if (value.includes('/')) return [];
    }

    if (!isSafeBaseName(value)) return [];

    const keys = [`${scope.organizationId}/${value}`];
    if (scope.isDefaultOrganization) keys.push(value);
    return keys;
  }

  // --- Upload ---
  async uploadToR2(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    organizationId: string
  ): Promise<{ url: string; key: string; filename: string }> {
    if (!isSafeOrganizationId(organizationId)) {
      throw new Error('organizationId inválido para prefixo de upload.');
    }

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${safeName}`;
    // Toda mídia vive sob o prefixo da organização — é o que isola os tenants
    // dentro do mesmo bucket.
    const key = `${organizationId}/${filename}`;

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    return { url: `${process.env.R2_PUBLIC_URL}/${key}`, key, filename };
  }

  // --- List ---
  /** Lista apenas as mídias do prefixo do tenant (+ legadas, se org padrão). */
  async listFilesR2(scope: MediaScope) {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const client = await getS3Client();

    const entries: any[] = [];

    const scoped = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
      Prefix: `${scope.organizationId}/`,
    }));
    entries.push(...(scoped.Contents || []));

    if (scope.isDefaultOrganization) {
      // Arquivos legados: estão na raiz do bucket (chave sem `/`).
      const legacy = await client.send(new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET!,
        Delimiter: '/',
      }));
      entries.push(...(legacy.Contents || []).filter((obj: any) => obj.Key && !obj.Key.includes('/')));
    }

    return entries
      .map((obj: any) => {
        const key: string = obj.Key || '';
        const filename = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key;
        return {
          // `name`/`id` são o nome curto (o que o cliente manda de volta para
          // deletar); `key` é a chave real, já prefixada pelo tenant.
          name: filename,
          id: filename,
          key,
          updated_at: obj.LastModified?.toISOString() || new Date().toISOString(),
          created_at: obj.LastModified?.toISOString() || new Date().toISOString(),
          last_accessed_at: obj.LastModified?.toISOString() || new Date().toISOString(),
          metadata: {
            size: obj.Size || 0,
            mimetype: this.getMimeType(filename),
            cacheControl: 'public, max-age=31536000',
          },
          url: `${process.env.R2_PUBLIC_URL}/${key}`,
        };
      })
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- Delete ---
  private async deleteKeyR2(key: string): Promise<boolean> {
    try {
      const { DeleteObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
      const client = await getS3Client();

      // Confirma existência antes: sem isso, o R2 responde 204 para qualquer
      // chave e `deleteBatch` reportaria remoções que não aconteceram.
      await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
      await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  /** Deleta no R2 respeitando o prefixo do tenant. */
  async deleteFromR2(rawName: unknown, scope: MediaScope): Promise<boolean> {
    const keys = this.resolveTenantKeys(rawName, scope);
    for (const key of keys) {
      if (await this.deleteKeyR2(key)) return true;
    }
    return false;
  }

  async deleteBatchR2(rawNames: unknown[], scope: MediaScope): Promise<number> {
    let count = 0;
    for (const rawName of rawNames) {
      if (await this.deleteFromR2(rawName, scope)) count++;
    }
    return count;
  }

  // --- Local filesystem operations (fallback/dev) ---
  /** Lista os arquivos do tenant (+ legados na raiz, se org padrão). */
  listFiles(baseUrl: string, scope: MediaScope) {
    if (!isSafeOrganizationId(scope.organizationId)) return [];

    const entries: { key: string; filename: string; absolutePath: string }[] = [];

    const tenantDir = path.join(UPLOADS_DIR, scope.organizationId);
    if (fs.existsSync(tenantDir)) {
      for (const filename of fs.readdirSync(tenantDir)) {
        if (filename === '.gitkeep') continue;
        const absolutePath = path.join(tenantDir, filename);
        if (!fs.statSync(absolutePath).isFile()) continue;
        entries.push({ key: `${scope.organizationId}/${filename}`, filename, absolutePath });
      }
    }

    if (scope.isDefaultOrganization) {
      for (const filename of fs.readdirSync(UPLOADS_DIR)) {
        if (filename === '.gitkeep') continue;
        const absolutePath = path.join(UPLOADS_DIR, filename);
        // Pastas na raiz são prefixos de outras organizações — nunca listadas.
        if (!fs.statSync(absolutePath).isFile()) continue;
        entries.push({ key: filename, filename, absolutePath });
      }
    }

    return entries
      .map(({ key, filename, absolutePath }) => {
        const stats = fs.statSync(absolutePath);

        return {
          name: filename,
          id: filename,
          key,
          updated_at: stats.mtime.toISOString(),
          created_at: stats.birthtime.toISOString(),
          last_accessed_at: stats.atime.toISOString(),
          metadata: {
            size: stats.size,
            mimetype: this.getMimeType(filename),
            cacheControl: 'max-age=3600',
          },
          url: `${baseUrl}/uploads/${key}`,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** Deleta em disco respeitando o prefixo do tenant. */
  deleteFile(rawName: unknown, scope: MediaScope): boolean {
    const keys = this.resolveTenantKeys(rawName, scope);

    for (const key of keys) {
      const filePath = path.join(UPLOADS_DIR, key);

      // Cinto e suspensório: mesmo com o nome já validado, garantimos que o
      // caminho resolvido continua dentro de uploads/.
      const relative = path.relative(UPLOADS_DIR, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

      if (!fs.existsSync(filePath)) continue;
      if (!fs.statSync(filePath).isFile()) continue;

      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  deleteBatch(rawNames: unknown[], scope: MediaScope): number {
    let deletedCount = 0;
    for (const rawName of rawNames) {
      if (this.deleteFile(rawName, scope)) deletedCount++;
    }
    return deletedCount;
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4', '.webm': 'video/webm',
      '.pdf': 'application/pdf',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}

export const mediaService = new MediaService();
