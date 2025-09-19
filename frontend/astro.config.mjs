// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  vite: {
    server: {
      host: "0.0.0.0",
      hmr: { clientPort: 3000 },
      port: 3000,
      watch: { usePolling: true },
    },
  },
});