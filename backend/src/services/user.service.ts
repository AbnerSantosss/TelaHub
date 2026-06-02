import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword, generateToken } from './auth.service';
import { testSmtpConnection, sendInviteEmail, sendResetPasswordEmail } from './email.service';
import prisma from '../lib/prisma';
import crypto from 'crypto';

export class UserService {
  async login(loginInput: string, password: string) {
    // Aceita login por email ou username
    let user = await userRepository.findByEmail(loginInput);
    if (!user) {
      user = await userRepository.findByUsername(loginInput);
    }
    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Registra último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getAll() {
    return userRepository.findAll();
  }

  async getById(id: string) {
    return userRepository.findById(id);
  }

  /** Gera uma senha aleatória legível de 8 caracteres */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Cria um novo usuário via convite por e-mail.
   */
  async inviteUser(email: string, role: string = 'user') {
    // 1. Validar SMTP antes de tudo
    const smtpCheck = await testSmtpConnection();
    if (!smtpCheck.ok) {
      throw new Error(
        `Provedor de e-mail não configurado ou com falha: ${smtpCheck.error || 'Verifique as Configurações.'}`
      );
    }

    // 2. Gerar senha aleatória
    const plainPassword = this.generateRandomPassword();
    const hashedPwd = await hashPassword(plainPassword);

    // 3. Extrair username do e-mail (parte antes do @)
    const username = email.split('@')[0];

    // 4. Salvar no banco
    const user = await userRepository.create({
      username,
      email,
      password: hashedPwd,
      role: role || 'user',
    });

    // 5. Enviar convite por e-mail
    await sendInviteEmail(email, plainPassword);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Reenvia o convite para um usuário existente com uma nova senha.
   */
  async resendInvite(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('Usuário não encontrado.');

    // Validar SMTP
    const smtpCheck = await testSmtpConnection();
    if (!smtpCheck.ok) {
      throw new Error(`Provedor de e-mail não configurado: ${smtpCheck.error}`);
    }

    // Gerar nova senha
    const plainPassword = this.generateRandomPassword();
    const hashedPwd = await hashPassword(plainPassword);

    // Atualizar senha no banco
    await userRepository.updatePassword(userId, hashedPwd);

    // Enviar email
    await sendInviteEmail(user.email, plainPassword);

    return { message: `Convite reenviado para ${user.email}` };
  }

  /**
   * Solicita redefinição de senha — gera token e envia por e-mail.
   */
  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Não revelar se o email existe (segurança)
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };
    }

    // Validar SMTP
    const smtpCheck = await testSmtpConnection();
    if (!smtpCheck.ok) {
      throw new Error('Sistema de e-mail temporariamente indisponível.');
    }

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salvar no banco
    await prisma.passwordReset.create({
      data: { email: user.email, token, expiresAt },
    });

    // Enviar email
    await sendResetPasswordEmail(user.email, token);

    return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };
  }

  /**
   * Valida token de reset e atualiza a senha.
   */
  async resetPassword(token: string, newPassword: string) {
    // Buscar token válido
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new Error('Link de redefinição inválido ou expirado.');
    }

    // Buscar usuário
    const user = await userRepository.findByEmail(resetRecord.email);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    // Hash nova senha
    const hashedPwd = await hashPassword(newPassword);
    await userRepository.updatePassword(user.id, hashedPwd);

    // Marcar token como usado
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    return { message: 'Senha redefinida com sucesso!' };
  }

  /**
   * Admin envia email de redefinição para um usuário específico.
   */
  async adminSendPasswordReset(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('Usuário não encontrado.');

    return this.requestPasswordReset(user.email);
  }

  /** Método legado de criação (sem e-mail) — mantido para seed/scripts */
  async create(data: { username: string; password: string; role?: string }) {
    let email = data.username;
    if (!email.includes('@')) {
      email = `${data.username}@officecom.com`;
    }

    const hashedPwd = await hashPassword(data.password);

    const user = await userRepository.create({
      username: data.username,
      email,
      password: hashedPwd,
      role: data.role || 'user',
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async updateEmail(userId: string, newEmail: string) {
    if (!newEmail || !newEmail.includes('@')) {
      throw new Error('E-mail inválido.');
    }

    const existingUser = await userRepository.findByEmail(newEmail);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Este e-mail já está em uso por outro usuário.');
    }

    const updatedUser = await userRepository.updateEmail(userId, newEmail);
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Senha atual incorreta.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const hashedPwd = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashedPwd);

    return { message: 'Senha alterada com sucesso!' };
  }

  async updateName(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new Error('O nome não pode ser vazio.');
    }

    const updatedUser = await userRepository.updateName(userId, name.trim());
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    };
  }

  async delete(id: string) {
    return userRepository.delete(id);
  }
}

export const userService = new UserService();
