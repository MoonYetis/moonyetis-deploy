# PROMPT DE DESPLIEGUE AUTOMÁTICO - MOONYETIS

## Instrucciones para Claude Code:

Ejecuta el siguiente flujo de trabajo de despliegue en el servidor. Realiza estas tareas paso a paso y verifica cada una antes de continuar:

### PASO 1: VERIFICACIÓN INICIAL
- Confirma que estamos en el directorio `/root/moonyetis-deploy/`
- Ejecuta `git status` para ver los cambios pendientes
- Si hay archivos modificados, continúa. Si no hay cambios, pregunta si quiero proceder de todas formas

### PASO 2: COMMIT Y PUSH A GITHUB
- Ejecuta `git add .` para agregar todos los cambios
- Crea un commit con un mensaje descriptivo basado en los archivos modificados
- Ejecuta `git push origin main` para subir los cambios a GitHub
- Verifica que el push fue exitoso

### PASO 3: DESPLIEGUE EN PRODUCCIÓN
- Ejecuta `sudo bash deploy-all.sh` desde el directorio actual
- Monitorea la salida del script y reporta cualquier error
- Si hay errores, detente y reporta el problema específico

### PASO 4: VERIFICACIÓN DE SERVICIOS
- Ejecuta `pm2 status` para verificar que los servicios estén corriendo
- Ejecuta `systemctl status nginx` para verificar Nginx
- Ejecuta `curl -s http://localhost:3002/api/store/health` para probar el backend
- Ejecuta `curl -s http://moonyetis.io` para probar el frontend

### PASO 5: REPORTE FINAL
- Proporciona un resumen de:
  - Qué cambios se desplegaron
  - Estado actual de los servicios
  - URLs donde la aplicación está disponible
  - Cualquier problema encontrado

### COMANDOS ÚTILES PARA TROUBLESHOOTING:
Si algo falla, usa estos comandos para diagnosticar:
- `pm2 logs` - Ver logs de la aplicación
- `pm2 restart all` - Reiniciar servicios
- `nginx -t` - Verificar configuración de Nginx
- `systemctl restart nginx` - Reiniciar Nginx
- `ufw status` - Verificar firewall

### NOTAS IMPORTANTES:
- Detente en cualquier paso si hay errores críticos
- Siempre verifica que los servicios estén funcionando antes de reportar éxito
- Si el deploy falla, proporciona instrucciones específicas para resolverlo
- Mantén un registro detallado de cada paso ejecutado

---

**PARA USAR ESTE PROMPT:**
Copia y pega todo el contenido desde "PASO 1" hasta el final en Claude Code cuando hayas terminado de hacer cambios en el código.