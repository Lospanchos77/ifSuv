import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // `@ifsuv/shared` résolu depuis sa SOURCE TS (et non le dist CJS pré-bundlé) :
      // Vite la compile directement → HMR sur changement, exports nommés natifs (ESM).
      // Évite le cache d'optimisation Vite périmé quand seul le *contenu* du dist
      // change (version du package inchangée à 0.0.0) — sinon les nouveaux exports
      // sortent `undefined` côté web (cf. bug NaN sur les constantes de fichiers).
      '@ifsuv/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
