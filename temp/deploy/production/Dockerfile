# Production Dockerfile for MoonYetis Backend
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    postgresql-client \
    redis \
    openssl \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S moonyetis -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/.secure /app/.ssl && \
    chown -R moonyetis:nodejs /app

# Set correct permissions
RUN chmod 755 /app && \
    chmod -R 700 /app/.secure /app/.ssl && \
    chmod +x /app/scripts/*.js

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/monitoring/health || exit 1

# Switch to non-root user
USER moonyetis

# Expose ports
EXPOSE 3000 3443

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]