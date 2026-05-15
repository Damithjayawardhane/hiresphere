import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:5001',
      '/bookings': 'http://localhost:5002',
      '/feedback': 'http://localhost:5003',
      '/submissions': 'http://localhost:5003',
      '/messages': 'http://localhost:5003',
      '/socket.io': { target: 'http://localhost:5003', ws: true }
    }
  }
})
