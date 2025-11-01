module.exports = {
  apps: [{
    name: 'medusa-backend',
    script: 'yarn',
    args: 'start',
    cwd: '/home/raychou/projects/backend',
    env: {
      NODE_ENV: 'production'
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/home/raychou/.pm2/logs/medusa-backend-error.log',
    out_file: '/home/raychou/.pm2/logs/medusa-backend-out.log',
    log_file: '/home/raychou/.pm2/logs/medusa-backend-combined.log',
    time: true
  }]
}
