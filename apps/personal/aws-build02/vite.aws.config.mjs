import {personalIconChunk} from './build/personal-icon-chunk.mjs';
import {personalEntryPreload} from './build/personal-entry-preload.mjs';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { preserveSymlinks: true, dedupe: ["react", "react-dom"], alias: {"pdfjs-dist":"/work/.qualification/desktop-pdf-dependency-v576/node_modules/pdfjs-dist"} },
  build: {
    copyPublicDir: false,
    outDir: "dist/client",
    rollupOptions: { output: {manualChunks:personalIconChunk}, external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"] },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
  plugins: [react(),personalEntryPreload()],
});
