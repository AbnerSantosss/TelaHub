
import React, { useEffect, useState, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/storage';
import { Loader2 } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { GridGlowBackground } from './components/GridGlowBackground';
import { Toaster } from './components/ui/sonner';
import { pricingUrl } from './libs/external-urls';
import type { User } from './types';

// Lazy load screen components to improve initial load time
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Editor = React.lazy(() => import('./components/Editor'));
const Scheduler = React.lazy(() => import('./components/Scheduler'));
const Player = React.lazy(() => import('./components/Player'));
const Login = React.lazy(() => import('./components/Login'));
const Signup = React.lazy(() => import('./components/Signup'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const Reports = React.lazy(() => import('./components/Reports'));
const ForcePasswordChange = React.lazy(() => import('./components/ForcePasswordChange'));
/**
 * Telas novas de ativação e de cobrança.
 *
 * `ConecteSuaTV` também é montada DENTRO do `Dashboard` como primeiro passo de
 * conta nova; a rota existe para quem quer voltar a ela depois (link do menu,
 * e-mail de boas-vindas, suporte mandando o endereço por WhatsApp). São dois
 * pontos de entrada para o MESMO componente de propósito: duplicar a tela em
 * dois lugares é como o texto do passo de ativação começa a divergir.
 */
const ConecteSuaTV = React.lazy(() => import('./components/ConecteSuaTV'));
const Assinatura = React.lazy(() => import('./components/Assinatura'));

/**
 * `/vendas` era uma SEGUNDA landing page, mantida aqui dentro em paralelo ao
 * site público (`Site/site-telas`) — com tabela de preços própria, o que fazia
 * o preço divergir do catálogo real a cada reajuste. Preço divergente em página
 * pública é problema de CDC (arts. 30 e 37), não só de manutenção.
 *
 * A página foi removida e a rota virou redirecionamento: o site público é
 * pré-renderizado (SSR) e é ele que ranqueia, então ele é a única landing. A
 * rota sobrevive porque links antigos para `#/vendas` ainda circulam.
 */
const VendasRedirect: React.FC = () => {
  useEffect(() => {
    window.location.replace(pricingUrl());
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Redirecionando para os planos…
    </div>
  );
};

/**
 * Componente para Proteger Rotas.
 *
 * Também é aqui que a troca obrigatória de senha é aplicada, e o motivo é o
 * mesmo que justifica o guard de autenticação estar aqui: este componente já é
 * o único caminho pelo qual o conteúdo do painel é montado, e já faz a chamada
 * a `GET /auth/me` de que a decisão depende. Alternativas foram descartadas:
 *
 * - Redirecionar para uma rota `/trocar-senha` exigiria interceptar TODA rota
 *   nova que alguém criar no futuro (é fácil esquecer, e o esquecimento é um
 *   furo de segurança silencioso), além de perder a rota de destino.
 * - Tratar só no `Login` deixaria de fora a sessão que já estava aberta quando
 *   o flag foi ligado (compra no checkout, convite reenviado) e qualquer
 *   recarregamento de página com token válido no localStorage.
 *
 * Renderizando `ForcePasswordChange` NO LUGAR dos `children`, sem mexer na URL,
 * não existe endereço que pule a exigência e, ao concluir, o usuário permanece
 * na rota para onde ia (incluindo parâmetros, como `/edit/:id`).
 *
 * As rotas públicas (`/player`, `/player/:slug`, `/login`, `/signup`,
 * `/forgot-password`, `/reset-password`) não passam por aqui e portanto seguem
 * intocadas — a TV em especial nunca pode ser bloqueada por isto.
 */
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Estado separado do `currentUser` porque, ao concluir a troca, queremos
  // liberar a navegação sem refazer o `GET /auth/me` (o servidor já zerou o
  // flag; um refetch só adiaria a renderização).
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
        setCurrentUser(user);
        // `undefined` (resposta legada do backend) conta como "não precisa".
        setMustChangePassword(user?.mustChangePassword === true);
      } catch (error) {
        console.error("Auth check failed", error);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setMustChangePassword(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    // Timeout de segurança para evitar loading infinito
    const timeout = setTimeout(() => {
        setLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return (
      <ForcePasswordChange
        user={currentUser}
        onSuccess={() => setMustChangePassword(false)}
      />
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    // reducedMotion="user": toda animação de `motion/react` passa a respeitar
    // o prefers-reduced-motion do sistema (transform/layout viram instantâneos).
    <MotionConfig reducedMotion="user">
    <HashRouter>
      <div className="min-h-screen bg-transparent text-slate-100 selection:bg-sky-500/30 selection:text-sky-200">
        {/* Grade com brilho atrás de tudo (fica fora do Player e das telas claras) */}
        <GridGlowBackground />
        <Toaster closeButton theme="dark" position="top-right" />
        <Suspense fallback={
          <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[var(--th-accent)]" size={32} />
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Carregando...</p>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vendas" element={<VendasRedirect />} />
            
            {/* Rotas Protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/edit/:id" element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            } />
            <Route path="/scheduler" element={
              <ProtectedRoute>
                <Scheduler />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />

            {/* Ativação: a TV conectada é a métrica que decide a conta. */}
            <Route path="/conecte-sua-tv" element={
              <ProtectedRoute>
                <ConecteSuaTV variante="pagina" />
              </ProtectedRoute>
            } />

            {/* Cobrança e cancelamento pelo próprio painel (CDC + promessa da
                landing: cancelar não pode depender de falar com alguém). */}
            <Route path="/assinatura" element={
              <ProtectedRoute>
                <Assinatura />
              </ProtectedRoute>
            } />

            {/* Rota Pública (Player não precisa de login para funcionar na TV) */}
            <Route path="/player" element={<Player />} />
            <Route path="/player/:slug" element={<Player />} />

            {/* Catch-all para redirecionar rotas inválidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
    </MotionConfig>
  );
};

export default App;

