# 🔧 Solución SSH para Hostinger VPS

## 🚨 **Problema Actual:**
```
ssh: connect to host 168.231.124.18 port 22: Operation timed out
```

## 🔍 **Posibles Causas y Soluciones:**

### **1. Puerto SSH Diferente**
Hostinger puede usar un puerto SSH diferente al 22 estándar.

**Prueba estos puertos comunes:**
```bash
# Puerto 2222 (muy común en Hostinger)
ssh -p 2222 root@168.231.124.18

# Puerto 22022 (también usado)
ssh -p 22022 root@168.231.124.18

# Puerto 22122
ssh -p 22122 root@168.231.124.18
```

### **2. Usuario Diferente**
Algunos VPS usan 'ubuntu' en lugar de 'root':
```bash
ssh -p 2222 ubuntu@168.231.124.18
```

### **3. Verificar en Panel Hostinger**
1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. VPS → Tu VPS → **SSH Access** o **Terminal**
3. Busca la información exacta:
   - **Puerto SSH**: (probablemente no es 22)
   - **Usuario**: (puede ser ubuntu, admin, o root)
   - **IP**: (confirmar que es 168.231.124.18)

### **4. Probar con Hostname**
```bash
ssh root@srv876195.hstgr.cloud
ssh -p 2222 root@srv876195.hstgr.cloud
```

### **5. Verificar Firewall Local**
Si estás en una red corporativa/universidad:
```bash
# Probar conectividad básica
ping 168.231.124.18
telnet 168.231.124.18 22
telnet 168.231.124.18 2222
```

## 🛠️ **Script de Diagnóstico**

Ejecuta esto para probar automáticamente:

```bash
#!/bin/bash
echo "🔍 Probando conexiones SSH a Hostinger VPS..."
echo "IP: 168.231.124.18"
echo "Hostname: srv876195.hstgr.cloud"
echo ""

# Puertos comunes para probar
PORTS=(22 2222 22022 22122)
HOSTS=("168.231.124.18" "srv876195.hstgr.cloud")
USERS=("root" "ubuntu" "admin")

for host in "${HOSTS[@]}"; do
    echo "🖥️ Probando host: $host"
    
    for port in "${PORTS[@]}"; do
        echo -n "   Puerto $port: "
        if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            echo "✅ ABIERTO"
            
            for user in "${USERS[@]}"; do
                echo "      Probando usuario '$user'..."
                ssh -o ConnectTimeout=5 -o BatchMode=yes -p $port $user@$host exit 2>/dev/null
                if [ $? -eq 0 ]; then
                    echo "      ✅ ÉXITO: ssh -p $port $user@$host"
                fi
            done
        else
            echo "❌ cerrado/filtrado"
        fi
    done
    echo ""
done
```

## 🎯 **Alternativas Mientras Resolvemos SSH:**

### **Opción A: Terminal Web Hostinger**
1. Ve a hpanel.hostinger.com
2. VPS → Terminal/Browser Terminal
3. Ejecuta los comandos directamente ahí

### **Opción B: File Manager + Terminal Web**
1. Subir archivos via File Manager
2. Ejecutar comandos via Terminal Web

### **Opción C: Usar Claude Code en el Servidor**
Si ya tienes Claude Code configurado en el servidor:
1. Accede via Terminal Web
2. Ejecuta `claude-code` en el servidor
3. Continúa el deployment desde ahí

## 📞 **Información Necesaria de Hostinger:**

En el panel de Hostinger, busca:
- **SSH Port**: ¿Cuál es el puerto exacto?
- **SSH User**: ¿root, ubuntu, admin?
- **SSH Keys**: ¿Están configuradas correctamente?
- **Firewall**: ¿Está habilitado SSH?

## 🚀 **Una vez resuelto SSH:**

Cuando tengamos la conexión correcta, ejecutaremos:
```bash
# Con los parámetros correctos
ssh -p PUERTO_CORRECTO USUARIO_CORRECTO@168.231.124.18
```

¡Y entonces procederemos con el deployment automático! 🎰