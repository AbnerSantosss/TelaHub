import { z } from 'zod';

/** Política mínima de senha do auto-cadastro. */
export const PASSWORD_MIN_LENGTH = 8;

export const signupSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, 'Informe o nome da empresa (mínimo 2 caracteres).')
    .max(120, 'Nome da empresa muito longo.'),
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome (mínimo 2 caracteres).')
    .max(120, 'Nome muito longo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um e-mail válido.')
    .max(180, 'E-mail muito longo.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
    .max(128, 'Senha muito longa.'),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const checkEmailQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
});
