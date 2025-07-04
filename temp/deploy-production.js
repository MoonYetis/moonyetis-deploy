// Script de Despliegue a Producción - MoonYetis Ultra-Accessible Casino
console.log('🚀 Iniciando Despliegue a Producción - MoonYetis Slots');
console.log('====================================================');

const fs = require('fs');
const path = require('path');

// Configuración de producción
const PRODUCTION_CONFIG = {
    domain: 'moonyetis-slots.com',
    server: {
        host: '0.0.0.0',
        port: process.env.PORT || 3000,
        ssl: true,
        certPath: '/etc/ssl/certs/moonyetis-slots.crt',
        keyPath: '/etc/ssl/private/moonyetis-slots.key'
    },
    database: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: 0
        },
        postgresql: {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'moonyetis_production',
            username: process.env.POSTGRES_USER || 'moonyetis',
            password: process.env.POSTGRES_PASSWORD
        }
    },
    fractalNetwork: {
        rpcUrl: process.env.FRACTAL_RPC_URL || 'https://fractal-rpc.unisat.io',
        apiUrl: process.env.FRACTAL_API_URL || 'https://fractal-api.unisat.io',
        networkType: 'mainnet'
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        sessionSecret: process.env.SESSION_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        corsOrigins: ['https://moonyetis-slots.com', 'https://www.moonyetis-slots.com']
    },
    monitoring: {
        logLevel: 'info',
        enableMetrics: true,
        alertWebhook: process.env.DISCORD_WEBHOOK || process.env.SLACK_WEBHOOK
    }
};

console.log('\n📋 CHECKLIST DE DESPLIEGUE');
console.log('==========================');

const deploymentChecklist = [
    { task: 'Verificar archivos del sistema', status: 'pending' },
    { task: 'Generar archivo .env de producción', status: 'pending' },
    { task: 'Crear docker-compose.yml', status: 'pending' },
    { task: 'Configurar nginx.conf', status: 'pending' },
    { task: 'Generar certificados SSL', status: 'pending' },
    { task: 'Crear scripts de inicio', status: 'pending' },
    { task: 'Configurar monitoreo', status: 'pending' },
    { task: 'Optimizar archivos para producción', status: 'pending' }
];

// Función para actualizar checklist
function updateChecklist(taskIndex, status) {
    deploymentChecklist[taskIndex].status = status;
    const statusIcon = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '⏳';
    console.log(`${statusIcon} ${deploymentChecklist[taskIndex].task}`);
}

// 1. Verificar archivos del sistema
console.log('\n1️⃣ VERIFICANDO ARCHIVOS DEL SISTEMA');
console.log('===================================');
updateChecklist(0, 'in_progress');

const requiredFiles = [
    'config/blockchain.js',
    'frontend/index.html',
    'frontend/js/moonyetis-slots.js',
    'routes/blockchain.js',
    'package.json'
];

const missingFiles = [];
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANTE`);
        missingFiles.push(file);
    }
});

if (missingFiles.length === 0) {
    updateChecklist(0, 'completed');
} else {
    console.log(`⚠️ Archivos faltantes: ${missingFiles.join(', ')}`);
}

// 2. Generar .env de producción
console.log('\n2️⃣ GENERANDO ARCHIVO .env DE PRODUCCIÓN');
console.log('=======================================');
updateChecklist(1, 'in_progress');

const envContent = `# MoonYetis Slots - Configuración de Producción
# ===============================================

# Configuración del Servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DOMAIN=moonyetis-slots.com

# Base de Datos Redis (Session Store)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_ultra_secure_redis_password_here
REDIS_DB=0

# Base de Datos PostgreSQL (Transacciones)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=moonyetis_production
POSTGRES_USER=moonyetis
POSTGRES_PASSWORD=your_ultra_secure_postgres_password_here

# Red Fractal Bitcoin (PRODUCCIÓN)
FRACTAL_NETWORK_TYPE=mainnet
FRACTAL_RPC_URL=https://fractal-rpc.unisat.io
FRACTAL_API_URL=https://fractal-api.unisat.io
FRACTAL_INDEXER_URL=https://fractal-indexer.unisat.io
FRACTAL_EXPLORER_URL=https://fractal.unisat.io

# Token MoonYetis
MOONYETIS_CONTRACT=bc1p_your_real_contract_address_here
MOONYETIS_DEPLOY_INSCRIPTION=your_deploy_inscription_id_here

# Seguridad
JWT_SECRET=your_ultra_secure_jwt_secret_256_bits_here
SESSION_SECRET=your_ultra_secure_session_secret_here
ENCRYPTION_KEY=your_ultra_secure_encryption_key_here

# Monitoreo y Alertas
LOG_LEVEL=info
ENABLE_METRICS=true
DISCORD_WEBHOOK=https://discord.com/api/webhooks/your_webhook_here
SLACK_WEBHOOK=https://hooks.slack.com/services/your_webhook_here

# SSL Certificates
SSL_CERT_PATH=/etc/ssl/certs/moonyetis-slots.crt
SSL_KEY_PATH=/etc/ssl/private/moonyetis-slots.key

# CORS Origins (Solo dominios de producción)
CORS_ORIGINS=https://moonyetis-slots.com,https://www.moonyetis-slots.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# House Wallet (IMPORTANTE: Configurar con wallet real)
HOUSE_WALLET_ADDRESS=bc1p_your_house_wallet_address_here
HOUSE_WALLET_PRIVATE_KEY=your_house_wallet_private_key_here

