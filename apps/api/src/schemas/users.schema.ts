import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().min(1, 'Informe um e-mail válido.').email('Informe um e-mail válido.'),
  role: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Informe um e-mail válido.').email('Informe um e-mail válido.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

export const updateEmailSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório.').email('Informe um e-mail válido.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
});

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório.'),
});
