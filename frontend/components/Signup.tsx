import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User as UserIcon,
  Mail,
  Lock,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { signup } from '../services/storage';
import { isApiError, getApiErrorMessage } from '../libs/api';
import { LogoHub } from './Login';
import { Button } from './ui/button';
import { Input } from './ui/input';

type FieldName = 'companyName' | 'name' | 'email' | 'password' | 'confirmPassword';

type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  'pl-10 text-foreground border-border bg-gray-950/40 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 h-11 rounded-xl transition-all duration-300 ease-out aria-invalid:border-rose-500/60 aria-invalid:ring-rose-500/20';

const labelClass =
  'text-[10px] font-black text-muted-foreground uppercase tracking-wider pl-0.5 block';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [loading, setLoading] = useState(false);

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
      errors.companyName = 'Informe o nome da sua empresa.';
    }
    if (!name.trim()) {
      errors.name = 'Informe o seu nome.';
    }
    if (!email.trim()) {
      errors.email = 'Informe o seu e-mail.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Informe um e-mail válido (ex.: nome@empresa.com.br).';
    }
    if (!password) {
      errors.password = 'Crie uma senha de acesso.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Repita a senha para confirmar.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'As senhas não coincidem.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // trava dupla contra duplo cadastro

    setFormError('');
    setEmailAlreadyUsed(false);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      // Move o foco para o primeiro campo com erro (acessibilidade).
      const first = Object.keys(errors)[0] as FieldName;
      document.getElementById(`signup-${first}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      await signup({
        companyName: companyName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Token já persistido por `signup()` — segue direto para o Dashboard.
      navigate('/', { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setEmailAlreadyUsed(true);
        setFormError(
          getApiErrorMessage(err, 'Este e-mail já está cadastrado.'),
        );
      } else {
        setFormError(
          getApiErrorMessage(err, 'Não foi possível criar sua conta agora. Tente novamente.'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (field: FieldName) => {
    const message = fieldErrors[field];
    if (!message) return null;
    return (
      <p
        id={`signup-${field}-error`}
        role="alert"
        className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-400 pl-0.5"
      >
        <AlertTriangle size={12} className="mt-[1px] flex-shrink-0" aria-hidden="true" />
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-transparent text-foreground py-10">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md p-6 sm:p-8 relative z-10 flex flex-col gap-6">
        {/* Logo e Branding */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-20 h-20 bg-card flex items-center justify-center border border-border mb-4 shadow-md relative p-2.5 rounded-xl">
            <LogoHub size={44} />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-1 text-center uppercase font-sans">
            Tela<span className="text-accent font-black">Hub</span>
          </h1>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider text-center max-w-[300px] uppercase">
            Criar sua conta
          </p>
        </div>

        {/* Destaque da oferta freemium — 1 tela grátis, sem prazo.
            NÃO trocar por "X dias grátis": a entrada do produto não é trial. */}
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-3">
          <p className="flex items-center gap-2.5 text-[12px] font-bold text-emerald-300 leading-snug">
            <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" aria-hidden="true" />
            1 tela grátis para sempre, sem cartão de crédito
          </p>
          <p className="text-[11px] text-emerald-200/70 leading-snug pl-[26px]">
            Ao ligar a 2ª tela, a cobrança começa dela em diante e proporcional ao período — nunca retroativa.
          </p>
        </div>

        <div className="bg-[#0a0f24]/60 backdrop-blur-md border border-border shadow-soft p-6 sm:p-8 transition-all duration-300 hover:border-sky-500/30 rounded-xl">
          <form onSubmit={handleSubmit} noValidate>
            {/* fieldset desabilitado bloqueia todos os campos durante o envio */}
            <fieldset disabled={loading} className="space-y-5 disabled:opacity-70">
              <legend className="sr-only">Dados de cadastro</legend>

              {/* Nome da empresa */}
              <div className="space-y-1.5">
                <label htmlFor="signup-companyName" className={labelClass}>
                  Nome da empresa
                </label>
                <div className="relative group">
                  <Input
                    id="signup-companyName"
                    name="organization"
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      clearFieldError('companyName');
                    }}
                    className={inputClass}
                    placeholder="Ex: Padaria Central Ltda"
                    autoComplete="organization"
                    aria-invalid={!!fieldErrors.companyName}
                    aria-describedby={describedBy('companyName')}
                  />
                  <Building2
                    size={16}
                    className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors"
                    aria-hidden="true"
                  />
                </div>
                {renderFieldError('companyName')}
              </div>

              {/* Seu nome */}
              <div className="space-y-1.5">
                <label htmlFor="signup-name" className={labelClass}>
                  Seu nome
                </label>
                <div className="relative group">
                  <Input
                    id="signup-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    className={inputClass}
                    placeholder="Ex: Maria Souza"
                    autoComplete="name"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={describedBy('name')}
                  />
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors"
                    aria-hidden="true"
                  />
                </div>
                {renderFieldError('name')}
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label htmlFor="signup-email" className={labelClass}>
                  E-mail
                </label>
                <div className="relative group">
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                      setEmailAlreadyUsed(false);
                    }}
                    className={inputClass}
                    placeholder="Ex: seu.email@empresa.com.br"
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={describedBy('email')}
                  />
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors"
                    aria-hidden="true"
                  />
                </div>
                {renderFieldError('email')}
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label htmlFor="signup-password" className={labelClass}>
                  Senha
                </label>
                <div className="relative group">
                  <Input
                    id="signup-password"
                    name="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    className={inputClass}
                    placeholder="Mínimo de 8 caracteres"
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={describedBy('password', 'signup-password-hint')}
                  />
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <p id="signup-password-hint" className="text-[11px] text-slate-500 pl-0.5">
                  Use no mínimo {MIN_PASSWORD_LENGTH} caracteres.
                </p>
                {renderFieldError('password')}
              </div>

              {/* Confirmação de senha */}
              <div className="space-y-1.5">
                <label htmlFor="signup-confirmPassword" className={labelClass}>
                  Confirmar senha
                </label>
                <div className="relative group">
                  <Input
                    id="signup-confirmPassword"
                    name="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError('confirmPassword');
                    }}
                    className={inputClass}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={describedBy('confirmPassword')}
                  />
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-3.5 text-muted-foreground group-focus-within:text-accent transition-colors"
                    aria-hidden="true"
                  />
                </div>
                {renderFieldError('confirmPassword')}
              </div>

              {/* Erro geral (inclui 409 — e-mail já cadastrado) */}
              {formError && (
                <div
                  role="alert"
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl font-bold flex flex-col gap-1.5"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={14} aria-hidden="true" /> {formError}
                  </span>
                  {emailAlreadyUsed && (
                    <span className="text-[11px] font-normal text-rose-300/90">
                      Já tem uma conta com esse e-mail?{' '}
                      <Link
                        to="/login"
                        className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2"
                      >
                        Entrar agora
                      </Link>
                      .
                    </span>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                variant="brand"
                className="w-full py-6 rounded-xl hover:shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-300 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs tracking-wider active:scale-[0.98] border border-white/10 uppercase font-black"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus size={18} aria-hidden="true" />
                )}
                {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA GRÁTIS'}
              </Button>
            </fieldset>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            Já tenho conta —{' '}
            <Link
              to="/login"
              className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            >
              fazer login
            </Link>
          </p>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground text-[9px] font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} TelaHub System v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
