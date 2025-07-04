#!/bin/bash

# ===============================================
# Hostinger SSH Advanced Diagnostics
# ===============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔍 Diagnóstico SSH Avanzado para Hostinger${NC}"
echo "==========================================="
echo ""

# System information
echo -e "${BLUE}🖥️ Información del sistema:${NC}"
echo "   OS: $(uname -s)"
echo "   Usuario: $(whoami)"
echo "   SSH Client: $(ssh -V 2>&1 | head -1)"
echo "   Terminal: $TERM"
echo ""

# SSH Keys verification
echo -e "${BLUE}🔑 Claves SSH locales:${NC}"
if [ -f ~/.ssh/id_rsa ]; then
    echo -e "   ${GREEN}✅ Clave privada: ~/.ssh/id_rsa${NC}"
    echo "   Permisos: $(ls -l ~/.ssh/id_rsa | cut -d' ' -f1)"
else
    echo -e "   ${RED}❌ No hay clave privada${NC}"
    echo -e "   ${YELLOW}💡 Crear con: ssh-keygen -t rsa -b 4096${NC}"
fi

if [ -f ~/.ssh/id_rsa.pub ]; then
    echo -e "   ${GREEN}✅ Clave pública: ~/.ssh/id_rsa.pub${NC}"
    echo "   📋 Contenido de la clave pública:"
    echo "   $(cat ~/.ssh/id_rsa.pub)"
else
    echo -e "   ${RED}❌ No hay clave pública${NC}"
fi
echo ""

# SSH Agent status
echo -e "${BLUE}🔐 Estado del SSH Agent:${NC}"
if ssh-add -l >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ SSH Agent corriendo${NC}"
    echo "   Claves cargadas:"
    ssh-add -l | sed 's/^/   /'
else
    echo -e "   ${YELLOW}⚠️ SSH Agent no tiene claves cargadas${NC}"
    echo -e "   ${YELLOW}💡 Agregar con: ssh-add ~/.ssh/id_rsa${NC}"
fi
echo ""

# Network connectivity
echo -e "${BLUE}🌐 Conectividad de red:${NC}"
echo -n "   Ping a 168.231.124.18: "
if ping -c 1 -W 3 168.231.124.18 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FALLA${NC}"
fi

echo -n "   Ping a srv876195.hstgr.cloud: "
if ping -c 1 -W 3 srv876195.hstgr.cloud >/dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FALLA${NC}"
fi

# DNS resolution
echo -n "   Resolución DNS srv876195.hstgr.cloud: "
resolved_ip=$(nslookup srv876195.hstgr.cloud 2>/dev/null | grep "Address:" | tail -1 | cut -d' ' -f2)
if [ ! -z "$resolved_ip" ]; then
    echo -e "${GREEN}✅ $resolved_ip${NC}"
else
    echo -e "${RED}❌ No resuelve${NC}"
fi
echo ""

# Port scanning
echo -e "${BLUE}🔌 Escaneo de puertos SSH:${NC}"
PORTS=(22 2222 22022 22122 2022 443 80 8022)
HOSTS=("168.231.124.18" "srv876195.hstgr.cloud")

for host in "${HOSTS[@]}"; do
    echo "   Host: $host"
    for port in "${PORTS[@]}"; do
        echo -n "      Puerto $port: "
        if timeout 3 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
            echo -e "${GREEN}✅ ABIERTO${NC}"
            
            # Try SSH handshake
            echo -n "         SSH handshake: "
            if timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no -p $port root@$host exit 2>/dev/null; then
                echo -e "${GREEN}✅ OK (root)${NC}"
            elif timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no -p $port ubuntu@$host exit 2>/dev/null; then
                echo -e "${GREEN}✅ OK (ubuntu)${NC}"
            else
                echo -e "${YELLOW}⚠️ Puerto abierto pero SSH no responde${NC}"
            fi
        else
            echo -e "${RED}❌ cerrado/filtrado${NC}"
        fi
    done
    echo ""
done

