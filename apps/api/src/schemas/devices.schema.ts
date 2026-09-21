import { z } from 'zod';

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, 'deviceId é obrigatório.'),
  code: z.string().min(1, 'code é obrigatório.'),
});

export const linkDeviceSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório.'),
  displayId: z.string().min(1, 'displayId é obrigatório.'),
  name: z.string().optional(),
});

export const updateDeviceDisplaySchema = z.object({
  displayId: z.string().min(1, 'displayId é obrigatório.'),
});
