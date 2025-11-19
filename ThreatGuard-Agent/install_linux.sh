#!/bin/bash
# ThreatGuard Agent - Script de Instalación para Linux
# Este script instala el agente ThreatGuard en sistemas Linux

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
APP_NAME="ThreatGuard Agent"
INSTALL_DIR="/opt/threatguard-agent"
BIN_DIR="/usr/local/bin"
DESKTOP_DIR="/usr/share/applications"
ICON_DIR="/usr/share/icons/hicolor/256x256/apps"
SERVICE_DIR="/etc/systemd/system"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  $APP_NAME - Instalador${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Este script debe ejecutarse como root (sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}[1/7]${NC} Verificando dependencias del sistema..."

# Detectar distribución
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo -e "${RED}No se pudo detectar la distribución de Linux${NC}"
    exit 1
fi

echo "   Distribución detectada: $OS $VER"

# Instalar dependencias según la distribución
case $OS in
    ubuntu|debian)
        echo "   Instalando dependencias para Ubuntu/Debian..."
        apt-get update -qq
        apt-get install -y python3 python3-pip python3-tk python3-dev libpq-dev > /dev/null 2>&1
        ;;
    centos|rhel|fedora)
        echo "   Instalando dependencias para CentOS/RHEL/Fedora..."
        yum install -y python3 python3-pip python3-tkinter python3-devel postgresql-devel > /dev/null 2>&1
        ;;
    arch|manjaro)
        echo "   Instalando dependencias para Arch/Manjaro..."
        pacman -Sy --noconfirm python python-pip tk > /dev/null 2>&1
        ;;
    *)
        echo -e "${YELLOW}   Advertencia: Distribución no reconocida. Intentando instalación genérica...${NC}"
        ;;
esac

echo -e "${GREEN}[2/7]${NC} Instalando paquetes de Python..."
pip3 install --quiet --upgrade pip
pip3 install --quiet requests psutil configparser

echo -e "${GREEN}[3/7]${NC} Creando directorios de instalación..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/config"
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

echo -e "${GREEN}[4/7]${NC} Copiando archivos del agente..."

# Si existe el ejecutable compilado
if [ -f "dist/ThreatGuard-Agent" ]; then
    echo "   Instalando desde ejecutable compilado..."
    cp dist/ThreatGuard-Agent "$INSTALL_DIR/threatguard-agent"
    chmod +x "$INSTALL_DIR/threatguard-agent"
else
    # Instalar desde código fuente
    echo "   Instalando desde código fuente..."
    cp agent_ui_linux.py "$INSTALL_DIR/threatguard-agent.py"
    cp agent.py "$INSTALL_DIR/" 2>/dev/null || true
    chmod +x "$INSTALL_DIR/threatguard-agent.py"
fi

# Copiar archivos de configuración
if [ -f "config/agent.ini.example" ]; then
    cp config/agent.ini.example "$INSTALL_DIR/config/agent.ini"
else
    # Crear configuración por defecto
    cat > "$INSTALL_DIR/config/agent.ini" << 'EOF'
[master]
MASTER_IP = 192.168.1.100
MASTER_PORT = 8000

[agent]
AGENT_NAME = agent-linux
AGENT_IP = auto

[security]
AGENT_TOKEN = 

[monitoring]
REPORT_INTERVAL = 60
COLLECT_LOGS = true
COLLECT_METRICS = true
EOF
fi

echo -e "${GREEN}[5/7]${NC} Creando enlaces y accesos directos..."

# Crear symlink en /usr/local/bin
if [ -f "$INSTALL_DIR/threatguard-agent" ]; then
    ln -sf "$INSTALL_DIR/threatguard-agent" "$BIN_DIR/threatguard-agent"
else
    # Crear script wrapper para código Python
    cat > "$BIN_DIR/threatguard-agent" << 'EOF'
#!/bin/bash
cd /opt/threatguard-agent
python3 threatguard-agent.py "$@"
EOF
    chmod +x "$BIN_DIR/threatguard-agent"
fi

# Crear archivo .desktop
cat > "$DESKTOP_DIR/threatguard-agent.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=ThreatGuard Agent
Comment=Agente de monitoreo de seguridad ThreatGuard
Exec=$BIN_DIR/threatguard-agent
Icon=threatguard-agent
Terminal=false
Categories=System;Security;Monitor;
Keywords=security;monitoring;agent;threatguard;
EOF

# Copiar ícono si existe
if [ -f "../assets/icon.png" ]; then
    cp ../assets/icon.png "$ICON_DIR/threatguard-agent.png"
fi

echo -e "${GREEN}[6/7]${NC} Creando servicio systemd..."

# Crear archivo de servicio systemd
cat > "$SERVICE_DIR/threatguard-agent.service" << EOF
[Unit]
Description=ThreatGuard Security Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$BIN_DIR/threatguard-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Recargar systemd
systemctl daemon-reload

echo -e "${GREEN}[7/7]${NC} Configurando permisos..."
chown -R root:root "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR"
chmod 644 "$INSTALL_DIR/config/agent.ini"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Instalación completada exitosamente!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Ubicación de instalación:${NC} $INSTALL_DIR"
echo -e "${BLUE}Archivo de configuración:${NC} $INSTALL_DIR/config/agent.ini"
echo -e "${BLUE}Archivo de logs:${NC} $INSTALL_DIR/logs/"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Editar la configuración:"
echo "     sudo nano $INSTALL_DIR/config/agent.ini"
echo ""
echo "  2. Iniciar el agente:"
echo "     - Modo GUI:     threatguard-agent"
echo "     - Como servicio: sudo systemctl start threatguard-agent"
echo "     - Al inicio:     sudo systemctl enable threatguard-agent"
echo ""
echo "  3. Verificar estado:"
echo "     sudo systemctl status threatguard-agent"
echo ""
echo -e "${YELLOW}Para desinstalar:${NC}"
echo "  sudo $INSTALL_DIR/uninstall.sh"
echo ""

# Crear script de desinstalación
cat > "$INSTALL_DIR/uninstall.sh" << 'UNINSTALL_EOF'
#!/bin/bash
echo "Desinstalando ThreatGuard Agent..."
systemctl stop threatguard-agent 2>/dev/null
systemctl disable threatguard-agent 2>/dev/null
rm -f /etc/systemd/system/threatguard-agent.service
rm -f /usr/local/bin/threatguard-agent
rm -f /usr/share/applications/threatguard-agent.desktop
rm -f /usr/share/icons/hicolor/256x256/apps/threatguard-agent.png
systemctl daemon-reload
echo "¿Desea eliminar también los archivos de configuración y logs? (s/N)"
read -r response
if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
    rm -rf /opt/threatguard-agent
    echo "Archivos de configuración eliminados"
else
    echo "Archivos de configuración conservados en /opt/threatguard-agent"
fi
echo "Desinstalación completada"
UNINSTALL_EOF

chmod +x "$INSTALL_DIR/uninstall.sh"

echo -e "${GREEN}¡Instalación completada!${NC}"
echo ""
