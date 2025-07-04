# 🚀 Guía Rápida: Crear Repositorio GitHub

## 📂 **PASO 1: Crear Repositorio en GitHub**

### 1.1 Ir a GitHub
- Abre tu navegador y ve a: **[github.com](https://github.com)**
- Inicia sesión con tu cuenta

### 1.2 Crear Nuevo Repositorio
1. Haz clic en el **"+"** (arriba derecha) → **"New repository"**
2. Configurar el repositorio:
   - **Repository name**: `moonyetis-production`
   - **Description**: `MoonYetis Slots Casino - Production Ready with Advanced Wallet`
   - **Visibility**: ✅ **Private** (recomendado para casino en producción)
   - **NO** inicializar con README, .gitignore, o license
3. Haz clic en **"Create repository"**

### 1.3 Copiar URL del Repositorio
- GitHub te mostrará la página del repositorio vacío
- Copia la **URL HTTPS** que aparece (algo como):
  ```
  https://github.com/TU_USERNAME/moonyetis-production.git
  ```

## 📤 **PASO 2: Subir Código (Ejecutar en Terminal)**

Una vez que tengas la URL de GitHub, ejecuta estos comandos:

```bash
# Agregar remote de GitHub (usa TU URL)
git remote add origin https://github.com/TU_USERNAME/moonyetis-production.git

# Subir código a GitHub
git push -u origin production-deploy
```

## 🎯 **PASO 3: Verificar**

- Refresca la página de GitHub
- Deberías ver todos los archivos del proyecto subidos
- El branch activo debe ser `production-deploy`

---

## 📋 **Siguiente: Comandos para Hostinger VPS**

Una vez que el código esté en GitHub, usarás estos comandos **en el terminal web de Hostinger**:

```bash
# 1. Instalar dependencias del sistema
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs git nginx postgresql postgresql-contrib
npm install -g pm2

# 2. Clonar tu repositorio
cd /var/www
git clone https://github.com/TU_USERNAME/moonyetis-production.git moonyetis-slots
cd moonyetis-slots
git checkout production-deploy

# 3. Continuar con configuración...
# (Ver GITHUB_DEPLOY_INSTRUCTIONS.md para pasos completos)
```

---

## 🔄 **Para Futuras Actualizaciones**

Cuando quieras actualizar el servidor:

```bash
# En tu máquina local:
git add .
git commit -m "Nueva actualización"
git push origin production-deploy

# En Hostinger VPS:
cd /var/www/moonyetis-slots
git pull origin production-deploy
pm2 reload moonyetis-slots
```

---

**🎰 ¡Tu repositorio GitHub está listo para el gran deploy!**