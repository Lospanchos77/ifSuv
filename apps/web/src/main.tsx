import '@mantine/core/styles.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import './lib/swal.css';
import './components/editor/editor.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemedMantineProvider } from './components/ThemedMantineProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { queryClient } from './lib/query-client';
import { syncSwalTheme } from './lib/swal';
import { AppRouter } from './router';

syncSwalTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemedMantineProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </ThemedMantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
