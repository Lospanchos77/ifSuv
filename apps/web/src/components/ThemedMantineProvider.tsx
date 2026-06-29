import { MantineProvider } from '@mantine/core';
import { useMemo, type PropsWithChildren } from 'react';
import { useSiteSettings } from '../features/settings/hooks';
import { buildTheme, type FontFamilyKey } from '../lib/theme';

/**
 * Wraps MantineProvider et applique dynamiquement la primaryColor, defaultRadius
 * et fontFamily configurées dans les paramètres du site. Doit être placé DANS
 * le QueryClientProvider (utilise useQuery).
 */
export function ThemedMantineProvider({ children }: PropsWithChildren): JSX.Element {
  const settings = useSiteSettings();
  const primaryColor = settings.data?.primaryColor ?? 'indigo';
  const defaultRadius = (settings.data?.defaultRadius ?? 'md') as
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl';
  const fontFamily = (settings.data?.fontFamily ?? 'system') as FontFamilyKey;

  const theme = useMemo(
    () => buildTheme({ primaryColor, defaultRadius, fontFamily }),
    [primaryColor, defaultRadius, fontFamily],
  );

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
