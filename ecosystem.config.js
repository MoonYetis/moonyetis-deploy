module.exports = {
  apps: [{
    name: 'moonyetis-slots',
    script: 'server.js',
    cwd: '/var/www/moonyetis-slots',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/moonyetis-slots/error.log',
    out_file: '/var/log/moonyetis-slots/access.log',
    log_file: '/var/log/moonyetis-slots/app.log',
    merge_logs: true,
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log'
    ],
    env_file: '.env.production'
  }]
};
