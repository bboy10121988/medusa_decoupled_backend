import { defineConfig } from 'vite'

export default defineConfig({
  admin:{
    vite: () => {
      return {
        server:{
          allowedHosts:[".timsfantasyworld.com"]
        }
      }
    }
  },
  server: {
    allowedHosts: [
      'admin.timsfantasyworld.com',
      'localhost',
      '127.0.0.1'
    ]
  }
})