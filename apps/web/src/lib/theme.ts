import { createTheme, type MantineColorsTuple } from '@mantine/core';

export type FontFamilyKey = 'system' | 'serif' | 'mono' | 'rounded';

const FONT_STACKS: Record<FontFamilyKey, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Cambria, serif',
  mono: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace',
  rounded: '"Nunito", "Inter", "Segoe UI", system-ui, sans-serif',
};

interface BuildThemeOpts {
  primaryColor?: string;
  defaultRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fontFamily?: FontFamilyKey;
}

export function buildTheme(opts: BuildThemeOpts | string = {}) {
  // Compat ascendante : ancien appel `buildTheme('blue')`
  const o: BuildThemeOpts = typeof opts === 'string' ? { primaryColor: opts } : opts;
  const primaryColor = o.primaryColor ?? 'indigo';
  const defaultRadius = o.defaultRadius ?? 'md';
  const fontKey: FontFamilyKey = o.fontFamily ?? 'system';
  const fontFamily = FONT_STACKS[fontKey] ?? FONT_STACKS.system;

  return createTheme({
    primaryColor,
    primaryShade: { light: 6, dark: 5 },
    defaultRadius,
    fontFamily,
    headings: {
      fontFamily,
      fontWeight: '600',
    },
    components: {
      Button: {
        defaultProps: {
          size: 'sm',
        },
      },
      Badge: {
        defaultProps: {
          variant: 'light',
        },
      },
      Card: {
        defaultProps: {
          radius: defaultRadius,
        },
      },
      Anchor: {
        defaultProps: {
          underline: 'hover',
        },
      },
    },
  });
}

export const theme = buildTheme();
export type Theme = ReturnType<typeof buildTheme>;
export type { MantineColorsTuple };
