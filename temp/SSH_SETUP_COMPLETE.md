# 🔐 Configuración SSH Completa para Hostinger VPS

## 🎯 **Objetivo: Habilitar SSH desde tu terminal local**

Para poder usar Claude Code en el servidor, necesitamos establecer la conexión SSH correctamente.

## 📋 **PASO 1: Verificar Configuración en Panel Hostinger**

### 1.1 Acceder al Panel
1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Inicia sesión → **VPS** → Selecciona tu VPS (srv876195.hstgr.cloud)

### 1.2 Buscar Información SSH
Busca estas secciones en el panel:
- **"SSH Access"** o **"Terminal"** o **"SSH Keys"**
- **"VPS Management"** → **"SSH"**
- **"Security"** → **"SSH Configuration"**

### 1.3 Información Crítica a Verificar:
```
📝 ANOTAR ESTOS DATOS:
┌─────────────────────────────────────┐
│ SSH Port: _____ (probablemente 2222)│
│ SSH User: _____ (root/ubuntu/admin) │
│ IP Address: 168.231.124.18         │
│ Hostname: srv876195.hstgr.cloud    │
│ SSH Keys: □ Habilitado □ Deshabilitado│
└─────────────────────────────────────┘
```

## 🔧 **PASO 2: Configurar SSH Keys (Si no están configuradas)**

### 2.1 Verificar tu Clave SSH Local
```bash
# Ver si ya tienes clave SSH
ls -la ~/.ssh/

# Si no tienes id_rsa.pub, crear nueva clave
ssh-keygen -t rsa -b 4096 -C "tu_email@example.com"
```

### 2.2 Obtener tu Clave Pública
```bash
# Mostrar tu clave pública para copiar
cat ~/.ssh/id_rsa.pub
```

### 2.3 Agregar Clave en Panel Hostinger
1. En el panel de Hostinger → **SSH Keys** o **SSH Access**
2. **"Add SSH Key"** o **"Manage SSH Keys"**
3. Pegar tu clave pública (`id_rsa.pub`)
4. Guardar cambios

## 🚀 **PASO 3: Script de Conexión Automática**

Una vez que tengas la información del panel, crea este script:

```bash
#!/bin/bash
# Archivo: connect-hostinger.sh

# CONFIGURACIÓN - REEMPLAZAR CON TUS DATOS REALES
SSH_PORT="2222"        # Puerto del panel Hostinger
SSH_USER="root"        # Usuario del panel Hostinger  
SSH_HOST="168.231.124.18"
SSH_HOSTNAME="srv876195.hstgr.cloud"

echo "🔌 Conectando a Hostinger VPS..."
echo "   Host: $SSH_HOST"
echo "   Port: $SSH_PORT"
echo "   User: $SSH_USER"
echo ""

# Intentar conexión
ssh -p $SSH_PORT $SSH_USER@$SSH_HOST

# Si falla con IP, probar con hostname
if [ $? -ne 0 ]; then
    echo "⚠️ Conexión con IP falló, probando hostname..."
    ssh -p $SSH_PORT $SSH_USER@$SSH_HOSTNAME
fi
```

## 🔍 **PASO 4: Diagnóstico Avanzado**

Si aún no funciona, ejecuta este diagnóstico:

