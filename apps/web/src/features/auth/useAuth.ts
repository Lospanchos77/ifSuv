import { useMutation } from '@tanstack/react-query';
import type { LoginInput } from '@ifsuv/shared';
import { loginRequest, logoutRequest } from './api';
import { useAuthStore } from './store';

export function useAuth() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => loginRequest(input),
    onSuccess: (user) => {
      setUser(user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutRequest(),
    onSuccess: () => {
      clear();
    },
  });

  return {
    user: currentUser,
    status,
    isAuthenticated: status === 'authenticated',
    login: loginMutation,
    logout: logoutMutation,
  };
}
