/**
 * Chamadas do painel do funil. Fica isolado do `src/lib/api.ts` (que é do app
 * todo) para o checkout público nunca importar nada que carregue token de admin.
 */
import { api, setAdminToken } from '../lib/api';
import type {
  CheckoutMetrics,
  LoginResponse,
  RecoveryChannel,
  RecoveryResponse,
  SessionDetailResponse,
  SessionListFilters,
  SessionsResponse,
} from './types';

const USER_KEY = 'checkoutAdminUser';

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Login do TelaHub. A rota (`backend/src/routes/auth.routes.ts`) lê
 * `req.body.email`, mas `userService.login` aceita e-mail OU username no mesmo
 * campo. Mandamos o identificador nas duas chaves para funcionar com qualquer
 * uma das duas formas, sem depender de qual delas a rota vai ler amanhã.
 */
export function login(identifier: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', {
    email: identifier,
    username: identifier,
    password,
  });
}

export function fetchSessions(filters: SessionListFilters = {}): Promise<SessionsResponse> {
  return api.get<SessionsResponse>(`/checkout/admin/sessions${query({ ...filters })}`, true);
}

export function fetchSessionDetail(id: string): Promise<SessionDetailResponse> {
  return api.get<SessionDetailResponse>(`/checkout/admin/sessions/${encodeURIComponent(id)}`, true);
}

export function fetchMetrics(range: { startDate?: string; endDate?: string } = {}): Promise<CheckoutMetrics> {
  return api.get<CheckoutMetrics>(`/checkout/admin/metrics${query({ ...range })}`, true);
}

/**
 * REGISTRA que o contato de recuperação foi feito. Não envia mensagem nenhuma:
 * não existe integração de WhatsApp nem disparo de e-mail nesta frente. A
 * interface tem de dizer isso — ver `RecoveryModal`.
 */
export function registerRecovery(
  id: string,
  body: { channel: RecoveryChannel; note?: string }
): Promise<RecoveryResponse> {
  return api.post<RecoveryResponse>(
    `/checkout/admin/sessions/${encodeURIComponent(id)}/recovery`,
    body,
    true
  );
}

// ─── Sessão local do operador ────────────────────────────────────────────────

export interface StoredAdminUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: string;
}

export function getStoredUser(): StoredAdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminUser;
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredAdminUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage bloqueado (modo privado): segue sem persistir.
  }
}

/** Derruba token + usuário. Usado no logout e em qualquer 401. */
export function clearAdminSession(): void {
  setAdminToken(null);
  setStoredUser(null);
}
