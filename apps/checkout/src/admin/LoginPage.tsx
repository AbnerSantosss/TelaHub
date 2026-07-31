/**
 * Login do painel do funil.
 *
 * O ponto delicado desta tela: o login do TelaHub aceita qualquer papel, mas o
 * funil é restrito a `master` (contém lead de toda a plataforma, sem recorte de
 * tenant possível — ver o comentário em `checkout-admin.routes.ts`). Uma conta
 * `admin` autentica com sucesso e depois toma 403 em toda chamada do painel.
 *
 * Por isso o login faz uma SONDAGEM depois de autenticar: se o painel responder
 * 403, a sessão é derrubada aqui mesmo e a pessoa lê o motivo. Deixar entrar
 * para cair numa tela vazia com "erro ao carregar" é o pior dos dois mundos —
 * parece defeito do sistema quando é regra de permissão.
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';

import { isApiError, setAdminToken } from '../lib/api';
import { clearAdminSession, fetchSessions, login, setStoredUser } from './api';
import { Button, Field, inputClass } from './ui';

interface LocationState {
  from?: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 403: credencial certa, papel errado. Texto e tom diferentes de erro comum. */
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const expired = params.get('motivo') === 'expirado';
  const from = (location.state as LocationState | null)?.from;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setPermissionError(null);

    if (!identifier.trim() || !password) {
      setError('Informe o e-mail (ou usuário) e a senha.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(identifier.trim(), password);
      setAdminToken(result.token);
      setStoredUser({
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      });

      // Sondagem barata (1 registro) só para confirmar que este papel tem acesso
      // ao funil antes de mandar a pessoa para dentro.
      try {
        await fetchSessions({ page: 1, pageSize: 1 });
      } catch (probeError) {
        if (isApiError(probeError) && probeError.status === 403) {
          clearAdminSession();
          setPermissionError(
            `A conta “${result.user.email}” entrou, mas tem papel “${result.user.role}”. ` +
              'O funil de checkout reúne leads de toda a plataforma, então só o papel “master” pode abri-lo. ' +
              'Peça a um master do TelaHub para consultar o funil ou para elevar o seu acesso.'
          );
          return;
        }
        throw probeError;
      }

      navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (loginError) {
      if (isApiError(loginError)) {
        if (loginError.status === 401) {
          setError('E-mail/usuário ou senha incorretos.');
        } else if (loginError.status === 429) {
          setError('Muitas tentativas seguidas. Aguarde um instante e tente de novo.');
        } else {
          setError(loginError.message);
        }
      } else {
        setError('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.');
      }
      clearAdminSession();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="eyebrow mb-2">TelaHub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Painel do funil</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Checkouts iniciados, abandonos e contratações.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="rounded-xl border border-line bg-surface p-5 sm:p-6"
        >
          {expired && !error && !permissionError && (
            <p
              role="status"
              className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-[#92400E]"
            >
              Sua sessão expirou por inatividade. Entre novamente para continuar.
            </p>
          )}

          {permissionError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-3"
            >
              <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="text-[13px] font-bold text-ink">Sem permissão para ver o funil</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{permissionError}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Field label="E-mail ou usuário" htmlFor="login-identifier">
              <input
                id="login-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                autoFocus
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className={inputClass}
                placeholder="voce@telahub.com.br"
                aria-invalid={error ? true : undefined}
              />
            </Field>

            <Field label="Senha" htmlFor="login-password">
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                  aria-invalid={error ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-2 text-ink-subtle transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-[13px] font-medium text-[#B91C1C]">
              <ShieldAlert aria-hidden="true" className="mt-px h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" loading={submitting} className="mt-5 w-full py-2.5">
            <Lock aria-hidden="true" className="h-4 w-4" />
            {submitting ? 'Entrando…' : 'Entrar no painel'}
          </Button>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
            É a mesma conta do painel do TelaHub. O funil exige papel <strong>master</strong>.
          </p>
        </form>

        <p className="mt-5 text-center text-xs text-ink-subtle">
          <Link to="/admin" className="font-semibold text-accent hover:underline">
            Voltar ao painel
          </Link>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
