import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
const ToasterAdmin = lazy(() => import('./lib/ToasterAdmin'));

// O sonner injeta uma folha de estilo no <head> assim que carrega. Só o
// backoffice usa toast; o checkout tem os próprios avisos (`lib/Avisos.tsx`).
// Montar o Toaster só em `/admin` mantém essa folha longe de quem compra.
const ToasterDoAdmin = () => {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/admin')) return null;
  return (
    <Suspense fallback={null}>
      <ToasterAdmin />
    </Suspense>
  );
};

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="animate-spin text-accent" size={28} aria-hidden="true" />
    <span className="sr-only">Carregando…</span>
  </div>
);

// Vai para /c levando a query junto. Um link para /checkout?plano=x (ou
// qualquer rota desconhecida com utm_*) chegaria em /c sem o plano.
const IrParaCheckout = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/c', search }} replace />;
};

// basename = `base` do vite.config.ts sem a barra final (/checkout). As rotas
// abaixo seguem escritas como /c e /admin; o roteador põe o prefixo. O cast
// segue o resto do app: o tsconfig não carrega os tipos de `vite/client`.
const ROUTER_BASENAME = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL.replace(/\/$/, '');

const App = () => (
  <BrowserRouter basename={ROUTER_BASENAME}>
    <ToasterDoAdmin />
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
        <Route path="/" element={<IrParaCheckout />} />
        <Route path="*" element={<IrParaCheckout />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
