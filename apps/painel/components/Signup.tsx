import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, Info, Loader2, UserPlus } from 'lucide-react';
import { api, setAuthToken, isApiError, getApiErrorMessage } from '../libs/api';
import { EVENT, META_EVENT, newEventId, readFbCookies, track } from '../libs/tracking';
import { SITE_URL } from '../libs/external-urls';
import type { SignupResponse } from '../types';
import { LogoHub } from './Login';
// tokens e efeitos do tema claro, antes do CSS da tela
import './claro.css';
import './Auth.css';

type FieldName = 'companyName' | 'name' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Versão dos documentos aceitos no cadastro.
 *
 * Vai junto no corpo do POST e fica gravada na conta. Sem isso, uma revisão
 * futura dos Termos apaga a prova de o que exatamente a pessoa aceitou — e o
 * registro do aceite é a peça que o CDC e a LGPD (art. 8º, §1º) pedem quando
 * alguém contesta a cobrança. Ao publicar uma revisão, mude a data AQUI.
 */
const TERMS_VERSION = '2026-09-05';
const PRIVACY_VERSION = '2026-09-05';

// Um subdomínio só para o site (ver `libs/external-urls.ts`); as páginas moram lá.
const TERMS_URL = `${SITE_URL}/termos`;
const PRIVACY_URL = `${SITE_URL}/privacidade`;

/**
 * Exemplos de nome de organização, rotacionando.
 *
 * A ordem é deliberada e os segmentos entram em pé de igualdade: o TelaHub é
 * horizontal. Fixar um exemplo de lanchonete faz o síndico e o gerente de
 * clínica pensarem "não é para mim" no primeiro campo do formulário — que é o
 * campo mais caro da jornada inteira, porque veio de clique pago.
 */
const EXEMPLOS_ORGANIZACAO = [
  'Ex.: Condomínio Jardins',
  'Ex.: Clínica Vida',
  'Ex.: Padaria do Sol',
  'Ex.: Academia Corpo e Movimento',
];

export interface SignupAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landingPath?: string;
}

/**
 * Lê a atribuição da URL de entrada.
 *
 * ARMADILHA: o painel usa `HashRouter`. O site monta o link como
 * `https://painel.../?utm_source=...#/signup` — a query vem ANTES do `#` de
 * propósito (ver `apps/site/src/lib/funnel.js`). Depois do `#` ela viraria
 * parte da rota e `window.location.search` voltaria vazio: o cadastro chegaria
 * sem origem nenhuma e a campanha inteira ficaria sem custo por conta criada.
 * Por isso lemos de `location.search`, nunca do hash.
 */
