import { Role } from '@ifsuv/shared';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShellLayout } from './components/layout/AppShellLayout';
import { RedirectIfAuthenticated } from './features/auth/RedirectIfAuthenticated';
import { RequireAuth } from './features/auth/RequireAuth';
import { RequireRole } from './features/auth/RequireRole';
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage';
import { LoginPage } from './routes/auth/LoginPage';
import { ResetPasswordPage } from './routes/auth/ResetPasswordPage';
import { ClientDetailPage } from './routes/clients/ClientDetailPage';
import { ClientsPage } from './routes/clients/ClientsPage';
import { HomePage } from './routes/home/HomePage';
import { NotFoundPage } from './routes/not-found/NotFoundPage';
import { PerformancesPage } from './routes/performances/PerformancesPage';
import { PublicTicketPage } from './routes/public/PublicTicketPage';
import { SettingsPage } from './routes/settings/SettingsPage';
import { TechFichePage } from './routes/tech/TechFichePage';
import { TicketDetailPage } from './routes/tickets/TicketDetailPage';
import { TicketFichePage } from './routes/tickets/TicketFichePage';
import { TicketLabelPage } from './routes/tickets/TicketLabelPage';
import { TicketsHistoryPage, TicketsListPage } from './routes/tickets/TicketsListPage';
import { UsersPage } from './routes/users/UsersPage';

// `router` reste local (non exporté) : son type inféré référence des internes
// @remix-run/router non nommables et déclencherait TS2742 si exporté sous
// compilation composite (declaration). On expose un composant à la place.
const router = createBrowserRouter([
  // Page publique client (accessible via QR scan, sans auth, sans AppShell)
  { path: '/p/t/:token', element: <PublicTicketPage /> },

  // Accès technicien restreint via QR tech (sans login) : édition statut + diagnostic
  // de CE ticket uniquement. La capacité est portée par le token signé de l'URL.
  { path: '/t/t/:token', element: <TechFichePage /> },

  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      // Routes authentifiées SANS AppShell (pages d'impression)
      { path: '/tickets/:id/print/fiche', element: <TicketFichePage /> },
      { path: '/tickets/:id/print/etiquette', element: <TicketLabelPage /> },

      // Routes authentifiées AVEC AppShell
      {
        path: '/',
        element: <AppShellLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'tickets', element: <TicketsListPage /> },
          { path: 'tickets/history', element: <TicketsHistoryPage /> },
          { path: 'tickets/:id', element: <TicketDetailPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'clients/:id', element: <ClientDetailPage /> },
          {
            element: <RequireRole allow={[Role.Admin]} />,
            children: [
              { path: 'users', element: <UsersPage /> },
              { path: 'performances', element: <PerformancesPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter(): JSX.Element {
  return <RouterProvider router={router} />;
}
