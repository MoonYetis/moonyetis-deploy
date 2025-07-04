#!/bin/bash

# ===============================================
# SSH Setup - Once Connection is Working
# ===============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Configurando SSH una vez que tengamos acceso...${NC}"
echo ""

# Load SSH key to agent
echo -e "${YELLOW}🔑 Cargando clave SSH al agente...${NC}"
ssh-add ~/.ssh/id_rsa

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Clave SSH cargada correctamente${NC}"
else
    echo -e "${RED}❌ Error cargando clave SSH${NC}"
    exit 1
fi

# Prompt for SSH details
echo ""
echo -e "${BLUE}📝 Necesito la información SSH de tu panel Hostinger:${NC}"
echo ""

read -p "🔌 Puerto SSH (probablemente 2222): " SSH_PORT
read -p "👤 Usuario SSH (root/ubuntu/admin): " SSH_USER
read -p "🖥️ Usar IP (1) o hostname (2)? [1]: " HOST_CHOICE

if [ "$HOST_CHOICE" = "2" ]; then
    SSH_HOST="srv876195.hstgr.cloud"
else
    SSH_HOST="168.231.124.18"
fi

echo ""
echo -e "${YELLOW}🧪 Probando conexión...${NC}"
echo "Comando: ssh -p $SSH_PORT $SSH_USER@$SSH_HOST"

# Test connection
if ssh -o ConnectTimeout=10 -o BatchMode=yes -p $SSH_PORT $SSH_USER@$SSH_HOST exit 2>/dev/null; then
    echo -e "${GREEN}✅ ¡Conexión SSH exitosa!${NC}"
    
    # Create SSH config
    echo ""
    echo -e "${BLUE}⚙️ Creando configuración SSH optimizada...${NC}"
    
    # Backup existing config if it exists
    if [ -f ~/.ssh/config ]; then
        cp ~/.ssh/config ~/.ssh/config.backup.$(date +%Y%m%d_%H%M%S)
        echo "   📋 Backup de configuración existente creado"
    fi
    
    # Add Hostinger configuration
    cat >> ~/.ssh/config << EOF

# Hostinger VPS Configuration - MoonYetis
Host hostinger
    HostName $SSH_HOST
    User $SSH_USER
    Port $SSH_PORT
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null

Host moonyetis
    HostName $SSH_HOST
    User $SSH_USER
    Port $SSH_PORT
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

    chmod 600 ~/.ssh/config
    
    echo -e "${GREEN}✅ Configuración SSH creada${NC}"
    echo ""
    echo -e "${BLUE}🚀 Ahora puedes conectar con:${NC}"
    echo "   ssh hostinger"
    echo "   ssh moonyetis"
    echo ""
    
    # Test the new configuration
    echo -e "${YELLOW}🧪 Probando configuración nueva...${NC}"
    if ssh hostinger exit 2>/dev/null; then
        echo -e "${GREEN}✅ Configuración funcionando perfectamente${NC}"
        
        echo ""
        echo -e "${BLUE}🎯 Próximos pasos:${NC}"
        echo "1. Conectar: ssh hostinger"
        echo "2. Verificar Claude Code: claude --version"
        echo "3. Si no está instalado: curl -fsSL https://claude.ai/cli/install | sh"
        echo "4. Proceder con deployment: claude-code"
        echo ""
        
    else
        echo -e "${YELLOW}⚠️ Configuración creada pero necesita ajustes${NC}"
    fi
    
else
    echo -e "${RED}❌ Conexión SSH falló${NC}"
    echo ""
    echo -e "${YELLOW}💡 Posibles soluciones:${NC}"
    echo "• Verificar puerto SSH en panel Hostinger"
    echo "• Verificar usuario permitido"
    echo "• Verificar que VPS esté encendido"
    echo "• Agregar tu clave SSH al panel"
    echo "• Contactar soporte Hostinger"
fi