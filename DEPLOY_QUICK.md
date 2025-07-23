# PROMPT RÁPIDO DE DESPLIEGUE

```
Ejecuta el flujo completo de despliegue de MoonYetis:

1. Verifica que estamos en /root/moonyetis-deploy/ y muestra el estado de git
2. Haz commit de todos los cambios con git add . y git commit con mensaje descriptivo
3. Haz push a GitHub con git push origin main
4. Ejecuta sudo bash deploy-all.sh para desplegar en producción
5. Verifica que los servicios estén corriendo con pm2 status y systemctl status nginx
6. Prueba los endpoints: curl http://localhost:3002/api/store/health y curl http://moonyetis.io
7. Proporciona un resumen final del despliegue y estado de los servicios

Si hay algún error en cualquier paso, detente y reporta el problema específico con sugerencias de solución.
```

---

**COPIA ESTE TEXTO PARA USAR CON CLAUDE CODE:**

Ejecuta el flujo completo de despliegue de MoonYetis:

1. Verifica que estamos en /root/moonyetis-deploy/ y muestra el estado de git
2. Haz commit de todos los cambios con git add . y git commit con mensaje descriptivo  
3. Haz push a GitHub con git push origin main
4. Ejecuta sudo bash deploy-all.sh para desplegar en producción
5. Verifica que los servicios estén corriendo con pm2 status y systemctl status nginx
6. Prueba los endpoints: curl http://localhost:3002/api/store/health y curl http://moonyetis.io
7. Proporciona un resumen final del despliegue y estado de los servicios

Si hay algún error en cualquier paso, detente y reporta el problema específico con sugerencias de solución.