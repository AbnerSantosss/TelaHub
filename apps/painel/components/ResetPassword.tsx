import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn } from 'lucide-react';
import { resetPassword } from '../services/storage';
import { LogoHub } from './Login';
// tokens e efeitos do tema claro, antes do CSS da tela (mesma ordem do Login)
import './claro.css';
import './Auth.css';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Link de redefinição inválido. Solicite um novo link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  // Mesma régua do medidor de antes: o tamanho da senha define a cor e quantas
  // barras acendem. O rótulo em texto acompanha, porque cor sozinha não basta.
  const nivel = password.length >= 10 ? 'boa' : password.length >= 7 ? 'media' : 'fraca';
  const rotuloNivel = { boa: 'Senha boa', media: 'Senha média', fraca: 'Senha fraca' }[nivel];

  return (
    <div className="auth-page">
      <div className="auth-shell auth-shell-unica">
        <main className="auth-coluna">
          <div className="auth-cartao">
            <div className="auth-topo-mobile">
              <LogoHub size={44} />
              <div>
                <h1 className="auth-titulo">Criar nova senha</h1>
                <p className="auth-subtitulo">Use pelo menos 6 caracteres.</p>
              </div>
            </div>

            <div className="auth-caixa">
              {success ? (
                <div className="auth-sucesso" role="status">
                  <span className="auth-sucesso-icone">
                    <CheckCircle2 size={28} aria-hidden="true" />
                  </span>
                  <h2 className="auth-sucesso-titulo">Senha alterada</h2>
                  <p className="auth-sucesso-texto">
                    Pronto. Agora você já pode entrar com a nova senha.
                  </p>

                  <button
                    type="button"
                    className="auth-botao auth-botao-primario"
                    onClick={() => navigate('/login')}
                  >
                    <LogIn size={18} aria-hidden="true" />
                    Ir para entrar
                  </button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} noValidate>
                    <fieldset className="auth-form" disabled={loading}>
                      <legend className="auth-legenda">Definir uma nova senha</legend>

                      <div className="auth-campo">
                        <label className="auth-rotulo" htmlFor="reset-senha">
                          Nova senha
                        </label>
                        <div className="auth-campo-senha">
                          <input
                            id="reset-senha"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo de 6 caracteres"
                            autoComplete="new-password"
                            minLength={6}
                            aria-invalid={!!error}
                            aria-describedby={error ? 'reset-erro' : undefined}
                          />
                          <button
                            type="button"
                            className="auth-olho"
                            onClick={() => setShowPassword(!showPassword)}
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

                      <div className="auth-campo">
                        <label className="auth-rotulo" htmlFor="reset-confirmar">
                          Confirmar nova senha
                        </label>
                        <input
                          id="reset-confirmar"
                          name="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          className="auth-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          autoComplete="new-password"
                          aria-invalid={!!error}
                          aria-describedby={error ? 'reset-erro' : undefined}
                        />
                      </div>

                      {/* Medidor de tamanho da senha */}
                      {password && (
                        <div className="auth-campo">
                          <div className="auth-forca" data-nivel={nivel} aria-hidden="true">
                            {[1, 2, 3, 4].map((i) => (
                              <span key={i} data-ligado={password.length >= i * 3 ? '' : undefined} />
                            ))}
                          </div>
                          <p className="auth-dica">{rotuloNivel}</p>
                        </div>
                      )}

                      {error && (
                        <div id="reset-erro" role="alert" className="auth-erro-geral">
                          <span className="auth-erro-geral-linha">
                            <AlertCircle size={16} aria-hidden="true" />
                            {error}
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="auth-botao auth-botao-primario"
                        disabled={loading || !token || !password || !confirmPassword}
                      >
                        {loading ? (
                          <Loader2 size={18} className="auth-girando" aria-hidden="true" />
                        ) : (
                          <KeyRound size={18} aria-hidden="true" />
                        )}
                        {loading ? 'Salvando…' : 'Redefinir senha'}
                      </button>
                    </fieldset>
                  </form>

                  <p className="auth-rodape-caixa">
                    {token ? 'Lembrou a senha?' : 'Precisa de outro link?'}{' '}
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => navigate(token ? '/login' : '/forgot-password')}
                    >
                      {token ? 'Voltar para entrar' : 'Pedir novo link'}
                    </button>
                  </p>
                </>
              )}
            </div>

            <p className="auth-rodape">© {new Date().getFullYear()} TelaHub</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResetPassword;
