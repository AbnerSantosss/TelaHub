
import React, { useEffect, useState, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/storage';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

// Lazy load screen components to improve initial load time
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Editor = React.lazy(() => import('./components/Editor'));
const Scheduler = React.lazy(() => import('./components/Scheduler'));
const Player = React.lazy(() => import('./components/Player'));
const Login = React.lazy(() => import('./components/Login'));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));
const Landing = React.lazy(() => import('./components/Landing'));

// Componente para Proteger Rotas
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Auth check failed", error);
        setIsAuthenticated(false);
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

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-transparent text-slate-100 selection:bg-sky-500/30 selection:text-sky-200">
        <Toaster closeButton theme="dark" position="top-right" />
        <Suspense fallback={
          <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-[#0ea5e9]" size={32} />
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Carregando...</p>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vendas" element={<Landing />} />
            
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
            
            {/* Rota Pública (Player não precisa de login para funcionar na TV) */}
            <Route path="/player" element={<Player />} />
            <Route path="/player/:slug" element={<Player />} />

            {/* Catch-all para redirecionar rotas inválidas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  );
};

export default App;

