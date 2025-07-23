# 🤖 Prompts Sistémicos para Claude Code - MoonYetis

Este documento contiene prompts estructurados para asegurar consistencia y pensamiento sistémico en todas las tareas del proyecto MoonYetis.

## 📋 Índice
1. [Fase 1: Análisis Inicial](#fase-1-análisis-inicial)
2. [Fase 2: Planificación](#fase-2-planificación)
3. [Fase 3: Desarrollo](#fase-3-desarrollo)
4. [Fase 4: Testing](#fase-4-testing)
5. [Fase 5: Revisión](#fase-5-revisión)
6. [Prompts por Tipo de Tarea](#prompts-por-tipo-de-tarea)
7. [Mejores Prácticas](#mejores-prácticas)

---

## Fase 1: Análisis Inicial

### 🔍 Prompt para Análisis de Problema

```
Necesito que analices [DESCRIPCIÓN DEL PROBLEMA/REQUERIMIENTO] en el proyecto MoonYetis siguiendo estos pasos:

1. Lee los archivos relevantes del código base
2. Identifica todos los archivos que serán afectados
3. Documenta el estado actual del sistema
4. Identifica posibles impactos y dependencias
5. Crea un análisis detallado en todo.md

Por favor, sigue el principio de simplicidad máxima y evita soluciones complejas.
```

### 🔎 Prompt para Investigación de Error

```
Investiga el error [DESCRIPCIÓN DEL ERROR] que ocurre en [UBICACIÓN/CONTEXTO]:

1. Localiza la función/componente problemático
2. Rastrea el flujo de ejecución
3. Identifica la causa raíz
4. Lista todas las referencias y dependencias
5. Documenta hallazgos en todo.md con números de línea específicos

Incluye el contexto completo del error y posibles soluciones.
```

---

## Fase 2: Planificación

### 📝 Prompt para Crear Plan de Trabajo

```
Basándote en el análisis anterior, crea un plan detallado en todo.md que incluya:

1. Objetivo principal de la tarea
2. Lista numerada de tareas pendientes (máximo 10 items)
3. Cada tarea debe ser simple y atómica
4. Orden de prioridad y dependencias
5. Estimación de complejidad (simple/media/compleja)
6. Riesgos identificados

Recuerda: cada cambio debe afectar el código lo menos posible. Prioriza simplicidad sobre elegancia.
```

### ✅ Prompt para Validación de Plan

```
Revisa el plan creado y verifica:

1. ¿Cada tarea es suficientemente simple?
2. ¿Se puede dividir alguna tarea en pasos más pequeños?
3. ¿El orden de ejecución es lógico?
4. ¿Se han considerado todos los casos edge?
5. ¿El plan sigue el flujo de trabajo estándar de CLAUDE.md?

Ajusta el plan si es necesario antes de proceder.
```

---

## Fase 3: Desarrollo

### 💻 Prompt para Implementación

```
Implementa la tarea #[NÚMERO] del todo.md siguiendo estos pasos:

1. Marca la tarea como "in_progress" en todo.md
2. Lee el archivo a modificar completo antes de editar
3. Realiza SOLO los cambios mínimos necesarios
4. Mantén el estilo de código existente
5. Explica detalladamente qué cambios realizaste y por qué
6. Marca la tarea como "completed" cuando termines

Principio clave: simplicidad máxima, cambios mínimos.
```

### 🔧 Prompt para Refactorización

```
Refactoriza [COMPONENTE/FUNCIÓN] siguiendo estos criterios:

1. Analiza el código actual y su propósito
2. Identifica SOLO los problemas críticos
3. Propón cambios mínimos que resuelvan los problemas
4. Mantén la compatibilidad con el resto del sistema
5. Documenta cada cambio y su justificación

NO hagas cambios estéticos o "mejoras" no solicitadas.
```

---

## Fase 4: Testing

### 🧪 Prompt para Plan de Pruebas

```
Crea y ejecuta un plan de pruebas para los cambios realizados:

1. Inicia el entorno local con ./start-local-dev.sh
2. Lista todas las funcionalidades afectadas
3. Define casos de prueba específicos
4. Ejecuta npm run test:local en backend
5. Prueba manualmente en navegador (localhost:8080)
6. Documenta resultados en todo.md

Incluye casos edge y escenarios de error.
```

### 🐛 Prompt para Debugging

```
Debug del problema [DESCRIPCIÓN] siguiendo este proceso:

1. Reproduce el error en entorno local
2. Agrega console.log estratégicos (máximo 5)
3. Rastrea el flujo de datos
4. Identifica el punto exacto de falla
5. Propón la solución más simple posible
6. Remueve todos los console.log al terminar

Documenta el proceso completo en todo.md.
```

---

## Fase 5: Revisión

### 📄 Prompt para Revisión Final

```
Realiza una revisión final de todos los cambios:

1. Agrega sección "## Revisión Final" en todo.md
2. Lista todos los archivos modificados
3. Resume cada cambio realizado
4. Verifica que todas las tareas estén completadas
5. Confirma que no hay efectos secundarios
6. Documenta lecciones aprendidas

Prepara un resumen ejecutivo de máximo 5 líneas.
```

### 📊 Prompt para Documentación

```
Actualiza la documentación necesaria:

1. Si creaste nuevas funciones, documéntalas brevemente
2. Si cambiaste comportamiento, actualiza comentarios
3. Si agregaste dependencias, actualiza package.json
4. Si modificaste flujos, actualiza diagramas relevantes
5. NO crees documentación no solicitada

Mantén la documentación mínima y práctica.
```

---

## Prompts por Tipo de Tarea

### 🐞 Corrección de Errores

```
Corrige el error [DESCRIPCIÓN] en [ARCHIVO:LÍNEA]:

1. Analiza el error y su contexto inmediato
2. Identifica la solución más simple
3. Implementa SOLO el fix necesario
4. Verifica que no rompa otras funcionalidades
5. Agrega validación si es necesario
6. Documenta el fix en todo.md

No aproveches para "mejorar" código no relacionado.
```

### ✨ Nueva Funcionalidad

```
Implementa [NUEVA FUNCIONALIDAD] con estos pasos:

1. Analiza dónde debe integrarse en el sistema actual
2. Reutiliza código/patrones existentes
3. Implementa la versión más simple que funcione
4. Integra con el flujo existente
5. Agrega validaciones mínimas necesarias
6. Prueba la integración completa

Evita over-engineering y features no solicitadas.
```

### 🔄 Actualización de Dependencias

```
Actualiza [DEPENDENCIA] siguiendo este proceso:

1. Verifica compatibilidad con versión actual
2. Lee changelog de cambios breaking
3. Actualiza package.json
4. Ejecuta npm install
5. Prueba todas las funcionalidades afectadas
6. Ajusta código si es necesario

Actualiza SOLO la dependencia solicitada.
```

### ⚡ Optimización

```
Optimiza [COMPONENTE/FUNCIÓN] para mejorar [MÉTRICA]:

1. Mide el performance actual
2. Identifica el cuello de botella principal
3. Implementa la optimización más simple
4. Mide la mejora obtenida
5. Verifica que no afecte funcionalidad
6. Documenta cambios y mejoras

Optimiza SOLO lo necesario, no todo el código.
```

---

## Mejores Prácticas

### 🎯 Principios Clave

1. **Simplicidad sobre elegancia**: Prefiere código simple y claro
2. **Cambios mínimos**: Modifica solo lo estrictamente necesario
3. **Respeta el código existente**: Mantén estilos y patrones actuales
4. **Documenta decisiones**: Explica el "por qué" de cada cambio
5. **Prueba incrementalmente**: Verifica cada cambio antes del siguiente

### 🚫 Qué NO Hacer

- No agregues features no solicitadas
- No refactorices código no relacionado
- No cambies estilos o formatos sin razón
- No optimices prematuramente
- No agregues complejidad innecesaria

### ✅ Lista de Verificación Universal

Antes de marcar cualquier tarea como completada:

```
□ ¿El cambio es el mínimo necesario?
□ ¿Mantiene la compatibilidad?
□ ¿Fue probado localmente?
□ ¿Está documentado en todo.md?
□ ¿Sigue los principios de simplicidad?
```

---

## 📌 Prompt Maestro para Iniciar Cualquier Tarea

```
Voy a trabajar en [DESCRIPCIÓN DE LA TAREA] para el proyecto MoonYetis.

Por favor:
1. Analiza el requerimiento siguiendo el flujo de trabajo estándar en CLAUDE.md
2. Crea un plan detallado en todo.md con tareas simples y atómicas
3. Espera mi aprobación antes de comenzar la implementación
4. Sigue el principio de simplicidad máxima en cada paso
5. Documenta detalladamente cada cambio realizado

Recuerda: queremos cambios mínimos que resuelvan el problema sin afectar el resto del sistema.
```

---

## 🔄 Actualizaciones

Este documento debe actualizarse cuando:
- Se identifiquen nuevos patrones de trabajo efectivos
- Se encuentren mejores formas de estructurar tareas
- Se agreguen nuevos tipos de tareas al proyecto

Última actualización: [FECHA]