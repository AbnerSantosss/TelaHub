import prisma from '../lib/prisma';

export class UserRepository {
  async findAll() {
    return prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, lastLogin: true },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }

  async create(data: { username: string; email: string; password: string; role: string }) {
    return prisma.user.create({ data });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async updateEmail(id: string, email: string) {
    return prisma.user.update({
      where: { id },
      data: { email },
    });
  }
}

export const userRepository = new UserRepository();
