import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, LogIn, Send } from 'lucide-react';
import { forgotPassword } from '../services/storage';
import { LogoHub } from './Login';
// tokens e efeitos do tema claro, antes do CSS da tela (mesma ordem do Login)
import './claro.css';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell auth-shell-unica">
        <main className="auth-coluna">
          <div className="auth-cartao">
            <div className="auth-topo-mobile">
              <LogoHub size={44} />
              <div>
                <h1 className="auth-titulo">Esqueceu a senha?</h1>
                <p className="auth-subtitulo">
                  Informe o e-mail da sua conta para criar uma senha nova.
                </p>
              </div>
            </div>

            <div className="auth-caixa">
              {success ? (
                <div className="auth-sucesso" role="status">
                  <span className="auth-sucesso-icone">
                    <CheckCircle2 size={28} aria-hidden="true" />
                  </span>
                  <h2 className="auth-sucesso-titulo">Confira seu e-mail</h2>
                  <p className="auth-sucesso-texto">
                    Se <strong>{email}</strong> estiver cadastrado, você vai receber as instruções
                    para redefinir a senha.
                  </p>
                  <p className="auth-dica">Olhe também a pasta de spam.</p>

                  <button
                    type="button"
                    className="auth-botao auth-botao-primario"
                    onClick={() => navigate('/login')}
                  >
                    <LogIn size={18} aria-hidden="true" />
                    Voltar para entrar
                  </button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} noValidate>
                    <fieldset className="auth-form" disabled={loading}>
                      <legend className="auth-legenda">Recuperar o acesso</legend>

                      <div className="auth-campo">
                        <label className="auth-rotulo" htmlFor="forgot-email">
                          Seu e-mail
                        </label>
                        <input
                          id="forgot-email"
                          name="email"
                          type="email"
                          className="auth-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@seunegocio.com.br"
                          autoComplete="email"
                          inputMode="email"
                          aria-invalid={!!error}
                          aria-describedby={error ? 'forgot-erro' : undefined}
                        />
                      </div>

                      {error && (
                        <div id="forgot-erro" role="alert" className="auth-erro-geral">
                          <span className="auth-erro-geral-linha">
                            <AlertCircle size={16} aria-hidden="true" />
                            {error}
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="auth-botao auth-botao-primario"
                        disabled={loading || !email}
                      >
                        {loading ? (
                          <Loader2 size={18} className="auth-girando" aria-hidden="true" />
                        ) : (
                          <Send size={18} aria-hidden="true" />
                        )}
                        {loading ? 'Enviando…' : 'Enviar link de redefinição'}
                      </button>
                    </fieldset>
                  </form>

                  <p className="auth-rodape-caixa">
                    Lembrou a senha?{' '}
                    <button type="button" className="auth-link" onClick={() => navigate('/login')}>
                      Voltar para entrar
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

export default ForgotPassword;
