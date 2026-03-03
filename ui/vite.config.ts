import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  base: "./",
  plugins: [react(), viteTsconfigPaths(), legacy()],
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
});