```bash
#!/bin/bash
# Script: diagnose-hostinger-ssh.sh

echo "🔍 Diagnóstico SSH Avanzado para Hostinger"
echo "=========================================="

# Información del sistema
echo "🖥️ Tu sistema:"
echo "   OS: $(uname -s)"
echo "   Usuario: $(whoami)"
echo "   SSH Client: $(ssh -V 2>&1 | head -1)"
echo ""

# Verificar claves SSH
echo "🔑 Claves SSH locales:"
if [ -f ~/.ssh/id_rsa ]; then
    echo "   ✅ Clave privada: ~/.ssh/id_rsa"
else
    echo "   ❌ No hay clave privada"
fi

if [ -f ~/.ssh/id_rsa.pub ]; then
    echo "   ✅ Clave pública: ~/.ssh/id_rsa.pub"
    echo "   📋 Contenido:"
    cat ~/.ssh/id_rsa.pub
else
    echo "   ❌ No hay clave pública"
fi
echo ""

# Probar conectividad de red
echo "🌐 Conectividad de red:"
echo -n "   Ping a 168.231.124.18: "
if ping -c 1 168.231.124.18 >/dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FALLA"
fi

echo -n "   Ping a srv876195.hstgr.cloud: "
if ping -c 1 srv876195.hstgr.cloud >/dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FALLA"
fi
echo ""

# Probar puertos específicos
echo "🔌 Probando puertos SSH comunes:"
PORTS=(22 2222 22022 22122 2022 443 80)
HOST="168.231.124.18"

for port in "${PORTS[@]}"; do
    echo -n "   Puerto $port: "
    if timeout 3 bash -c "</dev/tcp/$HOST/$port" 2>/dev/null; then
        echo "✅ ABIERTO"
    else
        echo "❌ cerrado"
    fi
done
echo ""

# Configuración SSH actual
echo "📁 Configuración SSH:"
if [ -f ~/.ssh/config ]; then
    echo "   ✅ Archivo config existe"
    echo "   📋 Contenido relevante:"
    grep -A 10 -i hostinger ~/.ssh/config 2>/dev/null || echo "   (No hay configuración para Hostinger)"
else
    echo "   ⚠️ No hay archivo ~/.ssh/config"
fi
```

## ⚙️ **PASO 5: Crear Configuración SSH Optimizada**

Una vez que tengas los datos correctos, crea esta configuración:

```bash
# Crear/editar ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'

# Hostinger VPS Configuration
Host hostinger
    HostName 168.231.124.18
    User root
    Port 2222
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

Host hostinger-alt
    HostName srv876195.hstgr.cloud
    User root
    Port 2222
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

# Ajustar permisos
chmod 600 ~/.ssh/config
```

Después de esto, podrás conectar simplemente con:
```bash
ssh hostinger
```

## 🛠️ **PASO 6: Soluciones para Problemas Comunes**

### Problema: "Permission denied (publickey)"
```bash
# Agregar clave al agente SSH
ssh-add ~/.ssh/id_rsa

# Verificar que se agregó
ssh-add -l
```

### Problema: "Host key verification failed"
```bash
# Limpiar host keys conocidos
ssh-keygen -R 168.231.124.18
ssh-keygen -R srv876195.hstgr.cloud
```

### Problema: Firewall corporativo
```bash
# Probar conexión via HTTPS (puerto 443)
ssh -p 443 root@168.231.124.18
```

## 🎯 **PASO 7: Una vez conectado, verificar Claude Code**

```bash
# Conectar al servidor
ssh hostinger

# Verificar Claude Code
which claude
claude --version

# Si no está instalado, instalar
curl -fsSL https://claude.ai/cli/install | sh
```

## 📞 **PASO 8: Contactar Soporte Hostinger (Si todo falla)**

Si nada funciona, contacta el soporte de Hostinger con esta información:
- **Problema**: No puedo conectar via SSH desde terminal local
- **VPS**: srv876195.hstgr.cloud (168.231.124.18)
- **Error**: Operation timed out en puerto 22
- **Solicitud**: Verificar configuración SSH y puerto correcto

## 🚀 **Una vez SSH funcione:**

```bash
# Conectar al servidor
ssh hostinger

# Navegar al directorio del proyecto
cd /var/www

# Iniciar Claude Code
claude-code

# ¡Ahora puedes usar Claude Code en el servidor!
```

---

**🎯 ¡El objetivo es que puedas hacer `ssh hostinger` y luego `claude-code` directamente!** 

¿Empezamos verificando la configuración en el panel de Hostinger? 🔧