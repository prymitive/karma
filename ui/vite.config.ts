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
  build: {
    sourcemap: true,
  },
});
