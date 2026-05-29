import { displayRepository } from '../repositories/display.repository';

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

function parsePagesField(raw: string | any): { pages: any[]; orientation?: string } {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Novo formato wrapper: { __orientation, items }
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) {
    return {
      pages: parsed.items,
      orientation: parsed.__orientation || undefined,
    };
  }

  // Formato legado: array direto de pages
  if (Array.isArray(parsed)) {
    return { pages: parsed, orientation: undefined };
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
  async getAll() {
    const displays = await displayRepository.findAll();
    return displays.map((d) => {
      const { pages, orientation } = parsePagesField(d.pages);
      return {
        ...d,
        pages,
        orientation,
      };
    });
  }

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

  async save(data: { id?: string; name: string; slug: string; pages: any; coverImage?: string | null; orientation?: string }) {
    const pagesStr = serializePagesField(data.pages, data.orientation);
    const result = await displayRepository.upsert({
      id: data.id,
      name: data.name,
      slug: data.slug,
      pages: pagesStr,
      coverImage: data.coverImage,
    });
    // Return with parsed pages and orientation
    const { pages, orientation } = parsePagesField(result.pages);
    return { ...result, pages, orientation };
  }

  async delete(id: string) {
    return displayRepository.delete(id);
  }
}

export const displayService = new DisplayService();
