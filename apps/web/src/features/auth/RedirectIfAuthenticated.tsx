import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RedirectIfAuthenticated(): JSX.Element {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
