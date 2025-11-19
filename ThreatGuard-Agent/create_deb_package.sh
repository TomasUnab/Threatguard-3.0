#!/bin/bash
# Script para crear un paquete .deb para Ubuntu/Debian

set -e

APP_NAME="threatguard-agent"
VERSION="1.0.0"
ARCH="amd64"  # o "all" si es independiente de arquitectura
MAINTAINER="ThreatGuard <contact@threatguard.com>"
DESCRIPTION="ThreatGuard Security Agent - Sistema de monitoreo y detección de amenazas"

echo "========================================="
echo "  Creando paquete .deb"
echo "========================================="
echo ""

# Crear estructura de directorios para el paquete
PACKAGE_DIR="${APP_NAME}_${VERSION}_${ARCH}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/DEBIAN"
mkdir -p "$PACKAGE_DIR/opt/threatguard-agent"
mkdir -p "$PACKAGE_DIR/opt/threatguard-agent/config"
mkdir -p "$PACKAGE_DIR/usr/local/bin"
mkdir -p "$PACKAGE_DIR/usr/share/applications"
mkdir -p "$PACKAGE_DIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$PACKAGE_DIR/lib/systemd/system"

echo "[1/5] Copiando archivos del agente..."

# Copiar ejecutable o script
if [ -f "dist/ThreatGuard-Agent" ]; then
    cp dist/ThreatGuard-Agent "$PACKAGE_DIR/opt/threatguard-agent/threatguard-agent"
    chmod +x "$PACKAGE_DIR/opt/threatguard-agent/threatguard-agent"
else
    cp agent_ui_linux.py "$PACKAGE_DIR/opt/threatguard-agent/threatguard-agent.py"
    cp agent.py "$PACKAGE_DIR/opt/threatguard-agent/" 2>/dev/null || true
    chmod +x "$PACKAGE_DIR/opt/threatguard-agent/threatguard-agent.py"
fi

# Copiar README
cp README.md "$PACKAGE_DIR/opt/threatguard-agent/" 2>/dev/null || echo "README not found"

echo "[2/5] Creando archivo de control..."

# Crear archivo de control
cat > "$PACKAGE_DIR/DEBIAN/control" << EOF
Package: $APP_NAME
Version: $VERSION
Section: security
Priority: optional
Architecture: $ARCH
Depends: python3 (>= 3.8), python3-tk, python3-pip
Maintainer: $MAINTAINER
Description: $DESCRIPTION
 ThreatGuard Agent es un agente de monitoreo que recopila métricas
 del sistema, logs y eventos de seguridad para enviarlos al servidor
 central de ThreatGuard.
 .
 Características:
  - Monitoreo de CPU, RAM y disco
  - Recopilación de logs del sistema
  - Interfaz gráfica intuitiva
  - Ejecución como servicio systemd
Homepage: https://github.com/TomasUnab/ThreatGuard-3.0
EOF

echo "[3/5] Creando scripts de instalación..."

# Script postinst (después de instalar)
cat > "$PACKAGE_DIR/DEBIAN/postinst" << 'EOF'
#!/bin/bash
set -e

echo "Configurando ThreatGuard Agent..."

# Instalar dependencias de Python
pip3 install --quiet requests psutil configparser 2>/dev/null || true

# Crear configuración si no existe
if [ ! -f /opt/threatguard-agent/config/agent.ini ]; then
    cat > /opt/threatguard-agent/config/agent.ini << 'CONFIG_EOF'
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
CONFIG_EOF
fi

# Crear symlink
ln -sf /opt/threatguard-agent/threatguard-agent /usr/local/bin/threatguard-agent 2>/dev/null || \
ln -sf /opt/threatguard-agent/threatguard-agent.py /usr/local/bin/threatguard-agent

# Recargar systemd
systemctl daemon-reload 2>/dev/null || true

echo ""
echo "ThreatGuard Agent instalado correctamente!"
echo "Configura el agente editando: /opt/threatguard-agent/config/agent.ini"
echo "Inicia el agente con: threatguard-agent"
echo "O como servicio: sudo systemctl start threatguard-agent"
echo ""

exit 0
EOF

chmod 755 "$PACKAGE_DIR/DEBIAN/postinst"

# Script prerm (antes de desinstalar)
cat > "$PACKAGE_DIR/DEBIAN/prerm" << 'EOF'
#!/bin/bash
set -e

# Detener el servicio si está corriendo
systemctl stop threatguard-agent 2>/dev/null || true
systemctl disable threatguard-agent 2>/dev/null || true

exit 0
EOF

chmod 755 "$PACKAGE_DIR/DEBIAN/prerm"

# Script postrm (después de desinstalar)
cat > "$PACKAGE_DIR/DEBIAN/postrm" << 'EOF'
#!/bin/bash
set -e

# Limpiar symlinks
rm -f /usr/local/bin/threatguard-agent

# Preguntar si eliminar configuración
if [ "$1" = "purge" ]; then
    rm -rf /opt/threatguard-agent/config
    rm -rf /opt/threatguard-agent/logs
fi

systemctl daemon-reload 2>/dev/null || true

exit 0
EOF

chmod 755 "$PACKAGE_DIR/DEBIAN/postrm"

echo "[4/5] Copiando archivos de configuración..."

# Crear archivo .desktop
cat > "$PACKAGE_DIR/usr/share/applications/threatguard-agent.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=ThreatGuard Agent
Comment=Agente de seguridad ThreatGuard
Exec=/usr/local/bin/threatguard-agent
Icon=threatguard-agent
Terminal=false
Categories=System;Security;Monitor;
EOF

# Copiar ícono
if [ -f "../assets/icon.png" ]; then
    cp ../assets/icon.png "$PACKAGE_DIR/usr/share/icons/hicolor/256x256/apps/threatguard-agent.png"
fi

# Crear servicio systemd
cat > "$PACKAGE_DIR/lib/systemd/system/threatguard-agent.service" << EOF
[Unit]
Description=ThreatGuard Security Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/threatguard-agent
ExecStart=/usr/local/bin/threatguard-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "[5/5] Construyendo paquete .deb..."

# Construir el paquete
dpkg-deb --build "$PACKAGE_DIR"

# Mover a carpeta de salida
mkdir -p ../installer_output_linux
mv "${PACKAGE_DIR}.deb" "../installer_output_linux/"

# Limpiar
rm -rf "$PACKAGE_DIR"

echo ""
echo "========================================="
echo "  Paquete .deb creado exitosamente!"
echo "========================================="
echo ""
echo "Ubicación: ../installer_output_linux/${APP_NAME}_${VERSION}_${ARCH}.deb"
echo ""
echo "Para instalar:"
echo "  sudo dpkg -i ../installer_output_linux/${APP_NAME}_${VERSION}_${ARCH}.deb"
echo "  sudo apt-get install -f  # Si hay dependencias faltantes"
echo ""
echo "Para desinstalar:"
echo "  sudo apt-get remove $APP_NAME"
echo ""
