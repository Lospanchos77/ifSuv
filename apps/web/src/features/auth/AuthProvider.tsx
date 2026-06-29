import { Center, Loader } from '@mantine/core';
import { useEffect, type PropsWithChildren } from 'react';
import { meRequest } from './api';
import { useAuthStore } from './store';

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    meRequest()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setStatus, setUser]);

  if (status === 'idle' || status === 'loading') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <>{children}</>;
}
