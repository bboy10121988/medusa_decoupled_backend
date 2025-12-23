module.exports = {
  apps: [{
    name: 'medusa-backend',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/raychou/projects/backend',
    env: {
      NODE_ENV: 'production',
      BACKEND_URL: 'https://admin.timsfantasyworld.com',
      GOOGLE_CALLBACK_URL: 'https://admin.timsfantasyworld.com/auth/customer/google/callback',
      FRONTEND_URL: 'https://timsfantasyworld.com',
      COOKIE_DOMAIN: '.timsfantasyworld.com',
      PORT: '9000'
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1024M',
    error_file: '/home/raychou/.pm2/logs/medusa-backend-error.log',
    out_file: '/home/raychou/.pm2/logs/medusa-backend-out.log',
    log_file: '/home/raychou/.pm2/logs/medusa-backend-combined.log',
    time: true
  }]
}
