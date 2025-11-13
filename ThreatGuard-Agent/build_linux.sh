#!/bin/bash
# Script para construir el instalador de ThreatGuard Agent para Linux

echo "========================================"
echo "  ThreatGuard Agent - Build Script"
echo "  Platform: Linux"
echo "========================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "[1/4] Verificando dependencias del sistema..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python 3 no está instalado${NC}"
    exit 1
fi

echo "[2/4] Instalando dependencias de Python..."
pip3 install -r requirements-agent-client.txt
pip3 install pyinstaller

echo ""
echo "[3/4] Limpiando builds anteriores..."
rm -rf dist build *.spec

echo ""
echo "[4/4] Creando ejecutable con PyInstaller..."
pyinstaller --name="ThreatGuard-Agent" \
    --windowed \
    --onefile \
    --add-data="agent.py:." \
    --add-data="../config/agent.ini:config" \
    --hidden-import=customtkinter \
    --hidden-import=PIL \
    --hidden-import=requests \
    --hidden-import=psutil \
    --hidden-import=psycopg2 \
    --hidden-import=sqlalchemy \
    agent_ui_linux.py

if [ ! -f "dist/ThreatGuard-Agent" ]; then
    echo -e "${RED}ERROR: No se pudo crear el ejecutable${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================"
echo "  Build completado exitosamente!"
echo "  Ejecutable: dist/ThreatGuard-Agent"
echo "========================================${NC}"
echo ""
echo "Para instalar el agente, ejecuta:"
echo "  sudo ./install_agent_linux.sh"
echo ""
