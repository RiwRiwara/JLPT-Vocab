import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' so the built site works from any static path (GitHub Pages, subfolder, file server)
export default defineConfig({
  plugins: [react()],
  base: './',
})
