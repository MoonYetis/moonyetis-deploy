# 🔐 Configuración SSH para Hostinger VPS

## 📋 Pasos para habilitar SSH en Hostinger

### 1. Acceder al Panel de Hostinger
1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Inicia sesión con tu cuenta
3. Ve a la sección **VPS**
4. Selecciona tu VPS (srv876195.hstgr.cloud)

### 2. Configurar SSH en el Panel
1. En el panel del VPS, busca la sección **SSH Access** o **Terminal**
2. Habilita SSH si no está activo
3. Anota la información de conexión:
   - **IP**: 168.231.124.18
   - **Usuario**: root (por defecto)
   - **Puerto**: 22 (por defecto, pero puede ser diferente)

### 3. Configurar Clave SSH
1. En el panel, busca **SSH Keys** o **Claves SSH**
2. Agrega tu clave pública SSH

**Tu clave pública está en:**
```bash
cat ~/.ssh/id_rsa.pub
```

**Copia esta clave y pégala en el panel de Hostinger**

### 4. Probar Conexión SSH
Una vez configurado, prueba la conexión:

```bash
# Probar conexión básica
ssh root@168.231.124.18

# Si usa puerto diferente (ejemplo: 2222)
ssh -p 2222 root@168.231.124.18
```

## 🔧 Alternativas si SSH no funciona

### Opción 1: Usar el Terminal Web de Hostinger
1. En el panel de Hostinger, usa **Browser Terminal** o **Web Terminal**
2. Desde ahí puedes ejecutar comandos directamente

### Opción 2: Deploy Manual por FTP/File Manager
1. Comprimir archivos localmente
2. Subir via File Manager de Hostinger
3. Ejecutar comandos via terminal web

### Opción 3: Deployment via GitHub (Recomendado)
1. Pushear código a GitHub
2. Clonar desde el servidor
3. Ejecutar setup desde terminal web

## 📞 Información de Contacto Hostinger
- **Soporte**: Centro de ayuda en hpanel
- **Documentación SSH**: Buscar "SSH access" en su knowledge base

## 🚀 Una vez SSH funcione
Ejecutar desde local:
```bash
./auto-deploy.sh
```

O seguir deployment manual paso a paso.