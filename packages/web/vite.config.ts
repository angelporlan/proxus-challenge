import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl = process.env.PROXUS_API_URL ?? "http://localhost:3000";
const port = Number(process.env.WEB_PORT ?? process.env.PORT ?? "5173");

export default defineConfig({
  root: "src",
  publicDir: "../public",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port,
    proxy: {
      "^/api(?:/|$)": {
        target: backendUrl,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/streamdown")) {
            return "vendor-streamdown";
          }
          if (id.includes("node_modules/effect") || id.includes("node_modules/@effect")) {
            return "vendor-effect";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
        }
      }
    }
  }
});
