# 🌐 Configuración de Dominio y SSL - MoonYetis Slots

## 📋 Resumen

Esta guía te ayudará a configurar tu dominio y certificados SSL para el lanzamiento en producción de MoonYetis Slots.

## 🛒 1. Adquisición del Dominio

### Dominios Recomendados
- `moonyetis.com` (ideal)
- `moonyetis.casino`
- `moonyetis.games`
- `moonyetis-slots.com`

### Proveedores Recomendados
- **Namecheap**: Económico, buena interfaz
- **Cloudflare**: Excelente seguridad, CDN incluido
- **GoDaddy**: Popular, soporte 24/7
- **Google Domains**: Integración con Google Cloud

## 🔧 2. Configuración DNS

### Registros DNS Necesarios

```dns
# Tipo A - Apunta a tu servidor
@ (root)        A       TU_IP_SERVIDOR
www             A       TU_IP_SERVIDOR

# Opcional: Subdominios adicionales
api             A       TU_IP_SERVIDOR
monitoring      A       TU_IP_SERVIDOR
admin           A       TU_IP_SERVIDOR
```

### Ejemplo con Cloudflare

1. **Agregar tu dominio a Cloudflare**
   - Ve a [cloudflare.com](https://cloudflare.com)
   - Crea cuenta y agrega tu dominio
   - Cambia los nameservers en tu registrar

2. **Configurar registros DNS**
   ```
   Tipo: A
   Nombre: @
   Contenido: TU_IP_SERVIDOR
   TTL: Auto
   Proxy: ✅ (Activado)
   
   Tipo: A
   Nombre: www
   Contenido: TU_IP_SERVIDOR
   TTL: Auto
   Proxy: ✅ (Activado)
   ```

3. **Configuraciones adicionales**
   - SSL/TLS: "Full (strict)"
   - Security Level: "Medium"
   - Rocket Loader: ✅ Activado
   - Auto Minify: CSS, JS, HTML

## 🔒 3. Configuración SSL

### Opción A: Let's Encrypt (Gratuito)

```bash
# 1. Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# 2. Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# 3. Configurar renovación automática
sudo crontab -e
# Agregar línea:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Opción B: Cloudflare SSL (Recomendado)

```bash
# 1. En Cloudflare Dashboard
# SSL/TLS > Origin Server > Create Certificate

# 2. Generar certificado
# - Hostnames: *.tu-dominio.com, tu-dominio.com
# - Validity: 15 años
# - Key type: RSA (2048)

# 3. Guardar archivos
sudo nano /etc/ssl/certs/tu-dominio.com.pem
# Pegar contenido del certificado

sudo nano /etc/ssl/private/tu-dominio.com.key
# Pegar contenido de la clave privada

# 4. Permisos seguros
sudo chmod 644 /etc/ssl/certs/tu-dominio.com.pem
sudo chmod 600 /etc/ssl/private/tu-dominio.com.key
```

## ⚙️ 4. Configuración de Nginx

### Actualizar configuración de Nginx

```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/moonyetis-slots

# Reemplazar tu-dominio.com con tu dominio real
sudo sed -i 's/tu-dominio\.com/moonyetis.com/g' /etc/nginx/sites-available/moonyetis-slots

# Si usas Cloudflare SSL, actualizar rutas de certificados
sudo sed -i 's|/etc/letsencrypt/live/tu-dominio.com/fullchain.pem|/etc/ssl/certs/moonyetis.com.pem|g' /etc/nginx/sites-available/moonyetis-slots
sudo sed -i 's|/etc/letsencrypt/live/tu-dominio.com/privkey.pem|/etc/ssl/private/moonyetis.com.key|g' /etc/nginx/sites-available/moonyetis-slots
```

### Configuración Nginx Completa

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name moonyetis.com www.moonyetis.com;
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS principal
server {
    listen 443 ssl http2;
    server_name moonyetis.com www.moonyetis.com;
    
    # Certificados SSL
    ssl_certificate /etc/ssl/certs/moonyetis.com.pem;
    ssl_certificate_key /etc/ssl/private/moonyetis.com.key;
    
    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Configuración de la aplicación
    location / {
        root /var/www/moonyetis-slots/frontend;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
    
    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Probar configuración

```bash
# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

## 🔧 5. Actualizar Variables de Entorno

```bash
# Editar .env.production
nano /var/www/moonyetis-slots/.env.production

# Actualizar variables de dominio
DOMAIN=moonyetis.com
FRONTEND_URL=https://moonyetis.com
```

## ✅ 6. Verificación Final

### Tests de Conectividad

```bash
# Test HTTP redirect
curl -I http://moonyetis.com
# Debería devolver 301 redirect a HTTPS

# Test HTTPS
curl -I https://moonyetis.com
# Debería devolver 200 OK

# Test API
curl https://moonyetis.com/api/health
# Debería devolver JSON con status OK

# Test SSL
openssl s_client -connect moonyetis.com:443 -servername moonyetis.com
# Verificar certificado válido
```

### Tools Online de Verificación

1. **SSL Labs**: [ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/)
   - Objetivo: Grado A+ en SSL
   
2. **GTmetrix**: [gtmetrix.com](https://gtmetrix.com)
   - Verificar velocidad de carga
   
3. **Security Headers**: [securityheaders.com](https://securityheaders.com)
   - Verificar headers de seguridad

## 🌍 7. Configuración Global (Opcional)

### CDN con Cloudflare

```javascript
// Configuraciones optimizadas en Cloudflare

// Speed > Optimization
Auto Minify: CSS, HTML, JS ✅
Rocket Loader: ✅
Mirage: ✅
Polish: Lossless

// Caching
Browser Cache TTL: 4 hours
Caching Level: Standard

// Security
Security Level: Medium
Bot Fight Mode: ✅
```

### Configuración de CORS

```javascript
// En server.js, actualizar CORS
app.use(cors({
    origin: [
        'https://moonyetis.com',
        'https://www.moonyetis.com'
    ],
    credentials: true
}));
```

## 🔄 8. Monitoreo Post-Configuración

### Alertas de Certificado

```bash
# Script de verificación SSL (cron diario)
#!/bin/bash
DOMAIN="moonyetis.com"
EXPIRY_DATE=$(openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
    echo "⚠️ SSL certificate for $DOMAIN expires in $DAYS_LEFT days!"
    # Enviar alerta por email/slack
fi
```

### Uptime Monitoring

Servicios recomendados:
- **UptimeRobot**: Gratis, checks cada 5 min
- **Pingdom**: Profesional, múltiples ubicaciones
- **StatusCake**: Económico, buenas alertas

## 📞 9. Soporte y Troubleshooting

### Problemas Comunes

**Error: SSL_ERROR_BAD_CERT_DOMAIN**
```bash
# Verificar que el certificado incluya todos los dominios
openssl x509 -in /etc/ssl/certs/moonyetis.com.pem -text | grep DNS:
```

**Error: This site can't be reached**
```bash
# Verificar registros DNS
dig moonyetis.com
nslookup moonyetis.com

# Verificar firewall
sudo ufw status
```

**Error: Mixed Content**
```bash
# Asegurar que todas las URLs sean HTTPS
grep -r "http://" /var/www/moonyetis-slots/frontend/
```

### Comandos de Diagnóstico

```bash
# Status completo del sistema
sudo systemctl status nginx
sudo systemctl status pm2-$USER
curl -I https://moonyetis.com/api/health

# Logs importantes
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
pm2 logs moonyetis-slots
```

## 🎉 ¡Configuración Completa!

Una vez completados estos pasos, tu MoonYetis Slots estará accesible en:

- **Website**: https://moonyetis.com
- **Monitoring**: https://moonyetis.com/monitoring-dashboard.html
- **API Health**: https://moonyetis.com/api/health

### Checklist Final

- [ ] Dominio registrado y DNS configurado
- [ ] Certificados SSL instalados y válidos
- [ ] Nginx configurado y funcionando
- [ ] Variables de entorno actualizadas
- [ ] Tests de conectividad pasados
- [ ] Monitoreo configurado
- [ ] Backups de configuración realizados

---

*🌐 Dominio y SSL configurados para MoonYetis Slots*  
*Listo para producción en Fractal Bitcoin mainnet*