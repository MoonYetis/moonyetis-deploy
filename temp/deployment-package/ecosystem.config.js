module.exports = {
  apps: [{
    name: 'moonyetis-slots',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/var/log/moonyetis/combined.log',
    out_file: '/var/log/moonyetis/out.log',
    error_file: '/var/log/moonyetis/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
