import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), tailwindcss(), react()],
  resolve: {
    tsconfigPaths: true,
  },
})
