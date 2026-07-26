import { z } from 'zod';

export const saveDisplaySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório.'),
  slug: z.string().min(1, 'Slug é obrigatório.'),
  pages: z.array(z.unknown()).optional(),
  coverImage: z.string().nullable().optional(),
  orientation: z.string().optional(),
  // Aceito por compatibilidade com clientes antigos, mas IGNORADO pelo servidor:
  // o `organizationId` de um display vem sempre do tenant do token.
  organizationId: z.string().optional(),
});
