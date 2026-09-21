import { z } from 'zod';

export const saveBroadcastSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório.'),
  page: z.unknown().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_permanent: z.boolean().optional(),
  display_ids: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
  created_by: z.string().nullable().optional(),
  orientation: z.string().optional(),
});
