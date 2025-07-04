# 🎯 Guía Específica Panel Hostinger VPS

## 🚨 **SITUACIÓN ACTUAL:**
- ❌ SSH no accesible desde tu terminal
- ❌ Ping falla (normal en VPS con firewall)
- ✅ DNS resuelve correctamente
- ✅ Claves SSH listas

## 🔧 **PASOS EN PANEL HOSTINGER:**

### **PASO 1: Verificar Estado del VPS**
1. Ve a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Inicia sesión
3. Ve a **VPS** → Selecciona **srv876195.hstgr.cloud**
4. **Verificar estado**:
   ```
   ✅ ¿Está RUNNING/ONLINE?
   ✅ ¿CPU y RAM normales?
   ✅ ¿Sin errores en dashboard?
   ```

### **PASO 2: Configurar SSH Access**
Busca alguna de estas secciones:
- **"SSH Access"**
- **"Terminal"** 
- **"SSH Keys"**
- **"Security"** → **"SSH"**
- **"VPS Management"** → **"SSH"**

#### 📝 **Información a verificar/configurar:**

**A) Puerto SSH:**
```
□ Puerto 22 (estándar)
□ Puerto 2222 (común en Hostinger)
□ Puerto personalizado: _____
```

**B) Usuario SSH:**
```
□ root
□ ubuntu  
□ admin
□ Otro: _____
```

**C) SSH habilitado:**
```
□ SSH Access: ENABLED/DISABLED
□ Password Authentication: ENABLED/DISABLED  
□ Key Authentication: ENABLED/DISABLED
```

### **PASO 3: Agregar tu Clave SSH**
1. Busca **"SSH Keys"** o **"Manage SSH Keys"**
2. **"Add SSH Key"** o **"Import Public Key"**
3. **Pegar esta clave**:
   ```
   ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8MYWXGEtZn8BE0HhALrj0fkx6XGgZwKqP9oqUt32jW/81hbsywGzounqUOIHLOczfwb4CSkSQL60kmhx6udoHqIDRO2zMA6KTH+uha4yK1B/fgVaM0eaMP4azKMN1/VTB9loQs3bAd/YWpqdYLA9xzrvXqVreieBtjVyf4YRSRForbDSO3rTEEPflusXIJvrF1MX2cll2dwKWyvuQhhRnwEq9wjW3Ao44QLp2jzuYbCHbG/WQ+//jXWbPRQB38XXkwd9rBhaeAZ5CAdF2NLpNVwI03vGZ6ojVvC489NwMDpqBDtEOee4Kgf5Rpodj9L86dnG4Kr6cvs9prqwKyFY1
   ```
4. **Guardar/Apply changes**

### **PASO 4: Verificar Firewall**
Busca **"Firewall"** o **"Security Rules"**:
```
✅ Puerto SSH (22 o 2222) debe estar ABIERTO
✅ Puerto 80 (HTTP) debe estar ABIERTO  
✅ Puerto 443 (HTTPS) debe estar ABIERTO
✅ Puerto 3000 (temporal para app) debe estar ABIERTO
```

### **PASO 5: Probar Browser Terminal**
1. Busca **"Browser Terminal"** o **"Web Terminal"**
2. Hacer clic para abrir
3. **Probar comandos básicos**:
   ```bash
   whoami
   pwd
   ls -la
   ```

### **PASO 6: Si Browser Terminal funciona**
Ejecutar en el terminal web:
```bash
# Verificar servicios SSH
systemctl status ssh
systemctl status sshd

# Ver configuración SSH
cat /etc/ssh/sshd_config | grep -E "(Port|PermitRoot|PubkeyAuth)"

# Ver claves SSH autorizadas
cat ~/.ssh/authorized_keys
```

## 🎯 **ESCENARIOS POSIBLES:**

### **Escenario A: SSH Deshabilitado**
Si SSH no está habilitado:
1. **Habilitar SSH** en panel
2. **Reiniciar VPS** si es necesario
3. **Probar conexión** desde tu terminal

### **Escenario B: Puerto SSH Diferente**
Si descubres que el puerto es diferente al 22:
1. **Anotar puerto exacto** (ej: 2222)
2. **Ejecutar**: `./setup-ssh-once-working.sh`
3. **Usar el puerto correcto**

### **Escenario C: Usuario Diferente**
Si el usuario no es 'root':
1. **Anotar usuario correcto** (ubuntu/admin)
2. **Configurar con usuario correcto**

### **Escenario D: SSH Funciona pero sin Claude Code**
Si logras conectar pero no tienes Claude Code:
```bash
# Conectar al servidor
ssh usuario@ip -p puerto

# Instalar Claude Code
curl -fsSL https://claude.ai/cli/install | sh

# Verificar instalación
claude --version
```

## 🆘 **Si nada funciona:**

### **Contactar Soporte Hostinger**
**Template para soporte:**
```
Asunto: SSH Access Issue - VPS srv876195.hstgr.cloud

Hola,

Tengo problemas para acceder via SSH a mi VPS:
- VPS: srv876195.hstgr.cloud (168.231.124.18)
- Error: Connection timeout en puerto 22
- He verificado que mi clave SSH está correcta
- Necesito confirmar:
  1. ¿Cuál es el puerto SSH correcto?
  2. ¿Está SSH habilitado en mi VPS?
  3. ¿Hay algún firewall bloqueando SSH?

Mi clave pública SSH:
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC8MYWXGEtZn8BE0HhALrj0fkx6XGgZwKqP9oqUt32jW/81hbsywGzounqUOIHLOczfwb4CSkSQL60kmhx6udoHqIDRO2zMA6KTH+uha4yK1B/fgVaM0eaMP4azKMN1/VTB9loQs3bAd/YWpqdYLA9xzrvXqVreieBtjVyf4YRSRForbDSO3rTEEPflusXIJvrF1MX2cll2dwKWyvuQhhRnwEq9wjW3Ao44QLp2jzuYbCHbG/WQ+//jXWbPRQB38XXkwd9rBhaeAZ5CAdF2NLpNVwI03vGZ6ojVvC489NwMDpqBDtEOee4Kgf5Rpodj9L86dnG4Kr6cvs9prqwKyFY1

Gracias.
```

## 🚀 **Una vez SSH funcione:**

1. **Ejecutar**: `./setup-ssh-once-working.sh`
2. **Conectar**: `ssh hostinger`
3. **Verificar Claude Code**: `claude --version`
4. **Iniciar desarrollo**: `claude-code`

---

## 📋 **CHECKLIST DE VERIFICACIÓN:**

```
□ VPS está RUNNING en panel
□ SSH está ENABLED
□ Puerto SSH identificado: _____
□ Usuario SSH identificado: _____
□ Clave SSH agregada al panel
□ Firewall permite SSH
□ Browser Terminal funciona
□ SSH desde terminal local funciona
□ Claude Code instalado en servidor
```

**🎯 Una vez completado este checklist, tendrás acceso completo con Claude Code en el servidor!** 🚀