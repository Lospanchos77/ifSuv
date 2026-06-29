import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom n'implémente ni matchMedia ni ResizeObserver, requis par Mantine
// (MantineProvider/useMediaQuery, ScrollArea, Drawer...). Polyfills de test.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver = ResizeObserverMock;
