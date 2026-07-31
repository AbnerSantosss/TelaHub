// Cliente HTTP do app de checkout.
//
// Em produção o Nginx faz o proxy de `/api` para o backend, então o caminho é
// sempre relativo — nunca embutir host, para o mesmo build servir em qualquer
// domínio (checkout próprio, subdomínio, ou atrás do Cloudflare Tunnel).
const BASE = '/api';

const TOKEN_KEY = 'checkoutAdminToken';

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    if (payload && typeof payload === 'object' && 'code' in payload) {
      this.code = String((payload as { code: unknown }).code);
    }
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** Token do admin. Só o painel usa — o checkout público é anônimo por design. */
export const getAdminToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage bloqueado (modo privado): segue sem persistir.
  }
};

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? 'Não foi possível concluir a operação.';
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>('GET', path, undefined, auth),
  post: <T>(path: string, body?: unknown, auth = false) => request<T>('POST', path, body, auth),
  patch: <T>(path: string, body?: unknown, auth = false) => request<T>('PATCH', path, body, auth),
};
