module.exports = {
  apps: [
    {
      name: 'moonyetis-store',
      script: './store-server-v2.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        STORE_PORT: 3002
      },
      error_file: './logs/store-error.log',
      out_file: './logs/store-out.log',
      log_file: './logs/store-combined.log',
      time: true
    }
  ]
};
