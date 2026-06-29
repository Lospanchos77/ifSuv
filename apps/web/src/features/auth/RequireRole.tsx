import type { Role } from '@ifsuv/shared';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

interface RequireRoleProps {
  allow: Role[];
}

export function RequireRole({ allow }: RequireRoleProps): JSX.Element {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
