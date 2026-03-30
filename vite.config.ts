import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    port: 3004,
    proxy: {
      "/api": process.env.BACKEND_URL || "http://localhost:5174",
      "/jobs-api": process.env.BACKEND_URL || "http://localhost:5175",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        jobs: "jobs.html",
      },
    },
  },
});