# SSH configuration
echo -e "${BLUE}📁 Configuración SSH:${NC}"
if [ -f ~/.ssh/config ]; then
    echo -e "   ${GREEN}✅ Archivo ~/.ssh/config existe${NC}"
    if grep -q -i hostinger ~/.ssh/config 2>/dev/null; then
        echo "   📋 Configuración Hostinger encontrada:"
        grep -A 10 -i hostinger ~/.ssh/config | sed 's/^/   /'
    else
        echo "   ⚠️ No hay configuración específica para Hostinger"
    fi
else
    echo -e "   ${YELLOW}⚠️ No hay archivo ~/.ssh/config${NC}"
fi
echo ""

# Known hosts
echo -e "${BLUE}📝 Known hosts:${NC}"
if [ -f ~/.ssh/known_hosts ]; then
    hostinger_entries=$(grep -E "(168\.231\.124\.18|srv876195\.hstgr\.cloud)" ~/.ssh/known_hosts 2>/dev/null | wc -l)
    if [ $hostinger_entries -gt 0 ]; then
        echo -e "   ${GREEN}✅ Entradas Hostinger en known_hosts: $hostinger_entries${NC}"
    else
        echo "   ⚠️ No hay entradas de Hostinger en known_hosts"
    fi
else
    echo "   ⚠️ No hay archivo known_hosts"
fi
echo ""

# Firewall and proxy detection
echo -e "${BLUE}🛡️ Detección de firewall/proxy:${NC}"

# Check if behind corporate firewall
echo -n "   Proxy HTTP detectado: "
if [ ! -z "$HTTP_PROXY" ] || [ ! -z "$http_proxy" ]; then
    echo -e "${YELLOW}⚠️ SÍ ($HTTP_PROXY$http_proxy)${NC}"
else
    echo -e "${GREEN}✅ No${NC}"
fi

# Check common firewall indicators
echo -n "   Puerto 443 (HTTPS): "
if timeout 3 bash -c "</dev/tcp/google.com/443" 2>/dev/null; then
    echo -e "${GREEN}✅ Accesible${NC}"
else
    echo -e "${RED}❌ Bloqueado${NC}"
fi

echo -n "   Puerto 22 a github.com: "
if timeout 3 bash -c "</dev/tcp/github.com/22" 2>/dev/null; then
    echo -e "${GREEN}✅ Accesible${NC}"
else
    echo -e "${RED}❌ Bloqueado (probable firewall corporativo)${NC}"
fi
echo ""

# Recommendations
echo -e "${PURPLE}📋 RECOMENDACIONES:${NC}"
echo ""

if ! ping -c 1 -W 3 168.231.124.18 >/dev/null 2>&1; then
    echo -e "${RED}❌ Problema de conectividad básica${NC}"
    echo "   • Verificar conexión a internet"
    echo "   • Verificar que el VPS esté encendido en panel Hostinger"
fi

if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo -e "${YELLOW}🔑 Crear claves SSH:${NC}"
    echo "   ssh-keygen -t rsa -b 4096 -C \"tu_email@example.com\""
fi

echo -e "${BLUE}🔧 Pasos siguientes:${NC}"
echo "1. Ve al panel de Hostinger: hpanel.hostinger.com"
echo "2. VPS → SSH Access → Verificar:"
echo "   • Puerto SSH exacto"
echo "   • Usuario permitido (root/ubuntu)"
echo "   • SSH Keys configuradas"
echo "3. Si SSH no está habilitado, habilitarlo"
echo "4. Agregar tu clave pública al panel"
echo ""

echo -e "${CYAN}💡 Alternativas mientras resuelves SSH:${NC}"
echo "• Browser Terminal en panel Hostinger"
echo "• File Manager + Terminal web"
echo "• Contactar soporte Hostinger"
echo ""

echo -e "${GREEN}📞 Información para soporte Hostinger:${NC}"
echo "   VPS: srv876195.hstgr.cloud (168.231.124.18)"
echo "   Error: SSH connection timeout on standard ports"
echo "   Solicitud: Verificar configuración SSH y puerto correcto"
echo ""