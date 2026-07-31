import prisma from '../lib/prisma';
import type { TenantScope } from './display.repository';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  lastLogin: true,
  organizationId: true,
} as const;

export class UserRepository {
  /**
   * Lista usuários. Com `organizationId`, restringe ao tenant.
   *
   * Sem argumento continua listando todos — usado por rotinas de plataforma
   * (job de alerta), nunca diretamente por uma rota de tenant.
   */
  async findAll(organizationId?: TenantScope) {
    return prisma.user.findMany({
      where: organizationId ? { organizationId } : {},
      select: PUBLIC_USER_SELECT,
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  /** Busca escopada: retorna null se o usuário for de outro tenant. */
  async findByIdScoped(id: string, organizationId?: TenantScope) {
    return prisma.user.findFirst({ where: { id, ...(organizationId ? { organizationId } : {}) } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    mustChangePassword?: boolean;
    organizationId?: string | null;
  }) {
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        organizationId: data.organizationId ?? null,
      },
    });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  /**
   * Troca a senha.
   *
   * `mustChangePassword` é tri-estado de propósito:
   *   - `false` → a pessoa ESCOLHEU esta senha (troca ou redefinição): encerra
   *     a obrigação;
   *   - `true`  → o SISTEMA gerou esta senha (reenvio de convite): a obrigação
   *     recomeça, porque a senha nova também trafega por e-mail;
   *   - omitido → não mexe no campo.
   *
   * Deixar isso implícito seria o erro fácil: um reenvio de convite que
   * "esquecesse" de reativar a obrigação criaria uma senha de e-mail válida
   * para sempre, exatamente o problema que o campo existe para fechar.
   */
  async updatePassword(
    id: string,
    hashedPassword: string,
    options: { mustChangePassword?: boolean } = {}
  ) {
    return prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        ...(options.mustChangePassword === undefined
          ? {}
          : { mustChangePassword: options.mustChangePassword }),
      },
    });
  }

  async updateEmail(id: string, email: string) {
    return prisma.user.update({
      where: { id },
      data: { email },
    });
  }

  async updateName(id: string, name: string) {
    return prisma.user.update({
      where: { id },
      data: { name },
    });
  }
}

export const userRepository = new UserRepository();
