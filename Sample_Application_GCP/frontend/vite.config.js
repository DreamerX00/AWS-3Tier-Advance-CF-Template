import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'charts'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('@mui')) return 'mui'
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) return 'react-core'
          if (id.includes('axios') || id.includes('dayjs')) return 'data-utils'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
