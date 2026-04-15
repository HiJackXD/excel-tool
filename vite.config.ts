import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed port
  server: {
    port: 5173,
    strictPort: true,
  },
  // Clear screen is handled by Tauri CLI
  clearScreen: false,
})