function readAttribution(): SignupAttribution {
  if (typeof window === 'undefined') return {};
  try {
    const p = new URLSearchParams(window.location.search);
    const pick = (key: string) => p.get(key) || undefined;
    return {
      utmSource: pick('utm_source'),
      utmMedium: pick('utm_medium'),
      utmCampaign: pick('utm_campaign'),
      utmContent: pick('utm_content'),
      utmTerm: pick('utm_term'),
      gclid: pick('gclid'),
      fbclid: pick('fbclid'),
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      landingPath: `${window.location.pathname}${window.location.hash}`,
    };
  } catch {
    // Atribuição é diagnóstico: nunca pode impedir alguém de criar a conta.
    return {};
  }
}

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false); // NUNCA nasce marcado
  /**
   * Opt-in de novidades — OPCIONAL, e também nunca nasce marcado.
   *
   * É um consentimento SEPARADO do aceite dos Termos, e a separação é o item
   * inteiro: juntar os dois numa frase só (ou pré-marcar) transforma condição
   * do serviço em captura de base de marketing, que é exatamente o que invalida
   * o consentimento na LGPD (art. 8º, §§3º e 4º) — e o consentimento inválido
   * não é neutro: derruba a base legal de TODA a lista, não só desta conta.
   *
   * Também não pode travar o cadastro. Quem não quer novidades cria a conta
   * igual.
   */
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // A atribuição é capturada UMA vez, na montagem: se a pessoa navegar dentro
  // do painel antes de enviar, a URL muda e a origem se perde.
  const [attribution] = useState<SignupAttribution>(() => readAttribution());

  // Exemplo do campo de organização, rotacionando devagar.
  const [exemploIndex, setExemploIndex] = useState(0);
  useEffect(() => {
    if (companyName) return; // já digitou: para de trocar debaixo do dedo dela
    const id = window.setInterval(() => {
      setExemploIndex((i) => (i + 1) % EXEMPLOS_ORGANIZACAO.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [companyName]);

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!companyName.trim()) {
      errors.companyName = 'Diga o nome do seu lugar. É ele que aparece no painel.';
    }
    if (!name.trim()) {
      errors.name = 'Informe o seu nome.';
    }
    if (!email.trim()) {
      errors.email = 'Informe o seu e-mail.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Esse e-mail parece incompleto. Confira o que vem depois do @.';
    }
    if (!password) {
      errors.password = 'Crie uma senha.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Repita a senha para confirmar.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'As duas senhas estão diferentes.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // trava dupla contra duplo cadastro
    if (!acceptedTerms) return; // o botão já está travado; isto é o cinto de segurança

    setFormError('');
    setEmailAlreadyUsed(false);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.keys(errors)[0] as FieldName;
      document.getElementById(`signup-${first}`)?.focus();
      return;
    }

    setLoading(true);

    // O id nasce ANTES do pedido porque a MESMA string precisa ir para os dois
    // lados: o corpo do POST (o servidor repete o evento pela Conversions API) e
    // o Pixel do navegador, mais abaixo. Id diferente entre navegador e servidor
    // faz a Meta contar a conversão DUAS vezes — sem nenhum erro aparecer, e com
    // todo custo por resultado do painel caindo pela metade.
    const metaEventId = newEventId();
    const { fbp, fbc } = readFbCookies();

    try {
      // Chamamos `POST /api/signup` direto (e não `services/storage.signup()`)
      // porque aquele helper só encaminha os quatro campos do formulário, e o
      // aceite dos Termos, a atribuição e o id de deduplicação precisam chegar
      // no servidor no MESMO pedido que cria a conta. Gravar o aceite depois,
      // numa segunda chamada, deixaria uma janela em que existe conta sem prova
      // de consentimento — exatamente o que a LGPD pede para não existir.
      const result = await api.post<SignupResponse>('/signup', {
        companyName: companyName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,

        // Consentimento (LGPD art. 8º / CDC): o que foi aceito e qual versão.
        acceptedTerms: true,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,

        // Novidades por e-mail: consentimento à parte, e vai o valor REAL da
        // caixa — nunca `true` fixo como o `acceptedTerms` acima (aquele pode
        // ser fixo porque o envio nem acontece sem ele). É este campo que
        // decide se a conta entra na régua de campanha; mandar `true` por
        // descuido cria base de marketing sem consentimento, e o estrago só
        // aparece no primeiro disparo, quando já foi.
        marketingOptIn,

        // De onde veio esta conta.
        attribution,

        // Deduplicação Pixel × Conversions API.
        metaEventId,
        fbp,
        fbc,
      });

      // O token é persistido aqui, igual ao que `storage.signup()` fazia.
      setAuthToken(result.token);

      // Só agora: o evento marca CONTA CRIADA. Disparar antes da resposta
      // contaria como conversão todo formulário que o servidor recusou.
      track({
        event: EVENT.SIGN_UP,
        params: {
          method: 'email',
          plan: 'gratis',
          org_id: result.user?.organizationId ?? undefined,
        },
        metaEvent: META_EVENT.COMPLETE_REGISTRATION,
        eventId: metaEventId,
      });

      navigate('/', { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setEmailAlreadyUsed(true);
        setFormError(getApiErrorMessage(err, 'Este e-mail já tem conta no TelaHub.'));
      } else if (isApiError(err)) {
        setFormError(
          getApiErrorMessage(err, 'Não conseguimos criar sua conta agora. Tente de novo.'),
        );
      } else {
        // Não é `ApiError`: o servidor nem respondeu (rede caiu, DNS, CORS).
        // `getApiErrorMessage` devolveria a `message` de QUALQUER Error, e a do
        // fetch é "Failed to fetch" — texto técnico em inglês, no exato momento
        // em que a pessoa está criando a conta. Quem só vê isso conclui que o
        // produto está quebrado e vai embora; o certo é dizer o que houve e
        // que os dados dela continuam preenchidos na tela.
        console.error(err);
        setFormError('Sem conexão com o servidor agora. Verifique sua internet e tente de novo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (field: FieldName) => {
    const message = fieldErrors[field];
    if (!message) return null;
    return (
      <p id={`signup-${field}-error`} role="alert" className="auth-erro-campo">
        <AlertCircle size={14} aria-hidden="true" />
        <span>{message}</span>
      </p>
    );
  };

  const describedBy = (field: FieldName, extra?: string) => {
    const ids = [fieldErrors[field] ? `signup-${field}-error` : null, extra ?? null]
      .filter(Boolean)
      .join(' ');
    return ids || undefined;
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-vitrine">
          <div className="auth-marca">
            <LogoHub size={34} />
            <span className="auth-marca-nome">
              Tela<em>Hub</em>
            </span>
          </div>

          <div>
            <h2 className="auth-vitrine-titulo">Use a TV que você já tem para mostrar avisos e ofertas.</h2>
            <p className="auth-vitrine-texto">
              Crie a conta, conecte a TV que já existe no lugar e publique o primeiro aviso pelo
              celular. Dá para fazer tudo em poucos minutos.
            </p>
          </div>

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
              <span>
                A cobrança só começa quando você liga a 2ª tela, proporcional ao período. Nada é cobrado de forma retroativa.
              </span>
            </li>
          </ul>
        </aside>

        <main className="auth-coluna">
          <div className="auth-cartao">
            <div className="auth-topo-mobile">
              <LogoHub size={44} />
              <div>
                <h1 className="auth-titulo">Criar sua conta</h1>
                <p className="auth-subtitulo">Leva um minuto e não pede cartão.</p>
              </div>
            </div>

            {/* A promessa da landing, repetida. Não é teste com prazo. */}
            <p className="auth-promessa">
              <Check size={18} aria-hidden="true" />
              <span>
                <strong>A primeira tela é grátis para sempre e não pede cartão.</strong> Ao ligar a 2ª
                tela, a cobrança começa dela em diante e proporcional ao período.
              </span>
            </p>

            <div className="auth-caixa">
              <form onSubmit={handleSubmit} noValidate>
                <fieldset className="auth-form" disabled={loading}>
                  <legend className="auth-legenda">Dados da conta</legend>

                  {/* Nome do lugar */}
                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="signup-companyName">
                      Nome do seu lugar
                    </label>
                    <input
                      id="signup-companyName"
                      name="organization"
                      type="text"
                      className="auth-input"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        clearFieldError('companyName');
                      }}
                      placeholder={EXEMPLOS_ORGANIZACAO[exemploIndex]}
                      autoComplete="organization"
                      aria-invalid={!!fieldErrors.companyName}
                      aria-describedby={describedBy('companyName', 'signup-company-hint')}
                    />
                    <p id="signup-company-hint" className="auth-dica">
                      O nome do condomínio, escritório, clínica, loja ou academia. É ele que
                      aparece no seu painel.
                    </p>
                    {renderFieldError('companyName')}
                  </div>

                  {/* Nome da pessoa */}
                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="signup-name">
                      Seu nome
                    </label>
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      className="auth-input"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError('name');
                      }}
                      placeholder="Ex.: Maria Souza"
                      autoComplete="name"
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={describedBy('name')}
                    />
                    {renderFieldError('name')}
                  </div>

                  {/* E-mail */}
                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="signup-email">
                      Seu e-mail
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError('email');
                        setEmailAlreadyUsed(false);
                      }}
                      placeholder="voce@seunegocio.com.br"
                      autoComplete="email"
                      inputMode="email"
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={describedBy('email', 'signup-email-hint')}
                    />
                    <p id="signup-email-hint" className="auth-dica">
                      É por aqui que avisamos se uma tela parar de responder.
                    </p>
                    {renderFieldError('email')}
                  </div>

                  {/* Senha */}
                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="signup-password">
                      Senha
                    </label>
                    <div className="auth-campo-senha">
                      <input
                        id="signup-password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError('password');
                        }}
                        placeholder={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`}
                        autoComplete="new-password"
                        aria-invalid={!!fieldErrors.password}
                        aria-describedby={describedBy('password', 'signup-password-hint')}
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
                    <p id="signup-password-hint" className="auth-dica">
                      Use no mínimo {MIN_PASSWORD_LENGTH} caracteres.
                    </p>
                    {renderFieldError('password')}
                  </div>

                  {/* Confirmação */}
                  <div className="auth-campo">
                    <label className="auth-rotulo" htmlFor="signup-confirmPassword">
                      Repita a senha
                    </label>
                    <input
                      id="signup-confirmPassword"
                      name="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearFieldError('confirmPassword');
                      }}
                      placeholder="A mesma senha de novo"
                      autoComplete="new-password"
                      aria-invalid={!!fieldErrors.confirmPassword}
                      aria-describedby={describedBy('confirmPassword')}
                    />
                    {renderFieldError('confirmPassword')}
                  </div>

                  {/* Aceite obrigatório: checkbox nativo, nunca pré-marcado.
                      Consentimento tem de ser um ato — caixa já marcada é
                      justamente o que a LGPD e o CDC não aceitam como prova. */}
                  <div className="auth-campo">
                    <label className="auth-checkbox" htmlFor="signup-termos">
                      <input
                        id="signup-termos"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        aria-describedby="signup-termos-motivo"
                      />
                      <span>
                        Li e aceito os{' '}
                        <a
                          className="auth-link"
                          href={TERMS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Termos de uso
                        </a>{' '}
                        e a{' '}
                        <a
                          className="auth-link"
                          href={PRIVACY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Política de Privacidade
                        </a>
                        .
                      </span>
                    </label>

                    {/* Motivo em TEXTO. Botão apagado sem explicação faz a
                        pessoa achar que o site quebrou e ir embora. */}
                    {!acceptedTerms && (
                      <p id="signup-termos-motivo" className="auth-motivo">
                        <Info size={14} aria-hidden="true" />
                        <span>
                          Para criar a conta, marque que você leu e aceita os Termos e a Política de
                          Privacidade.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Opt-in de novidades: OUTRA caixa, OUTRO campo, opcional.
                      Fica depois do aceite e nunca dentro dele — uma caixa só
                      dizendo "aceito os Termos e quero receber novidades" faz
                      quem quer a conta consentir com marketing sem escolha, e
                      é esse pacote que a LGPD não aceita como consentimento.
                      Sem `auth-motivo` embaixo: não marcar não impede nada, e
                      um aviso aqui sugeriria que impede. */}
                  <div className="auth-campo">
                    <label className="auth-checkbox" htmlFor="signup-novidades">
                      <input
                        id="signup-novidades"
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={(e) => setMarketingOptIn(e.target.checked)}
                      />
                      <span>
                        Quero receber novidades e dicas de uso por e-mail. Você pode sair quando
                        quiser, pelo link no rodapé de cada mensagem.
                      </span>
                    </label>
                  </div>

                  {formError && (
                    <div role="alert" className="auth-erro-geral">
                      <span className="auth-erro-geral-linha">
                        <AlertCircle size={16} aria-hidden="true" />
                        {formError}
                      </span>
                      {emailAlreadyUsed && (
                        <span className="auth-erro-geral-extra">
                          Já é você?{' '}
                          <Link className="auth-link" to="/login">
                            Entrar agora
                          </Link>
                          .
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="auth-botao auth-botao-primario"
                    disabled={loading || !acceptedTerms}
                  >
                    {loading ? (
                      <Loader2 size={18} className="auth-girando" aria-hidden="true" />
                    ) : (
                      <UserPlus size={18} aria-hidden="true" />
                    )}
                    {loading ? 'Criando sua conta…' : 'Criar conta grátis'}
                  </button>
                </fieldset>
              </form>

              <p className="auth-rodape-caixa">
                Já tem conta?{' '}
                <Link className="auth-link" to="/login">
                  Entrar
                </Link>
              </p>
            </div>

            <p className="auth-rodape">© {new Date().getFullYear()} TelaHub</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Signup;
