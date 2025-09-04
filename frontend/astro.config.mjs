// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  vite: {
    server: {
      host: "0.0.0.0",
      hmr: { clientPort: 3000 },
      port: 3000,
      watch: { usePolling: true },
    },
  },
});
