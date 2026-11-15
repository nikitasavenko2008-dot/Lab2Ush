import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Клиент ходит на /api, прокси уводит запросы на сервер (порт 3001)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
