// Quem já tem conta no painel e chega ao checkout pelo mesmo domínio.
//
// Por que isto funciona: painel (`/app/`) e checkout (`/checkout/`) passaram a
// morar no mesmo origin, então o `localStorage.authToken` que o painel grava no
// login é legível aqui. Com ele dá para perguntar ao backend quem é a pessoa e
// poupar a digitação de nome e e-mail.
//
// ⚠️ O E-MAIL É O QUE AMARRA A COMPRA À CONTA. O `paid.handler.ts` procura o
// usuário pelo e-mail da sessão e, achando, ativa o plano na organização dele
// em vez de criar uma conta nova. Por isso, enquanto houver usuário logado, o
// e-mail da identificação é o da conta e o campo fica travado: trocar o e-mail
// aqui criaria uma SEGUNDA organização, e a pessoa pagaria um plano que não
// aparece no painel que ela usa. Quem quer comprar para outra conta clica em
// "sair" e segue como visitante.
//
// Token ausente, vencido ou recusado: o checkout segue como visitante, sem
// aviso nenhum. Não é erro, é o caso comum de quem vem direto do anúncio.
import { useCallback, useEffect, useState } from 'react';

// Mesmas chaves que `apps/painel/libs/api.ts` grava.
const AUTH_TOKEN_KEY = 'authToken';
const SELECTED_ORG_KEY = 'selectedOrgId';

/** Mesmo prefixo de `lib/api.ts`: o Nginx faz o proxy de `/api` para o backend. */
const ME_URL = '/api/auth/me';

export interface LoggedUser {
  id: string;
  name: string;
  email: string;
  organizationId: string | null;
}

const readKey = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage bloqueado (modo privado): ninguém logado.
    return null;
  }
};

const isLoggedUser = (value: unknown): value is LoggedUser => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.email === 'string' && !!candidate.email;
};

export function useLoggedUser() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  // Começa em `true` só quando há token: sem token não há o que esperar, e a
  // identificação não precisa piscar um estado de carga.
  const [loading, setLoading] = useState<boolean>(() => !!readKey(AUTH_TOKEN_KEY));

  useEffect(() => {
    const token = readKey(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const orgId = readKey(SELECTED_ORG_KEY);
    if (orgId) headers['X-Organization-Id'] = orgId;

    fetch(ME_URL, { headers })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled) return;
        setUser(
          isLoggedUser(payload)
            ? {
                id: payload.id,
                name: typeof payload.name === 'string' ? payload.name : '',
                email: payload.email.trim().toLowerCase(),
                organizationId:
                  typeof payload.organizationId === 'string' ? payload.organizationId : null,
              }
            : null
        );
      })
      // Rede fora ou resposta que não é JSON: segue como visitante.
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * "Não é você? Sair."
   *
   * Apaga o token do painel e não só o estado local: no mesmo domínio a sessão
   * é uma só, e deixar o token lá faria a próxima visita ao checkout (ou ao
   * painel) entrar de novo na conta de quem disse não ser a pessoa.
   */
  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(SELECTED_ORG_KEY);
    } catch {
      // localStorage bloqueado: o estado local abaixo já basta para esta aba.
    }
    setUser(null);
  }, []);

  return { user, loading, signOut };
}
