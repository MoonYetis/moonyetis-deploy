# Troubleshooting Hostinger VPS Connection
## Problema: No se puede conectar a 168.231.124.18

### Posibles Causas:

1. **VPS apagado/suspendido**
   - ✅ Verificar en panel de Hostinger si el VPS está activo
   - ✅ Comprobar estado de facturación

2. **Firewall bloqueando conexiones**
   - ✅ El VPS puede tener firewall restrictivo por defecto
   - ✅ SSH (puerto 22) puede estar bloqueado desde ciertas IPs

3. **Configuración de red**
   - ✅ IP puede haber cambiado
   - ✅ DNS no actualizado

4. **Configuración SSH**
   - ✅ SSH puede estar configurado en puerto diferente
   - ✅ Autenticación por clave requerida

### Soluciones:

#### 1. Verificar en Panel de Hostinger:
- Acceder a hPanel de Hostinger
- Ir a VPS > srv876195.hstgr.cloud
- Verificar:
  - ✅ Estado: Activo/Inactivo
  - ✅ IP actual
  - ✅ Configuración SSH
  - ✅ Firewall settings

#### 2. Conexión desde Panel Web:
- Usar terminal web de Hostinger
- Acceder directamente desde el panel
- Verificar conectividad interna

#### 3. Configuración de Firewall:
```bash
# Una vez conectado, configurar firewall:
ufw status
ufw allow ssh
ufw allow 22
ufw allow from YOUR_IP
```

#### 4. Verificar SSH:
```bash
# Probar diferentes puertos:
ssh -p 22 root@168.231.124.18
ssh -p 2222 root@168.231.124.18

# Con verbose para debug:
ssh -v root@168.231.124.18
```

### Plan Alternativo:

#### Opción A: Terminal Web Hostinger
1. Acceder a hPanel → VPS → Terminal
2. Ejecutar comandos directamente
3. Subir archivos via FTP/SFTP

#### Opción B: Configuración Manual
1. Usar File Manager de Hostinger
2. Subir archivos vía web
3. Configurar desde terminal web

#### Opción C: Repositorio Git
1. Crear repo en GitHub/GitLab
2. Clonar en el VPS
3. Deploy desde git

### Comandos para Ejecutar en Terminal Web:

```bash
# 1. Actualizar sistema
apt update && apt upgrade -y

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. Instalar PM2
npm install -g pm2

# 4. Crear directorio
mkdir -p /var/www/moonyetis-slots
cd /var/www/moonyetis-slots

# 5. Si tienes los archivos, instalar:
npm install --production
pm2 start server.js --name moonyetis-slots
pm2 save
pm2 startup
```

### Próximos Pasos:
1. **Verificar VPS en panel Hostinger**
2. **Usar terminal web para configurar**
3. **Configurar firewall y SSH**
4. **Reintentar despliegue**