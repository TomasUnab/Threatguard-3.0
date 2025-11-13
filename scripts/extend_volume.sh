#!/bin/bash
# ==============================================================================
# Script para Extender Volumen EBS después de aumentarlo en AWS
# ==============================================================================
# Uso: sudo bash extend_volume.sh
# ==============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    log_error "Este script debe ejecutarse con sudo"
    exit 1
fi

echo "========================================================================"
echo "       Script de Extensión de Volumen EBS"
echo "========================================================================"
echo ""

log_info "Estado ANTES de extender:"
echo ""
df -h | grep -E "Filesystem|/$"
echo ""
lsblk | grep -E "NAME|nvme0n1|xvda"
echo ""

# Detectar el dispositivo de disco
if [ -e /dev/nvme0n1 ]; then
    DEVICE="/dev/nvme0n1"
    PARTITION="${DEVICE}p1"
    PART_NUM="1"
    log_info "Dispositivo detectado: NVMe ($DEVICE)"
elif [ -e /dev/xvda ]; then
    DEVICE="/dev/xvda"
    PARTITION="${DEVICE}1"
    PART_NUM="1"
    log_info "Dispositivo detectado: Xen Virtual ($DEVICE)"
else
    log_error "No se pudo detectar el dispositivo de disco"
    exit 1
fi

# Verificar filesystem
FS_TYPE=$(df -T / | tail -1 | awk '{print $2}')
log_info "Sistema de archivos detectado: $FS_TYPE"

# Instalar growpart si no está instalado
if ! command -v growpart &> /dev/null; then
    log_warning "growpart no está instalado. Instalando..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" = "amzn" ] || [ "$ID" = "rhel" ]; then
            yum install -y cloud-utils-growpart
        elif [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
            apt-get update
            apt-get install -y cloud-guest-utils
        fi
    fi
fi

echo ""
log_info "Extendiendo partición $PARTITION..."

# Extender la partición
if growpart $DEVICE $PART_NUM; then
    log_success "Partición extendida exitosamente"
else
    log_warning "La partición ya estaba al máximo tamaño o hubo un error"
fi

echo ""
log_info "Extendiendo sistema de archivos ($FS_TYPE)..."

# Extender el filesystem según el tipo
case $FS_TYPE in
    ext4)
        log_info "Extendiendo filesystem ext4..."
        if resize2fs $PARTITION; then
            log_success "Filesystem ext4 extendido"
        else
            log_error "Error al extender filesystem ext4"
            exit 1
        fi
        ;;
    xfs)
        log_info "Extendiendo filesystem xfs..."
        if xfs_growfs -d /; then
            log_success "Filesystem xfs extendido"
        else
            log_error "Error al extender filesystem xfs"
            exit 1
        fi
        ;;
    *)
        log_error "Tipo de filesystem no soportado: $FS_TYPE"
        exit 1
        ;;
esac

echo ""
log_success "========================================================================"
log_success "           EXTENSIÓN COMPLETADA EXITOSAMENTE"
log_success "========================================================================"
echo ""

log_info "Estado DESPUÉS de extender:"
echo ""
df -h | grep -E "Filesystem|/$"
echo ""
lsblk | grep -E "NAME|nvme0n1|xvda"
echo ""

# Calcular el espacio ganado
SPACE_BEFORE=$(df -h / | tail -1 | awk '{print $2}')
SPACE_AFTER=$(df -h / | tail -1 | awk '{print $2}')

log_success "✓ Volumen extendido correctamente"
log_success "✓ Espacio total disponible: $SPACE_AFTER"
echo ""
log_info "Puedes verificar con: df -h"
echo ""
