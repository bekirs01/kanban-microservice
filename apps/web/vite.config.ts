import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import path from "path"
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    port: Number(process.env.PORT) || 3000,
  },
  server: {
    host: true,
    allowedHosts: true,
    port: Number(process.env.PORT) || 3000,
  },
})
