// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const basePath = process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Prerender is disabled: this app is fully dynamic (client-side session,
    // live data), and the prerender preview server cannot resolve the custom
    // nitro server entry, which broke the production build.
    prerender: {
      enabled: false,
    },
  },
  vite: {
    build: {
      outDir: "dist",
    },
    base: basePath,
  },
});
