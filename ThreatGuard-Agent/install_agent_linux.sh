#!/bin/bash
# Script de instalación de ThreatGuard Agent para Linux
# Compatible con: Ubuntu, Debian, CentOS, RHEL, Fedora

set -e

echo "========================================"
echo "  ThreatGuard Agent - Instalador Linux"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar permisos de root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}ERROR: Este script debe ejecutarse como root${NC}"
    echo "Usa: sudo bash install_agent_linux.sh"
    exit 1
fi

# Detectar distribución
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}No se puede detectar la distribución de Linux${NC}"
    exit 1
fi

echo -e "${GREEN}Sistema detectado: $OS $VER${NC}"
echo ""

# Directorio de instalación
INSTALL_DIR="/opt/threatguard-agent"
SERVICE_FILE="/etc/systemd/system/threatguard-agent.service"

echo "Instalando dependencias del sistema..."

# Instalar dependencias según la distribución
case $OS in
    ubuntu|debian)
        apt-get update
        apt-get install -y python3 python3-pip python3-venv curl
        ;;
    centos|rhel|fedora)
        if [ "$OS" = "fedora" ]; then
            dnf install -y python3 python3-pip curl
        else
            yum install -y python3 python3-pip curl
        fi
        ;;
    *)
        echo -e "${YELLOW}Distribución no reconocida. Intentando instalación genérica...${NC}"
        ;;
esac

echo ""
echo "Creando directorio de instalación: $INSTALL_DIR"
mkdir -p $INSTALL_DIR
mkdir -p $INSTALL_DIR/config
mkdir -p $INSTALL_DIR/logs
mkdir -p $INSTALL_DIR/src/utils

# Copiar archivos del agente
echo "Copiando archivos del agente..."
cp agent.py $INSTALL_DIR/
cp agent_ui_linux.py $INSTALL_DIR/ 2>/dev/null || true
cp requirements-agent.txt $INSTALL_DIR/
cp start_agent_gui.sh $INSTALL_DIR/ 2>/dev/null || true
cp threatguard-agent.desktop $INSTALL_DIR/ 2>/dev/null || true

# Crear estructura de directorios de Python
touch $INSTALL_DIR/src/__init__.py
touch $INSTALL_DIR/src/utils/__init__.py

# Copiar utilidades si existen
if [ -f "src/utils/network_utils.py" ]; then
    cp src/utils/network_utils.py $INSTALL_DIR/src/utils/
fi
if [ -f "src/utils/logger.py" ]; then
    cp src/utils/logger.py $INSTALL_DIR/src/utils/
fi

# Crear archivo de configuración si no existe
if [ ! -f "$INSTALL_DIR/config/agent.ini" ]; then
    echo "Creando archivo de configuración..."
    cat > $INSTALL_DIR/config/agent.ini << 'EOF'
[master]
MASTER_IP = 192.168.1.100
MASTER_PORT = 8000

[agent]
AGENT_NAME = linux-agent-01
AGENT_IP = auto

[security]
AGENT_TOKEN = your-secure-token-here

[monitoring]
REPORT_INTERVAL = 60
COLLECT_LOGS = true
COLLECT_METRICS = true
EOF
    echo -e "${YELLOW}IMPORTANTE: Edita $INSTALL_DIR/config/agent.ini con la IP de tu servidor ThreatGuard${NC}"
fi

# Crear entorno virtual e instalar dependencias
echo ""
echo "Creando entorno virtual de Python..."
cd $INSTALL_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-agent.txt

# Crear servicio systemd
echo ""
echo "Creando servicio systemd..."
cat > $SERVICE_FILE << EOF
[Unit]
Description=ThreatGuard Agent Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/agent.py
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/agent.log
StandardError=append:$INSTALL_DIR/logs/agent_error.log

[Install]
WantedBy=multi-user.target
EOF

# Permisos
chmod +x $INSTALL_DIR/agent.py
chmod +x $INSTALL_DIR/start_agent_gui.sh 2>/dev/null || true
chmod 600 $INSTALL_DIR/config/agent.ini

# Instalar acceso directo del escritorio si existe GUI
if [ -f "$INSTALL_DIR/threatguard-agent.desktop" ]; then
    echo "Instalando acceso directo del escritorio..."
    mkdir -p /usr/share/applications
    cp $INSTALL_DIR/threatguard-agent.desktop /usr/share/applications/
    chmod +x /usr/share/applications/threatguard-agent.desktop
    
    # También copiar al escritorio del usuario si existe
    if [ -d "/home/$SUDO_USER/Desktop" ]; then
        cp $INSTALL_DIR/threatguard-agent.desktop /home/$SUDO_USER/Desktop/
        chown $SUDO_USER:$SUDO_USER /home/$SUDO_USER/Desktop/threatguard-agent.desktop
        chmod +x /home/$SUDO_USER/Desktop/threatguard-agent.desktop
    fi
fi

# Recargar systemd
systemctl daemon-reload

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Instalación completada exitosamente!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Modos de uso:"
echo ""
echo -e "${YELLOW}MODO 1: Interfaz Gráfica (GUI)${NC}"
echo "  Ejecutar desde el menú de aplicaciones: 'ThreatGuard Agent'"
echo "  O ejecutar manualmente:"
echo -e "    ${GREEN}$INSTALL_DIR/start_agent_gui.sh${NC}"
echo ""
echo -e "${YELLOW}MODO 2: Servicio en segundo plano${NC}"
echo "  1. Editar configuración:"
echo -e "     ${GREEN}nano $INSTALL_DIR/config/agent.ini${NC}"
echo ""
echo "  2. Iniciar servicio:"
echo -e "     ${GREEN}systemctl start threatguard-agent${NC}"
echo ""
echo "  3. Habilitar inicio automático:"
echo -e "     ${GREEN}systemctl enable threatguard-agent${NC}"
echo ""
echo "  4. Ver estado:"
echo -e "     ${GREEN}systemctl status threatguard-agent${NC}"
echo ""
echo "  5. Ver logs:"
echo -e "     ${GREEN}tail -f $INSTALL_DIR/logs/agent.log${NC}"
echo ""
echo "Archivos de configuración: $INSTALL_DIR/config/"
echo "Logs del agente: $INSTALL_DIR/logs/"
echo ""
