import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 1. Enables HTTPS on your local network
  ],
  server: {
    host: true, // Allows network access
    proxy: {
      // 2. Intercept any request starting with /api and forward it to Spring Boot
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})