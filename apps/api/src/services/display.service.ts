import { displayRepository, TenantScope } from '../repositories/display.repository';
import { resolveDefaultOrganizationId } from './organization.service';
import { isSameTenant, TenantScopeError } from '../middlewares/tenant.middleware';

/**
 * Estratégia de persistência do campo `orientation`:
 * Como o banco não possui uma coluna dedicada para `orientation`,
 * armazenamos dentro do campo `pages` (Text/JSON) como um wrapper:
 *   { "__orientation": "vertical", "items": [ ...pages ] }
 *
 * Na leitura, extraímos o orientation e retornamos o array de pages
 * normalmente. Formato antigo (array puro) continua compatível.
 */

interface PagesWrapper {
  __orientation?: string;
  items: any[];
}

// Displays antigos (pré-refatoração para react-grid-layout) guardavam os widgets
// da cena em `page.widgets` (posicionamento absoluto), não em `page.layout` (grid).
// O Editor atual só entende `layout` — sem essa normalização, abrir uma dessas
// páginas quebra o Editor (`activePage.layout` undefined). Não convertemos o
// conteúdo automaticamente (formatos incompatíveis demais para mapear com segurança);
// só garantimos que `layout` exista como array vazio, preservando `widgets` no dado
// bruto para uma migração manual futura, se necessário.
function normalizePage(page: any): any {
  if (page && !Array.isArray(page.layout)) {
    return { ...page, layout: [] };
  }
  return page;
}

function parsePagesField(raw: string | any): { pages: any[]; orientation?: string } {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Novo formato wrapper: { __orientation, items }
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
    return {
      pages: parsed.items.map(normalizePage),
      orientation: parsed.__orientation || undefined,
    };
  }

  // Formato legado: array direto de pages
  if (Array.isArray(parsed)) {
    return { pages: parsed.map(normalizePage), orientation: undefined };
  }

  return { pages: [], orientation: undefined };
}

function serializePagesField(pages: any, orientation?: string): string {
  const pagesArray = Array.isArray(pages) ? pages : (typeof pages === 'string' ? JSON.parse(pages) : []);

  if (orientation) {
    const wrapper: PagesWrapper = {
      __orientation: orientation,
      items: pagesArray,
    };
    return JSON.stringify(wrapper);
  }

  // Se não tem orientation, usa formato wrapper mesmo assim para consistência futura
  const wrapper: PagesWrapper = {
    items: pagesArray,
  };
  return JSON.stringify(wrapper);
}

export class DisplayService {
  /**
   * Lista displays do tenant. `tenantId` null só chega aqui via role `master`
   * sem organização escolhida (leitura de plataforma).
   */
  async getAll(tenantId?: TenantScope) {
    const displays = await displayRepository.findAll(tenantId);
    return displays.map((d) => {
      const { pages, orientation } = parsePagesField(d.pages);
      return {
        ...d,
        pages,
        orientation,
      };
    });
  }

  /**
   * Busca sem escopo de tenant. Usado só pelas rotas PÚBLICAS do Player
   * (`/api/displays/player/:id`), onde não existe usuário autenticado e o id do
   * display já é o segredo compartilhado com a TV.
   */
  async getById(id: string) {
    const display = await displayRepository.findById(id);
    if (!display) return null;
    const { pages, orientation } = parsePagesField(display.pages);
    return {
      ...display,
      pages,
      orientation,
    };
  }

  /** Busca escopada: retorna null quando o display é de outro tenant. */
  async getByIdScoped(id: string, tenantId: TenantScope) {
    const display = await displayRepository.findByIdScoped(id, tenantId);
    if (!display) return null;
    const { pages, orientation } = parsePagesField(display.pages);
    return {
      ...display,
      pages,
      orientation,
    };
  }

  async getBySlug(slug: string) {
    const display = await displayRepository.findBySlug(slug);
    if (!display) return null;
    const { pages, orientation } = parsePagesField(display.pages);
    return {
      ...display,
      pages,
      orientation,
    };
  }

