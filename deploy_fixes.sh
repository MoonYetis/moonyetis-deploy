#!/bin/bash

# MoonYetis Slots - Deploy Script
# Despliega los archivos corregidos al VPS

set -e

VPS_HOST="root@168.231.124.18"
VPS_PATH="/var/www/html/moonyetis-backend"
LOCAL_PROJECT="/Users/Warlink/Desktop/projects/moonyetis-backend"

echo "=� MoonYetis Slots - Deploying fixes to VPS..."
echo "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP"

# Verificar conexi�n SSH
echo "= Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 $VPS_HOST "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "L SSH connection failed. Please check VPS connection."
    exit 1
fi
echo " SSH connection verified"

# Crear backup del frontend actual
echo "=� Creating backup of current frontend..."
ssh $VPS_HOST "cd $VPS_PATH && cp frontend/index.html frontend/index.html.backup.$(date +%Y%m%d_%H%M%S)"
echo " Backup created"

# Subir frontend corregido
echo "=� Uploading fixed frontend/index.html..."
scp "$LOCAL_PROJECT/frontend/index.html" $VPS_HOST:$VPS_PATH/frontend/
echo " Frontend uploaded"

# Verificar que el archivo se subi� correctamente
echo "= Verifying file upload..."
REMOTE_SIZE=$(ssh $VPS_HOST "stat -f%z $VPS_PATH/frontend/index.html 2>/dev/null || stat -c%s $VPS_PATH/frontend/index.html")
LOCAL_SIZE=$(stat -f%z "$LOCAL_PROJECT/frontend/index.html" 2>/dev/null || stat -c%s "$LOCAL_PROJECT/frontend/index.html")

if [ "$REMOTE_SIZE" = "$LOCAL_SIZE" ]; then
    echo " File upload verified (size: $LOCAL_SIZE bytes)"
else
    echo "�  File sizes differ - Local: $LOCAL_SIZE, Remote: $REMOTE_SIZE"
fi

# Reiniciar servicio si existe PM2
echo "= Restarting services..."
ssh $VPS_HOST "
    if command -v pm2 > /dev/null 2>&1; then
        echo '= Restarting PM2 process...'
        pm2 restart moonyetis 2>/dev/null || echo 'PM2 process not found, skipping...'
    fi
    
    # Verificar que nginx est� corriendo
    if command -v nginx > /dev/null 2>&1; then
        nginx -t && nginx -s reload 2>/dev/null || echo 'Nginx reload failed or not running'
    fi
"

# Verificar que el sitio est� accesible
echo "< Testing website accessibility..."
HTTP_STATUS=$(ssh $VPS_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost/ || echo '000'")

if [ "$HTTP_STATUS" = "200" ]; then
    echo " Website is accessible (HTTP $HTTP_STATUS)"
elif [ "$HTTP_STATUS" = "000" ]; then
    echo "�  Could not test website accessibility"
else
    echo "�  Website returned HTTP $HTTP_STATUS"
fi

echo ""
echo "<� DEPLOYMENT COMPLETED!"
echo "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP"
echo "<� FIXES DEPLOYED:"
echo "    AudioManager initialization with fallback"
echo "    WebSocket reconnection limit (max 3 attempts)"
echo "    Improved wallet error handling (code 4001)"
echo ""
echo "< Your site: http://168.231.124.18"
echo "=� Check browser console for improved error messages"
echo ""

# Mostrar �ltimas l�neas del log si existe
echo "=� Recent server logs:"
ssh $VPS_HOST "tail -n 5 /var/log/moonyetis/server.log 2>/dev/null || echo 'No server logs found'"

echo "<� MoonYetis Slots deployment complete! <"