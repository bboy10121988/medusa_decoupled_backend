import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: [
      'admin.timsfantasyworld.com',
      'localhost',
      '127.0.0.1'
    ]
  }
})