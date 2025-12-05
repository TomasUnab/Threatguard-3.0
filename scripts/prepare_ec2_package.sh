#!/bin/bash
# ==============================================================================
# ThreatGuard - Preparador de Paquete para Despliegue EC2
# ==============================================================================
# Este script prepara un paquete con solo los archivos necesarios para EC2
# Ejecutar desde la raíz del proyecto ThreatGuard
# ==============================================================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================================================"
echo "       ThreatGuard - Preparador de Paquete EC2"
echo -e "========================================================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ] || [ ! -f "threatguard_api.py" ]; then
    echo -e "${YELLOW}[⚠]${NC} Este script debe ejecutarse desde la raíz del proyecto ThreatGuard"
    exit 1
fi

# Crear directorio temporal
PACKAGE_DIR="threatguard-ec2-package"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="threatguard-ec2-${TIMESTAMP}.tar.gz"

echo -e "${BLUE}[📦]${NC} Preparando paquete de despliegue..."

# Limpiar si existe
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copiar archivos críticos
echo -e "${BLUE}[→]${NC} Copiando archivos necesarios..."

# Archivos raíz
cp docker-compose.yml $PACKAGE_DIR/
cp Dockerfile $PACKAGE_DIR/
cp Dockerfile.snort $PACKAGE_DIR/
cp threatguard_api.py $PACKAGE_DIR/
cp openvas_auto_scan.py $PACKAGE_DIR/
cp requirements.txt $PACKAGE_DIR/
cp requirements-snort.txt $PACKAGE_DIR/
cp nginx.conf $PACKAGE_DIR/

# Directorios completos
echo -e "${BLUE}[→]${NC} Copiando directorios..."
cp -r config/ $PACKAGE_DIR/
cp -r src/ $PACKAGE_DIR/
cp -r scripts/ $PACKAGE_DIR/
cp -r "PAGINA WEB/" $PACKAGE_DIR/
cp -r docs/ $PACKAGE_DIR/

# Crear directorios vacíos necesarios
mkdir -p $PACKAGE_DIR/{data,logs,models/trained}

# Limpiar archivos innecesarios
echo -e "${BLUE}[🧹]${NC} Limpiando archivos innecesarios..."
find $PACKAGE_DIR -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find $PACKAGE_DIR -type f -name "*.pyc" -delete 2>/dev/null || true
find $PACKAGE_DIR -type f -name "*.pyo" -delete 2>/dev/null || true
find $PACKAGE_DIR -type f -name "*.bak" -delete 2>/dev/null || true
find $PACKAGE_DIR -type f -name ".DS_Store" -delete 2>/dev/null || true

# Eliminar archivos de agente (no necesarios en el servidor maestro)
rm -f $PACKAGE_DIR/agent*.py 2>/dev/null || true
rm -f $PACKAGE_DIR/*.bat 2>/dev/null || true
rm -f $PACKAGE_DIR/start_agent*.* 2>/dev/null || true
rm -f $PACKAGE_DIR/build_agent.spec 2>/dev/null || true

# Crear README de despliegue
cat > $PACKAGE_DIR/README_DEPLOY.txt << 'EOF'
======================================================================
    ThreatGuard - Paquete de Despliegue EC2
======================================================================

Este paquete contiene todos los archivos necesarios para desplegar
ThreatGuard en una instancia AWS EC2.

INSTRUCCIONES DE DESPLIEGUE:
-----------------------------

1. TRANSFERIR ARCHIVOS A EC2:
   
   Opción A - rsync (recomendado):
   $ rsync -avz --progress -e "ssh -i tu-key.pem" \
     . ec2-user@TU-IP-EC2:/opt/threatguard/
   
   Opción B - scp:
   $ scp -i tu-key.pem -r . ec2-user@TU-IP-EC2:/opt/threatguard/

2. CONECTAR A EC2:
   $ ssh -i tu-key.pem ec2-user@TU-IP-EC2

3. EJECUTAR INSTALACIÓN AUTOMÁTICA:
   $ sudo bash /opt/threatguard/scripts/ec2_setup.sh

4. VERIFICAR INSTALACIÓN:
   $ /opt/threatguard/check_health.sh

ACCESO AL SISTEMA:
------------------
- API:       http://TU-IP-EC2:8000
- Dashboard: http://TU-IP-EC2:8080
- OpenVAS:   http://TU-IP-EC2:9392

PUERTOS A CONFIGURAR EN SECURITY GROUPS:
-----------------------------------------
- 22   (SSH)
- 8000 (API)
- 8080 (Dashboard)
- 9390 (OpenVAS GMP)
- 9392 (OpenVAS Web UI)

DOCUMENTACIÓN COMPLETA:
-----------------------
Ver: docs/AWS_EC2_DEPLOYMENT.md

SOPORTE:
--------
- GitHub Issues
- Documentación: /docs/

======================================================================
EOF

# Crear archivo de verificación de integridad
echo -e "${BLUE}[✓]${NC} Generando checksums..."
cd $PACKAGE_DIR
find . -type f -exec md5sum {} \; > CHECKSUMS.md5
cd ..

# Comprimir paquete
echo -e "${BLUE}[📦]${NC} Comprimiendo paquete..."
tar -czf $PACKAGE_NAME $PACKAGE_DIR/

# Calcular tamaño
SIZE=$(du -h $PACKAGE_NAME | cut -f1)

# Limpiar directorio temporal
rm -rf $PACKAGE_DIR

echo ""
echo -e "${GREEN}========================================================================"
echo "                    ✅ PAQUETE CREADO EXITOSAMENTE"
echo -e "========================================================================${NC}"
echo ""
echo "📦 Archivo: $PACKAGE_NAME"
echo "💾 Tamaño:  $SIZE"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo ""
echo "1. Transferir el paquete a EC2:"
echo "   ${BLUE}scp -i tu-key.pem $PACKAGE_NAME ec2-user@TU-IP-EC2:/home/ec2-user/${NC}"
echo ""
echo "2. En EC2, extraer el paquete:"
echo "   ${BLUE}tar -xzf $PACKAGE_NAME${NC}"
echo "   ${BLUE}sudo mv $PACKAGE_DIR /opt/threatguard${NC}"
echo ""
echo "3. Ejecutar instalación automática:"
echo "   ${BLUE}sudo bash /opt/threatguard/scripts/ec2_setup.sh${NC}"
echo ""
echo "📚 Documentación completa en: docs/AWS_EC2_DEPLOYMENT.md"
echo ""
echo -e "${GREEN}========================================================================${NC}"