  // Retorna apenas o updatedAt — query ultra-leve para o Player checar versão
  async getVersionBySlug(slug: string) {
    return displayRepository.findVersionBySlug(slug);
  }

  /**
   * Cria ou sobrescreve um display DENTRO do tenant.
   *
   * O `organizationId` é imposto pelo servidor a partir de `tenantId` — qualquer
   * valor vindo do corpo da requisição é ignorado. Sobrescrever um display de
   * outro tenant lança `TenantScopeError` (a rota traduz para 404).
   */
  async save(
    data: { id?: string; name: string; slug: string; pages: any; coverImage?: string | null; orientation?: string },
    tenantId: TenantScope
  ): Promise<{ display: any; created: boolean }> {
    const pagesStr = serializePagesField(data.pages, data.orientation);

    let existingOrganizationId: string | null | undefined;
    let created = true;

    if (data.id) {
      const existing = await displayRepository.findById(data.id);
      if (existing) {
        if (!isSameTenant(existing.organizationId, tenantId)) {
          throw new TenantScopeError('Display não encontrado.');
        }
        existingOrganizationId = existing.organizationId;
        created = false;
      }
    }

    // Toda Display precisa pertencer a uma Organização. Prioridade:
    // 1) escopo do tenant da requisição; 2) organização que o display já tinha
    // (master operando sem escolher tenant); 3) organização padrão.
    const organizationId =
      (tenantId ?? undefined) ?? existingOrganizationId ?? (await resolveDefaultOrganizationId());

    // `Display.slug` é único globalmente porque alimenta a URL pública do
    // Player (`/player/:slug`) — não pode ser único por organização sem tornar
    // essa rota ambígua. Como consequência, devolver um erro de conflito na
    // criação revelaria a um tenant que aquele slug já existe em outro. Então,
    // ao criar, resolvemos a colisão em silêncio com um sufixo.
    const slug = created ? await this.resolveAvailableSlug(data.slug) : data.slug;

    const result = await displayRepository.upsert({
      id: data.id,
      name: data.name,
      slug,
      pages: pagesStr,
      coverImage: data.coverImage,
      organizationId,
    });
    // Return with parsed pages and orientation
    const { pages, orientation } = parsePagesField(result.pages);
    return { display: { ...result, pages, orientation }, created };
  }

  /**
   * Devolve o `slug` pedido se estiver livre; caso contrário acrescenta um
   * sufixo até achar um disponível. Nunca informa ao chamador que houve
   * colisão — evitar esse vazamento entre tenants é justamente o objetivo.
   */
  private async resolveAvailableSlug(desired: string): Promise<string> {
    const base = desired.trim() || 'display';

    if (!(await displayRepository.findBySlug(base))) return base;

    for (let suffix = 2; suffix <= 20; suffix++) {
      const candidate = `${base}-${suffix}`;
      if (!(await displayRepository.findBySlug(candidate))) return candidate;
    }

    // Fallback improvável: sufixo aleatório curto.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      if (!(await displayRepository.findBySlug(candidate))) return candidate;
    }

    throw new Error('Não foi possível gerar um slug disponível para o display.');
  }

  /** Delete sem escopo — uso interno/scripts. */
  async delete(id: string) {
    return displayRepository.delete(id);
  }

  /** Delete escopado: retorna false quando o display não existe no tenant. */
  async deleteScoped(id: string, tenantId: TenantScope): Promise<boolean> {
    const count = await displayRepository.deleteScoped(id, tenantId);
    return count > 0;
  }

  /**
   * Valida que TODOS os ids informados pertencem ao tenant. Retorna a lista de
   * ids que não pertencem (vazia = tudo ok).
   */
  async findForeignDisplayIds(ids: string[], tenantId: TenantScope): Promise<string[]> {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return [];
    const found = await displayRepository.findManyByIds(unique, tenantId);
    const foundIds = new Set(found.map((d) => d.id));
    return unique.filter((id) => !foundIds.has(id));
  }
}

export const displayService = new DisplayService();
