import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/bookings': 'http://localhost:8080',
      '/feedback': 'http://localhost:8080',
      '/submissions': 'http://localhost:8080',
      '/messages': 'http://localhost:8080',
      '/ratings': 'http://localhost:8080',
      '/packages': 'http://localhost:8080',
      '/socket.io': { target: 'http://localhost:8080', ws: true },
    },
  }
})
