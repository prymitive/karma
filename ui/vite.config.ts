import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  base: "./",
  plugins: [react(), legacy()],
  server: {
    open: true,
    port: 3000,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          "abs-percent",
          "import",
          "if-function",
          "duplicate-var-flags",
          "global-builtin",
          "color-functions",
        ],
      },
    },
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    tsconfigPaths: true
  }
});
