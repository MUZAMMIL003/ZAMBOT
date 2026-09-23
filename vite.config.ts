import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 3000,
    // Explicit IPv4: some Windows setups resolve localhost to ::1 first, which
    // makes the dev server look unreachable.
    host: "127.0.0.1",
  },
  preview: { port: 4173, host: "127.0.0.1" },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep the animation library out of the entry chunk so first paint is
        // not blocked by it.
        manualChunks: { motion: ["framer-motion"] },
      },
    },
  },
});
