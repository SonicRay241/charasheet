import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { googleTokenDevPlugin } from './scripts/google-token-dev-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), tailwindcss(), react(), googleTokenDevPlugin()],
  resolve: {
    tsconfigPaths: true,
  },
})
