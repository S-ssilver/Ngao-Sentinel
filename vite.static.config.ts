import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  base: process.env.GITHUB_ACTIONS ? '/silverline-station-hub/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
