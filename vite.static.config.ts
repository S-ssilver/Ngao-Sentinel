import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const basePath = process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : '/');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  base: basePath,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
