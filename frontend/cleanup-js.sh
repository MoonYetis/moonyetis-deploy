#!/bin/bash

# Script de limpieza de archivos JavaScript duplicados
# Basado en el análisis de los archivos en uso en index.html

echo "🧹 Iniciando limpieza de archivos JavaScript duplicados..."

# Crear directorio de respaldo
mkdir -p js-backup
echo "📁 Creado directorio de respaldo: js-backup/"

# Archivos a eliminar (duplicados y obsoletos)
FILES_TO_REMOVE=(
    "js/moonyetis-slots.js"               # Legacy slot machine (reemplazado por slot-machine.js)
    "js/slot-machine-v3.js"              # Versión antigua (reemplazado por slot-machine.js)
    "js/wallet-integration-v3.js"        # Legacy wallet integration
    "js/wallet-integration.js"           # Legacy wallet integration  
    "js/wallet-manager-v3.js"            # Legacy wallet manager
    "js/wallet-manager.js"               # Legacy wallet manager
    "js/wallet-fix.js"                   # Archivo de fix temporal
    "js/wallet-flow.js"                  # Legacy wallet flow
    "js/wallet-modal.js"                 # Legacy wallet modal (reemplazado por wallet-hub-modal.js)
    "js/store-modal.js"                  # Legacy store modal
    "js/wallet-store-integration.js"     # Legacy store integration
)

# Archivos a mantener (usados en index.html)
KEEP_FILES=(
    "js/config.js"
    "js/auth-modal.js"
    "js/ecosystem-router.js"
    "js/wallets.js"
    "js/wallet-hub-modal.js"
    "js/wallet-hub-backend.js"
    "js/graphics-engine.js"
    "js/animation-system.js"
    "js/slot-machine.js"
    "js/slot-machine-component.js"
)

echo "📦 Archivos que se mantendrán:"
for file in "${KEEP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (no encontrado)"
    fi
done

echo ""
echo "🗑️  Archivos que se eliminarán:"

# Mover archivos obsoletos a respaldo antes de eliminar
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  📤 Moviendo $file a respaldo..."
        cp "$file" "js-backup/"
        rm "$file"
        echo "  ✅ Eliminado: $file"
    else
        echo "  ⚠️  No encontrado: $file"
    fi
done

echo ""
echo "🎉 Limpieza completada!"
echo "📊 Resumen:"
echo "  - Archivos mantenidos: ${#KEEP_FILES[@]}"
echo "  - Archivos eliminados: $(ls js-backup/ 2>/dev/null | wc -l)"
echo "  - Respaldo creado en: js-backup/"
echo ""
echo "✨ Estructura JavaScript optimizada y sin duplicados!"