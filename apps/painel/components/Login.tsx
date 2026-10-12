import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { login } from '../services/storage';
import { isApiError } from '../libs/api';
// tokens e efeitos do tema claro, antes do CSS da tela
import './claro.css';
import './Auth.css';

// Marca do produto: quatro telas ligadas entre si.
//
// Continua exportado daqui porque `ForgotPassword`, `ResetPassword` e o
// `Toolbar` do editor importam este mesmo componente — o Toolbar vive em fundo
// escuro. Por isso os traços seguem pintados com `var(--brand-accent)` em vez de
// uma cor fixa: cada tela decide o valor. `Auth.css` redefine a variável dentro
// de `.auth-page` para o azul da marca (#0369a1), que é legível no fundo claro.
export const LogoHub: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} relative z-10`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Grade 2x2: as telas do lugar */}
      <rect x="15" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="none" />
      <rect x="55" y="15" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="none" />
      <rect x="15" y="53" width="30" height="24" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="none" />
      <rect x="55" y="53" width="30" height="32" rx="2" stroke="var(--brand-accent)" strokeWidth="3.5" fill="none" />

      {/* Ligações entre elas */}
      <path d="M45 27H55" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M45 65H55" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M30 39V53" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />
      <path d="M70 39V53" stroke="var(--brand-accent)" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.75" />

      {/* Centro: o painel */}
      <circle cx="50" cy="46" r="5" fill="var(--brand-accent)" />
    </svg>
  );
};

// Atalho de entrada usado SÓ na máquina de desenvolvimento.
//
// `import.meta.env.DEV` é substituído por `false` no `npm run build`, então todo
// o bloco (botão, função e as duas variáveis) é eliminado do bundle publicado.
// As credenciais vêm de `.env` local, nunca do código.
//
// ARMADILHA QUE JÁ ACONTECEU (auditoria de 05/09): esta constante existia e o
// JSX não a usava — o botão "Entrada Rápida Admin" era renderizado em produção,
// e a função por trás dele carregava o e-mail e a senha do admin como
// valor padrão. Qualquer visitante da tela de login via o par no JS e podia
// tentá-lo. Constante de segurança que não aparece numa condição do JSX é
// decoração; a guarda tem que estar no `{SHOW_DEV_LOGIN && ...}` lá embaixo.
//
// Além do admin, há uma conta por plano (seed `db:seed-demo-users` da API) para
// conferir o que cada plano enxerga e se os bloqueios de recurso funcionam.
// Cada botão só aparece se o e-mail e a senha dele estiverem no `.env`.
interface DevAccount {
  label: string;
  email?: string;
  password?: string;
}

const DEV_PLAN_PASSWORD = import.meta.env.VITE_DEV_PLAN_PASSWORD as string | undefined;
const DEV_ACCOUNTS: DevAccount[] = import.meta.env.DEV
  ? [
      {
        label: 'Entrar como admin',
        email: import.meta.env.VITE_DEV_MASTER_EMAIL as string | undefined,
        password: import.meta.env.VITE_DEV_MASTER_PASSWORD as string | undefined,
      },
      {
        label: 'Entrar como plano Grátis',
        email: import.meta.env.VITE_DEV_GRATIS_EMAIL as string | undefined,
        password: DEV_PLAN_PASSWORD,
      },
      {
        label: 'Entrar como plano Loja',
        email: import.meta.env.VITE_DEV_LOJA_EMAIL as string | undefined,
        password: DEV_PLAN_PASSWORD,
      },
      {
        label: 'Entrar como plano Rede',
        email: import.meta.env.VITE_DEV_REDE_EMAIL as string | undefined,
        password: DEV_PLAN_PASSWORD,
      },
    ].filter((a) => !!a.email && !!a.password)
  : [];
const SHOW_DEV_LOGIN = import.meta.env.DEV && DEV_ACCOUNTS.length > 0;

/**
 * Erro de login em português, para a pessoa e não para o console.
 *
 * ARMADILHA: só um `ApiError` significa que o servidor respondeu. Qualquer
 * outro `Error` que chega aqui vem da própria camada de rede — e a mensagem
 * dele é "Failed to fetch", texto técnico em inglês que aparecia na tela de
 * entrada de um produto brasileiro. Quem lê isso conclui que o sistema
 * quebrou. Por isso a `message` do erro só é aproveitada quando é `ApiError`.
 *
 * A tradução de "Email not confirmed" que existia aqui foi REMOVIDA: era
 * herança do Supabase e o backend atual não tem confirmação por e-mail — a
 * mensagem mandava a pessoa conferir uma caixa de entrada onde nunca chegaria
 * nada, e ela ficava esperando um e-mail para poder entrar.
 */
const mensagemDeErro = (e: unknown): string => {
  if (isApiError(e)) {
    if (e.message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    return e.message.trim() || 'Não conseguimos entrar agora. Tente de novo.';
  }
  return 'Sem conexão com o servidor agora. Verifique sua internet e tente de novo.';
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('officecom_saved_user');
    if (savedUser) {
      setEmail(savedUser);
      setRememberMe(true);
    }
  }, []);

  const finishLogin = (usedEmail: string) => {
    if (rememberMe) {
      localStorage.setItem('officecom_saved_user', usedEmail);
    } else {
      localStorage.removeItem('officecom_saved_user');
    }
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const user = await login(email, password);
      if (user) {
        finishLogin(email);
      } else {
        setError('Entramos, mas não encontramos sua conta. Fale com a gente pelo suporte.');
      }
    } catch (e: any) {
      console.error(e);
      setError(mensagemDeErro(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (account: DevAccount) => {
    if (!SHOW_DEV_LOGIN || loading) return;

    // Sem valor padrão: o filtro de `DEV_ACCOUNTS` já garante que os dois vieram do `.env`.
    const devEmail = account.email as string;
    const devPassword = account.password as string;

    setEmail(devEmail);
    setPassword(devPassword);
    setLoading(true);
    setError('');

    try {
      const user = await login(devEmail, devPassword);
      if (user) finishLogin(devEmail);
      else setError('Entramos, mas não encontramos essa conta.');
    } catch (e: any) {
      console.error(e);
      setError(mensagemDeErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        {/* Coluna de continuidade com a landing — só no desktop. */}
        <aside className="auth-vitrine">
          <div className="auth-marca">
            <LogoHub size={34} />
            <span className="auth-marca-nome">
              Tela<em>Hub</em>
            </span>
          </div>

          <div>
            <h2 className="auth-vitrine-titulo">Troque o que aparece na sua TV em um minuto.</h2>
            <p className="auth-vitrine-texto">
              Entre e troque o aviso, a oferta ou a agenda do dia. O que você publicar aqui aparece
              na TV do seu lugar na hora.
            </p>
          </div>

          {/* Segmentos em pé de igualdade: o produto é o mesmo em todos. */}
          <ul className="auth-lugares">
            <li>Portaria de condomínio</li>
            <li>Recepção de empresa</li>
            <li>Sala de espera de clínica</li>
            <li>Vitrine de loja</li>
            <li>Grade da academia</li>
            <li>Balcão da padaria</li>
          </ul>

          <ul className="auth-provas">
            <li>
              <Check size={18} aria-hidden="true" />
              <span>A primeira tela é grátis para sempre e não pede cartão.</span>
            </li>
            <li>
              <Check size={18} aria-hidden="true" />
              <span>Para conectar a TV, basta digitar um código. Não precisa de pen-drive nem de técnico.</span>
            </li>
            <li>
              <Check size={18} aria-hidden="true" />
              <span>Se uma tela parar de responder, você recebe um e-mail avisando.</span>
            </li>
          </ul>
        </aside>

        {/* Coluna do formulário */}
        <main className="auth-coluna">
          <div className="auth-cartao">
            <div className="auth-topo-mobile">
              <LogoHub size={44} />
              <div>
                <h1 className="auth-titulo">Entrar no TelaHub</h1>
                <p className="auth-subtitulo">Publique o aviso do dia na TV do seu lugar.</p>
              </div>
            </div>

            {/* Mesma promessa da landing, palavra por palavra. Quem clicou no
                anúncio acabou de ler essa frase; repeti-la aqui é o que diz
                "você chegou no lugar certo". */}
            <p className="auth-promessa">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                <strong>A primeira tela é grátis para sempre e não pede cartão.</strong>
              </span>
            </p>

            <div className="auth-caixa">
              <form onSubmit={handleLogin} noValidate>
                <fieldset className="auth-form" disabled={loading}>
                  <legend className="auth-legenda">Entrar na sua conta</legend>

                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="login-email">
                      Seu e-mail
                    </label>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@seunegocio.com.br"
                      autoComplete="username"
                      inputMode="email"
                      aria-invalid={!!error}
                      aria-describedby={error ? 'login-erro' : undefined}
                    />
                  </div>

                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="login-senha">
                      Senha
                    </label>
                    <div className="auth-campo-senha">
                      <input
                        id="login-senha"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        autoComplete="current-password"
                        aria-invalid={!!error}
                        aria-describedby={error ? 'login-erro' : undefined}
                      />
                      <button
                        type="button"
                        className="auth-olho"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="auth-linha-opcoes">
                    <label className="auth-checkbox" htmlFor="login-lembrar">
                      <input
                        id="login-lembrar"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Lembrar meu e-mail</span>
                    </label>

                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Esqueci a senha
                    </button>
                  </div>

                  {/* Erro descrito em texto e com ícone — cor sozinha não
                      comunica nada para daltônico nem para leitor de tela. */}
                  {error && (
                    <div id="login-erro" role="alert" className="auth-erro-geral">
                      <span className="auth-erro-geral-linha">
                        <AlertCircle size={16} aria-hidden="true" />
                        {error}
                      </span>
                      {error.includes('incorretos') && (
                        <span className="auth-erro-geral-extra">
                          Use o e-mail completo, com o que vem depois do @.
                        </span>
                      )}
                    </div>
                  )}

                  <button type="submit" className="auth-botao auth-botao-primario" disabled={loading}>
                    {loading ? (
                      <Loader2 size={18} className="auth-girando" aria-hidden="true" />
                    ) : (
                      <LogIn size={18} aria-hidden="true" />
                    )}
                    {loading ? 'Entrando…' : 'Entrar'}
                  </button>
                </fieldset>
              </form>

              {/* Bloco de desenvolvimento: some inteiro do bundle publicado
                  porque `import.meta.env.DEV` vira `false` no build. */}
              {SHOW_DEV_LOGIN && (
                <div className="auth-dev">
                  <p className="auth-dev-aviso">
                    Atalho de desenvolvimento. Só existe com <code>npm run dev</code> e com as
                    variáveis <code>VITE_DEV_*</code> no <code>.env</code> local.
                  </p>
                  {DEV_ACCOUNTS.map((account) => (
                    <button
                      key={account.label}
                      type="button"
                      className="auth-botao auth-botao-secundario"
                      onClick={() => handleDevLogin(account)}
                      disabled={loading}
                    >
                      {account.label}
                    </button>
                  ))}
                </div>
              )}

              <p className="auth-rodape-caixa">
                Ainda não tem conta?{' '}
                <button type="button" className="auth-link" onClick={() => navigate('/signup')}>
                  Criar conta grátis
                </button>
              </p>
            </div>

            <p className="auth-rodape">© {new Date().getFullYear()} TelaHub</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
