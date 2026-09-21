/**
 * Carregamento de dado do painel com os três estados obrigatórios (carregando,
 * erro, dado) e o tratamento dos dois HTTP que mudam o rumo da navegação:
 *
 *   401 → token expirado: limpa a sessão e volta ao login dizendo por quê;
 *   403 → a conta entrou, mas não é `master`: o funil não é dela. Vira um
 *         estado explicado na tela, nunca uma tela vazia.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { isApiError } from '../lib/api';
import { clearAdminSession } from './api';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 403 — falta permissão, não é falha técnica. Merece texto próprio. */
  forbidden: boolean;
}

export function useAdminQuery<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>
): [QueryState<T>, () => void, (updater: (current: T) => T) => void] {
  const navigate = useNavigate();
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
    forbidden: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  // O loader é recriado a cada render; a lista de deps é que define quando
  // recarregar. Guardar em ref evita disparar a cada render sem precisar de
  // `useCallback` em toda tela.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let alive = true;
    setState((current) => ({ ...current, loading: true, error: null, forbidden: false }));

    loaderRef
      .current()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null, forbidden: false });
      })
      .catch((error: unknown) => {
        if (!alive) return;

        if (isApiError(error) && error.status === 401) {
          clearAdminSession();
          navigate('/admin/login?motivo=expirado', { replace: true });
          return;
        }

        if (isApiError(error) && error.status === 403) {
          setState({ data: null, loading: false, error: error.message, forbidden: true });
          return;
        }

        setState({
          data: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível falar com o servidor. Verifique a conexão.',
          forbidden: false,
        });
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps]);

  const reload = () => setReloadKey((key) => key + 1);

  /** Atualiza o dado em memória (ex.: após registrar contato) sem refetch. */
  const patch = (updater: (current: T) => T) =>
    setState((current) => (current.data === null ? current : { ...current, data: updater(current.data) }));

  return [state, reload, patch];
}
