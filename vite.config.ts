import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Two independent apps, each built into its own self-contained folder:
 *
 *   vite --mode editor  /  vite build --mode editor  → dist/editor/
 *   vite --mode viewer  /  vite build --mode viewer  → dist/viewer/  (incl. decision.json)
 *
 * `base: './'` makes every asset URL relative, so either folder can be hosted
 * under any path (e.g. example.com/decision/).
 */
const here = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const app = mode === 'viewer' ? 'viewer' : 'editor';
  return {
    plugins: [react()],
    root: process.env.VITEST ? here : resolve(here, 'apps', app),
    envDir: here,
    base: './',
    build: {
      outDir: resolve(here, 'dist', app),
      emptyOutDir: true,
    },
    server: { port: app === 'viewer' ? 5174 : 5173 },
    preview: { port: app === 'viewer' ? 4174 : 4173 },
    test: {
      environment: 'node',
    },
  };
});
