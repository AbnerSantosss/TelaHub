
import { api, setAuthToken, getAuthToken } from '../libs/api';
import { Display, User, Device, Broadcast } from '../types';

// ==============================================================================
// AUTH & USER FUNCTIONS
// ==============================================================================

export const getCurrentUser = async (): Promise<User | null> => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    return await api.get<User>('/auth/me');
  } catch {
    // Token inválido ou expirado
    setAuthToken(null);
    return null;
  }
};

export const login = async (loginInput: string, password: string): Promise<User | null> => {
  const { token, user } = await api.post<{ token: string; user: User }>('/auth/login', {
    email: loginInput.trim(),
    password,
  });

  setAuthToken(token);
  return user;
};

export const logout = async (): Promise<void> => {
  setAuthToken(null);
};

export const getUsers = async (): Promise<User[]> => {
  try {
    return await api.get<User[]>('/users');
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return [];
  }
};

export const saveUser = async (email: string, role: string = 'user'): Promise<{ message: string }> => {
  return api.post<{ message: string }>('/users/invite', { email, role });
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const resendInvite = async (userId: string): Promise<{ message: string }> => {
  return api.post<{ message: string }>(`/users/${userId}/resend-invite`);
};

export const adminSendPasswordReset = async (userId: string): Promise<{ message: string }> => {
  return api.post<{ message: string }>(`/users/${userId}/send-reset`);
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  return api.post<{ message: string }>('/users/forgot-password', { email });
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  return api.post<{ message: string }>('/users/reset-password', { token, password });
};

// ==============================================================================
// SETTINGS FUNCTIONS (SMTP)
// ==============================================================================

export interface SmtpConfig {
  smtp_user: string;
  smtp_pass: string;
  configured: boolean;
}

export const getSmtpSettings = async (): Promise<SmtpConfig> => {
  try {
    return await api.get<SmtpConfig>('/settings/smtp');
  } catch {
    return { smtp_user: '', smtp_pass: '', configured: false };
  }
};

export const saveSmtpSettings = async (smtp_user: string, smtp_pass: string): Promise<void> => {
  await api.post('/settings/smtp', { smtp_user, smtp_pass });
};

export const testSmtpConnection = async (): Promise<{ ok: boolean; error?: string; message?: string }> => {
  return api.post<{ ok: boolean; error?: string; message?: string }>('/settings/smtp/test');
};

export const getSmtpStatus = async (): Promise<{ configured: boolean }> => {
  try {
    return await api.get<{ configured: boolean }>('/settings/smtp/status');
  } catch {
    return { configured: false };
  }
};


// ==============================================================================
// DISPLAY FUNCTIONS
// ==============================================================================

export const getDisplays = async (): Promise<Display[]> => {
  try {
    return await api.get<Display[]>('/displays');
  } catch (error) {
    console.error("Erro ao carregar displays:", error);
    return [];
  }
};

export const getDisplayBySlug = async (slug: string, lastVersion?: number): Promise<Display | undefined> => {
  try {
    const url = lastVersion !== undefined 
      ? `/displays/slug/${slug}?lastVersion=${lastVersion}` 
      : `/displays/slug/${slug}`;
    return await api.get<Display>(url);
  } catch {
    return undefined;
  }
};

export const getDisplayById = async (id: string): Promise<Display | undefined> => {
  try {
    return await api.get<Display>(`/displays/${id}`);
  } catch {
    return undefined;
  }
};

// Versão pública (sem auth) — usada pelo Player (TV) após vinculação
export const getDisplayByIdPublic = async (id: string, lastVersion?: number): Promise<Display | undefined> => {
  try {
    const url = lastVersion !== undefined 
      ? `/displays/player/${id}?lastVersion=${lastVersion}` 
      : `/displays/player/${id}`;
    return await api.get<Display>(url);
  } catch {
    return undefined;
  }
};

// Retorna apenas o timestamp de atualização — ultra-leve (~20 bytes)
export const getDisplayVersion = async (slug: string, lastVersion?: number): Promise<number | null> => {
  try {
    const url = lastVersion !== undefined 
      ? `/displays/slug/${slug}/version?lastVersion=${lastVersion}` 
      : `/displays/slug/${slug}/version`;
    const result = await api.get<{ updatedAt: number } | null>(url);
    // null = 304 Not Modified (sem mudanças)
    if (result === null) return null;
    return result.updatedAt;
  } catch {
    return null;
  }
};

export const saveDisplay = async (display: Display): Promise<void> => {
  // Backend faz upsert via POST
  await api.post('/displays', {
    id: display.id,
    name: display.name,
    slug: display.slug,
    pages: display.pages,
    coverImage: display.coverImage && display.coverImage.trim() !== '' ? display.coverImage : null,
    orientation: display.orientation || 'horizontal',
  });
};

export const deleteDisplay = async (id: string): Promise<void> => {
  try {
    await api.delete(`/displays/${id}`);
  } catch (error) {
    console.error("Erro ao deletar display:", error);
  }
};

// ==============================================================================
// DEVICE FUNCTIONS
// ==============================================================================

export const getDevices = async (): Promise<Device[]> => {
  try {
    return await api.get<Device[]>('/devices');
  } catch (error) {
    console.error("Erro ao carregar dispositivos:", error);
    return [];
  }
};

export const registerDevice = async (deviceId: string, code: string): Promise<void> => {
  await api.post('/devices/register', {
    deviceId,
    code,
  });
};

export const checkDeviceStatus = async (deviceId: string): Promise<Device | null> => {
  try {
    return await api.get<Device>(`/devices/${deviceId}/status`);
  } catch {
    return null;
  }
};

export const linkDevice = async (code: string, displayId: string, name: string): Promise<boolean> => {
  try {
    await api.post('/devices/link', { code, displayId, name });
    return true;
  } catch {
    return false;
  }
};

export const unlinkDevice = async (deviceId: string): Promise<void> => {
  await api.delete(`/devices/${deviceId}`);
};

export const updateDeviceDisplay = async (deviceId: string, displayId: string): Promise<void> => {
  await api.patch(`/devices/${deviceId}/display`, { displayId });
};

export const heartbeatDevice = async (deviceId: string): Promise<void> => {
  try {
    await api.patch(`/devices/${deviceId}/heartbeat`);
  } catch {
    // Silencioso — heartbeat é best-effort
  }
};

// ==============================================================================
// BROADCAST FUNCTIONS
// ==============================================================================

export const getBroadcasts = async (): Promise<Broadcast[]> => {
  try {
    return await api.get<Broadcast[]>('/broadcasts');
  } catch (error) {
    console.error("Erro ao carregar programações:", error);
    return [];
  }
};

export const saveBroadcast = async (broadcast: Broadcast): Promise<void> => {
  // Backend faz upsert via POST
  await api.post('/broadcasts', {
    ...broadcast,
    orientation: broadcast.orientation || 'horizontal',
  });
};

export const deleteBroadcast = async (id: string): Promise<void> => {
  await api.delete(`/broadcasts/${id}`);
};

// ==============================================================================
// MEDIA FUNCTIONS
// ==============================================================================

export const uploadMedia = async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const result = await api.upload<{ url: string }>('/media/upload', formData);
    return result.url;
  } catch (error) {
    console.error("Erro no upload:", error);
    return null;
  }
};

export interface MediaFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    size: number;
    mimetype: string;
    cacheControl: string;
  };
  url: string;
}

export const listMedia = async (): Promise<MediaFile[]> => {
  try {
    return await api.get<MediaFile[]>('/media');
  } catch (error) {
    console.error("Erro ao listar mídia:", error);
    return [];
  }
};

export const deleteMedia = async (fileNames: string | string[]): Promise<boolean> => {
  const filesToDelete = Array.isArray(fileNames) ? fileNames : [fileNames];
  console.log(`[deleteMedia] Iniciando exclusão de ${filesToDelete.length} arquivo(s):`, filesToDelete);
  
  try {
    for (const name of filesToDelete) {
      await api.delete(`/media/${encodeURIComponent(name)}`);
    }
    console.log(`[deleteMedia] ${filesToDelete.length} arquivo(s) excluído(s) com sucesso.`);
    return true;
  } catch (error) {
    console.error(`[deleteMedia] Erro ao deletar a(s) mídia(s):`, error);
    return false;
  }
};
