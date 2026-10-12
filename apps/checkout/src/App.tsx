import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Rotas do app de checkout.
 *
 * Duas áreas com públicos opostos no mesmo build:
 *
 * - `/c` e `/c/:token` — checkout do comprador, ANÔNIMO. O token é o
 *   `publicToken` da `CheckoutSession`, o mesmo que circula em link de
 *   recuperação de abandono. `/c` sem token cria a sessão e assume a URL via
 *   `history.replaceState` (sem entrada nova no histórico).
 * - `/admin/*` — painel do funil, autenticado e restrito ao papel `master`,
 *   porque o funil contém lead de toda a plataforma.
 *
 * Carregamento tardio de propósito: quem abre o checkout não deve baixar o
 * painel, e vice-versa. É a rota de conversão — cada KB conta.
 */
const CheckoutPage = lazy(() => import('./checkout/CheckoutPage'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const LoginPage = lazy(() => import('./admin/LoginPage'));
const DashboardPage = lazy(() => import('./admin/DashboardPage'));
const SessionsPage = lazy(() => import('./admin/SessionsPage'));
const SessionDetailPage = lazy(() => import('./admin/SessionDetailPage'));
const ClientesPage = lazy(() => import('./admin/clientes/ClientesPage'));
const ClienteDetailPage = lazy(() => import('./admin/clientes/ClienteDetailPage'));
const EmailPage = lazy(() => import('./admin/email/EmailPage'));
const CampanhaEditorPage = lazy(() => import('./admin/email/CampanhaEditorPage'));
const PagamentosPage = lazy(() => import('./admin/PagamentosPage'));
const LeadsPage = lazy(() => import('./admin/LeadsPage'));

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="animate-spin text-accent" size={28} aria-hidden="true" />
    <span className="sr-only">Carregando…</span>
  </div>
);

const App = () => (
  <BrowserRouter>
    <Toaster position="top-center" richColors />
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/c" element={<CheckoutPage />} />
        <Route path="/c/:token" element={<CheckoutPage />} />

        <Route path="/admin/login" element={<LoginPage />} />
        {/* O AdminLayout já redireciona para /admin/login quando não há token,
            guardando a rota de origem para voltar depois do login. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />

          {/* Backoffice: operar a plataforma, não só observar o funil. As
              visões de assinatura (vencendo, inadimplentes, não renovaram) são
              a MESMA rota com `?view=` — recorte de lista, e não tela nova, para
              que filtro compartilhado por link continue funcionando. */}
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:id" element={<ClienteDetailPage />} />
          <Route path="email" element={<EmailPage />} />
          <Route path="email/campanhas/:id" element={<CampanhaEditorPage />} />
          <Route path="pagamentos" element={<PagamentosPage />} />
          <Route path="leads" element={<LeadsPage />} />
        </Route>

        {/* A raiz vai para o checkout: é o que um visitante espera ao acessar o
            domínio do checkout. O painel é destino de operador, não de visitante. */}
        <Route path="/" element={<Navigate to="/c" replace />} />
        <Route path="*" element={<Navigate to="/c" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
