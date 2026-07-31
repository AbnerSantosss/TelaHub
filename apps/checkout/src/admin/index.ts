/**
 * Superfície pública do painel, para o roteamento montar as telas sem precisar
 * saber a estrutura interna desta pasta.
 *
 * Uso esperado em `App.tsx`:
 *
 *   <Route path="/admin/login" element={<LoginPage />} />
 *   <Route path="/admin" element={<AdminLayout />}>
 *     <Route index element={<DashboardPage />} />
 *     <Route path="sessions" element={<SessionsPage />} />
 *     <Route path="sessions/:id" element={<SessionDetailPage />} />
 *   </Route>
 *
 * `AdminLayout` renderiza `<Outlet />` quando não recebe `children`, então
 * envolver as rotas também funciona: <AdminLayout><DashboardPage /></AdminLayout>.
 * Ele já redireciona para `/admin/login` quando não há token.
 */
export { default as AdminLayout } from './AdminLayout';
export { default as LoginPage } from './LoginPage';
export { default as DashboardPage } from './DashboardPage';
export { default as SessionsPage } from './SessionsPage';
export { default as SessionDetailPage } from './SessionDetailPage';