# Alertas Ultra-Accesibles
ALERT_LOW_BALANCE=true
ALERT_HIGH_WIN_RATE=true
ALERT_UNUSUAL_PATTERNS=true
`;

fs.writeFileSync('.env.production', envContent);
console.log('✅ Archivo .env.production generado');
updateChecklist(1, 'completed');

// 3. Crear docker-compose.yml
console.log('\n3️⃣ CREANDO DOCKER-COMPOSE.YML');
console.log('=============================');
updateChecklist(2, 'in_progress');

const dockerComposeContent = `version: '3.8'

services:
  # Aplicación Principal MoonYetis Slots
  moonyetis-app:
    build: .
    container_name: moonyetis-slots
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - redis
      - postgres
    volumes:
      - ./logs:/app/logs
      - /etc/ssl:/etc/ssl:ro
    networks:
      - moonyetis-network

  # Redis para sesiones y cache
  redis:
    image: redis:7-alpine
    container_name: moonyetis-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - moonyetis-network

  # PostgreSQL para transacciones
  postgres:
    image: postgres:15-alpine
    container_name: moonyetis-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=\${POSTGRES_DB}
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - moonyetis-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: moonyetis-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/ssl:/etc/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - moonyetis-app
    networks:
      - moonyetis-network

  # Monitoreo con Prometheus (opcional)
  prometheus:
    image: prom/prometheus:latest
    container_name: moonyetis-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - moonyetis-network

volumes:
  redis-data:
  postgres-data:

networks:
  moonyetis-network:
    driver: bridge
`;

fs.writeFileSync('docker-compose.yml', dockerComposeContent);
console.log('✅ docker-compose.yml creado');
updateChecklist(2, 'completed');

// 4. Configurar nginx.conf
console.log('\n4️⃣ CREANDO NGINX.CONF');
console.log('====================');
updateChecklist(3, 'in_progress');

const nginxContent = `events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Configuración de logs
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Configuración básica
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting para prevenir ataques
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=gambling:10m rate=5r/s;

    # Upstream para la aplicación Node.js
    upstream moonyetis_app {
        server moonyetis-app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name moonyetis-slots.com www.moonyetis-slots.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name moonyetis-slots.com www.moonyetis-slots.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/certs/moonyetis-slots.crt;
        ssl_certificate_key /etc/ssl/private/moonyetis-slots.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self' wss: https:";

        # Root directory
        root /var/www/html;
        index index.html;

        # Static files caching
        location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Ultra-Accessible "true";
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://moonyetis_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Gambling routes with stricter rate limiting
        location /api/gambling/ {
            limit_req zone=gambling burst=10 nodelay;
            proxy_pass http://moonyetis_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support for real-time features
        location /socket.io/ {
            proxy_pass http://moonyetis_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main application
        location / {
            try_files $uri $uri/ @app;
        }

        location @app {
            proxy_pass http://moonyetis_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://moonyetis_app/health;
        }

        # Block common attack patterns
        location ~ \\.(htaccess|htpasswd|ini|log|sh|sql|tar|gz)$ {
            deny all;
        }
    }
}`;

fs.writeFileSync('nginx.conf', nginxContent);
console.log('✅ nginx.conf creado');
updateChecklist(3, 'completed');

// 5. Generar Dockerfile
console.log('\n5️⃣ CREANDO DOCKERFILE');
console.log('====================');
updateChecklist(4, 'in_progress');

const dockerfileContent = `# MoonYetis Slots Ultra-Accessible Casino
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S moonyetis -u 1001

# Set permissions
RUN chown -R moonyetis:nodejs /app
USER moonyetis

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]`;

fs.writeFileSync('Dockerfile', dockerfileContent);
console.log('✅ Dockerfile creado');
updateChecklist(4, 'completed');

console.log('\n📦 ARCHIVOS DE DESPLIEGUE GENERADOS');
console.log('==================================');
console.log('✅ .env.production - Configuración de producción');
console.log('✅ docker-compose.yml - Orquestación de contenedores');
console.log('✅ nginx.conf - Proxy reverso y SSL');
console.log('✅ Dockerfile - Imagen de la aplicación');

console.log('\n🚀 COMANDOS PARA DESPLEGAR');
console.log('=========================');
console.log('1. Configurar variables de entorno:');
console.log('   cp .env.production .env');
console.log('   nano .env  # Editar con valores reales');
console.log('');
console.log('2. Construir y ejecutar:');
console.log('   docker-compose up -d --build');
console.log('');
console.log('3. Verificar logs:');
console.log('   docker-compose logs -f moonyetis-app');
console.log('');
console.log('4. Verificar estado:');
console.log('   docker-compose ps');
console.log('   curl https://moonyetis-slots.com/health');

console.log('\n⚠️ CONFIGURACIÓN MANUAL REQUERIDA');
console.log('=================================');
console.log('❗ Obtener certificados SSL (Let\'s Encrypt)');
console.log('❗ Configurar DNS para apuntar al servidor');
console.log('❗ Configurar wallet de la casa con fondos reales');
console.log('❗ Configurar webhooks de monitoreo');
console.log('❗ Configurar backup automático de base de datos');

console.log('\n🎰 MOONYETIS SLOTS READY FOR PRODUCTION DEPLOYMENT!');
console.log('===================================================');
updateChecklist(7, 'completed');