
// ==============================================================================
// API CLIENT - Comunicação com o backend Express
// ==============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Erro de API que preserva o status HTTP.
 * Continua sendo um `Error` com a mesma `message` de antes (a mensagem que o
 * backend mandou em `error`), então todo o código que só lê `err.message`
 * continua funcionando — mas agora dá para diferenciar 402/403/409.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

/** Extrai a mensagem enviada pela API, com fallback controlado pelo chamador. */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};

const throwApiError = async (res: Response): Promise<never> => {
  const payload = await res.json().catch(() => null);
  const message =
    payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : res.statusText || `Erro ${res.status}`;

  throw new ApiError(res.status, message, payload);
};

let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => authToken;

/**
 * Organização sobre a qual as requisições operam.
 *
 * Só tem efeito para o role `master`, que não é vinculado a nenhuma organização
 * e por isso precisa declarar o escopo a cada requisição (o backend lê o header
 * `X-Organization-Id` em `requireTenant`). Para os demais roles o servidor
 * ignora o header e usa o `organizationId` do próprio usuário.
 *
 * Sem isto, o `master` operava com escopo nulo e as rotas de mídia recusavam o
 * upload ("Escopo de organização ausente no upload") antes de gravar o arquivo.
 */
const ORGANIZATION_HEADER = 'X-Organization-Id';
const SELECTED_ORG_STORAGE_KEY = 'selectedOrgId';

let activeOrganizationId: string | null = localStorage.getItem(SELECTED_ORG_STORAGE_KEY);

export const setActiveOrganizationId = (organizationId: string | null) => {
  activeOrganizationId = organizationId;
  if (organizationId) {
    localStorage.setItem(SELECTED_ORG_STORAGE_KEY, organizationId);
  } else {
    localStorage.removeItem(SELECTED_ORG_STORAGE_KEY);
  }
};

export const getActiveOrganizationId = (): string | null => activeOrganizationId;

const getHeaders = (isJson = true): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (activeOrganizationId) headers[ORGANIZATION_HEADER] = activeOrganizationId;
  return headers;
};

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = getHeaders();

    const res = await fetch(`${API_BASE}${path}`, { headers });

    if (!res.ok) await throwApiError(res);

    return res.json();
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async put<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async patch<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (activeOrganizationId) headers[ORGANIZATION_HEADER] = activeOrganizationId;
    // Não define Content-Type — o browser seta boundary automaticamente
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  getMediaUrl(filename: string): string {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    // Remove /api do final para construir URL de uploads
    const serverBase = base.replace(/\/api$/, '');
    return `${serverBase}/uploads/${filename}`;
  }
};
