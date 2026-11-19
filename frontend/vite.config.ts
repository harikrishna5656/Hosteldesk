// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Bridge TanStack Start 1.169 rolldownOptions to Vite 7 rollupOptions
function vite7TanStackStartBridge() {
  return {
    name: "vite7-tanstack-start-bridge",
    config(config: any) {
      if (config.environments?.client?.build) {
        config.environments.client.build.rollupOptions = {
          ...config.environments.client.build.rollupOptions,
          input: config.environments.client.build.rolldownOptions?.input || {
            index: "virtual:tanstack-start-client-entry",
          },
        };
      }
      if (config.environments?.ssr?.build) {
        config.environments.ssr.build.rollupOptions = {
          ...config.environments.ssr.build.rollupOptions,
          input: config.environments.ssr.build.rolldownOptions?.input,
        };
      }
      if (!config.build?.rollupOptions?.input && config.environments?.client?.build?.rolldownOptions?.input) {
        config.build = config.build || {};
        config.build.rollupOptions = {
          ...config.build.rollupOptions,
          input: config.environments.client.build.rolldownOptions.input,
        };
      }
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [vite7TanStackStartBridge()],
  },
});
