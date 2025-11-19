#!/bin/bash
# ==============================================================================
# ThreatGuard EC2 Automatic Setup Script
# ==============================================================================
# Este script automatiza la instalación completa de ThreatGuard en AWS EC2
# Compatible con: Amazon Linux 2023, Ubuntu 22.04 LTS
# ==============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Detectar sistema operativo
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "No se pudo detectar el sistema operativo"
        exit 1
    fi
    log_info "Sistema operativo detectado: $OS $VERSION"
}

# Verificar si se ejecuta como root o con sudo
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script debe ejecutarse con sudo"
        exit 1
    fi
}

# Instalar Docker según el OS
install_docker() {
    log_info "Instalando Docker..."
    
    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ]; then
        # Amazon Linux / RHEL
        yum update -y
        yum install -y docker
        systemctl start docker
        systemctl enable docker
        
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Ubuntu / Debian
        apt-get update
        apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # Agregar repo de Docker
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io
        systemctl start docker
        systemctl enable docker
    else
        log_error "Sistema operativo no soportado: $OS"
        exit 1
    fi
    
    # Agregar usuario al grupo docker
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
        log_success "Usuario $SUDO_USER agregado al grupo docker"
    fi
    
    log_success "Docker instalado correctamente"
}

# Instalar Docker Compose
install_docker_compose() {
    log_info "Instalando Docker Compose..."
    
    # Descargar última versión
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Verificar instalación
    docker-compose --version
    log_success "Docker Compose instalado correctamente"
}

# Instalar herramientas adicionales
install_utilities() {
    log_info "Instalando herramientas adicionales..."
    
    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ]; then
        yum install -y git curl wget vim htop jq
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get install -y git curl wget vim htop jq
    fi
    
    log_success "Herramientas instaladas"
}

# Configurar firewall
configure_firewall() {
    log_info "Configurando firewall..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu con UFW
        ufw allow 22/tcp comment 'SSH'
        ufw allow 8000/tcp comment 'ThreatGuard API'
        ufw allow 8080/tcp comment 'ThreatGuard Dashboard'
        ufw allow 9390/tcp comment 'OpenVAS GMP'
        ufw allow 9392/tcp comment 'OpenVAS Web UI'
        
        log_warning "Para habilitar UFW, ejecuta: sudo ufw enable"
    elif command -v firewall-cmd &> /dev/null; then
        # Amazon Linux con firewalld
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=8000/tcp
        firewall-cmd --permanent --add-port=8080/tcp
        firewall-cmd --permanent --add-port=9390/tcp
        firewall-cmd --permanent --add-port=9392/tcp
        firewall-cmd --reload
        log_success "Firewall configurado"
    else
        log_warning "No se encontró firewall. Asegúrate de configurar los Security Groups de AWS"
    fi
}

# Configurar límites del sistema
configure_system_limits() {
    log_info "Configurando límites del sistema..."
    
    # Para Elasticsearch
    sysctl -w vm.max_map_count=262144
    echo "vm.max_map_count=262144" >> /etc/sysctl.conf
    
    # Aumentar límites de archivos abiertos
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF
    
    log_success "Límites del sistema configurados"
}

# Crear estructura de directorios
setup_directories() {
    log_info "Creando estructura de directorios..."
    
    INSTALL_DIR="/opt/threatguard"
    mkdir -p $INSTALL_DIR/{data,logs,backups,models}
    
    if [ -n "$SUDO_USER" ]; then
        chown -R $SUDO_USER:$SUDO_USER $INSTALL_DIR
    fi
    
    log_success "Directorios creados en $INSTALL_DIR"
}

# Configurar variables de entorno seguras
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    # Generar contraseñas seguras
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    OPENVAS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    cat > /opt/threatguard/.env << EOF
# ThreatGuard Environment Variables
# Auto-generated on $(date)

# Database Configuration
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=threatguard_db
DATABASE_USER=threatguard_user
DATABASE_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# OpenVAS Configuration
OPENVAS_HOST=openvas
OPENVAS_PORT=9390
OPENVAS_USER=admin
OPENVAS_PASSWORD=$OPENVAS_PASSWORD

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# Elasticsearch Configuration
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# Security
JWT_SECRET=$(openssl rand -base64 32)
API_KEY=$(openssl rand -hex 32)
EOF
    
    chmod 600 /opt/threatguard/.env
    
    log_success "Variables de entorno configuradas"
    log_warning "IMPORTANTE: Guarda estas credenciales en un lugar seguro:"
    echo "------------------------------------------------------------"
    echo "Database Password: $DB_PASSWORD"
    echo "Redis Password: $REDIS_PASSWORD"
    echo "OpenVAS Password: $OPENVAS_PASSWORD"
    echo "------------------------------------------------------------"
}

# Desplegar ThreatGuard
deploy_threatguard() {
    log_info "Desplegando ThreatGuard..."
    
    cd /opt/threatguard
    
    # Verificar que existen los archivos necesarios
    if [ ! -f "docker-compose.yml" ]; then
        log_error "No se encontró docker-compose.yml"
        log_error "Asegúrate de haber transferido los archivos a /opt/threatguard/"
        exit 1
    fi
    
    # Cargar variables de entorno
    set -a
    source .env
    set +a
    
    # Construir imágenes
    log_info "Construyendo imágenes Docker (esto puede tardar varios minutos)..."
    docker-compose build
    
    # Iniciar servicios
    log_info "Iniciando servicios..."
    docker-compose up -d
    
    log_success "ThreatGuard desplegado correctamente"
}

# Verificar instalación
verify_installation() {
    log_info "Verificando instalación..."
    
    sleep 10  # Esperar a que los servicios inicien
    
    # Verificar contenedores
    log_info "Estado de contenedores:"
    docker-compose ps
    
    # Verificar API
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_success "API respondiendo correctamente"
    else
        log_warning "API aún no responde. Esto es normal, puede tardar 1-2 minutos"
    fi
    
    # Verificar Dashboard
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        log_success "Dashboard accesible"
    else
        log_warning "Dashboard aún no accesible. Esperando inicialización..."
    fi
}

# Crear script de monitoreo
setup_monitoring() {
    log_info "Configurando monitoreo..."
    
    cat > /opt/threatguard/check_health.sh << 'EOF'
#!/bin/bash
# Script de verificación de salud de ThreatGuard

echo "🔍 Verificando ThreatGuard..."
echo "================================"

# Contenedores
echo -e "\n📦 Estado de Contenedores:"
docker-compose ps

# API
echo -e "\n🔌 API Health Check:"
curl -s http://localhost:8000/health | jq . || echo "API no responde"

# Dashboard
echo -e "\n🖥️ Dashboard:"
curl -Is http://localhost:8080 2>/dev/null | head -1 || echo "Dashboard no accesible"

# Database
echo -e "\n💾 Database:"
docker exec threatguard-postgres psql -U threatguard_user -d threatguard_db -c "SELECT COUNT(*) as total_alerts FROM alerts;" 2>/dev/null || echo "Database no accesible"

# Redis
echo -e "\n📮 Redis:"
docker exec threatguard-redis redis-cli -a $REDIS_PASSWORD PING 2>/dev/null || echo "Redis no responde"

# OpenVAS
echo -e "\n🛡️ OpenVAS Processes:"
docker exec threatguard-openvas ps aux | grep -E "gvmd|ospd" | grep -v grep || echo "OpenVAS no está corriendo"

echo -e "\n================================"
echo "✅ Verificación completa"
EOF
    
    chmod +x /opt/threatguard/check_health.sh
    log_success "Script de monitoreo creado: /opt/threatguard/check_health.sh"
}

# Configurar backups automáticos
setup_backups() {
    log_info "Configurando backups automáticos..."
    
    cat > /opt/threatguard/backup.sh << 'EOF'
#!/bin/bash
# Script de backup automático de ThreatGuard

BACKUP_DIR="/opt/threatguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Cargar variables de entorno
source /opt/threatguard/.env

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec threatguard-postgres pg_dump -U $DATABASE_USER $DATABASE_NAME > \
  $BACKUP_DIR/db_backup_$DATE.sql

# Backup Redis
echo "Backing up Redis..."
docker exec threatguard-redis redis-cli -a $REDIS_PASSWORD --rdb /data/dump.rdb
docker cp threatguard-redis:/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Comprimir
echo "Compressing backups..."
tar -czf $BACKUP_DIR/threatguard_backup_$DATE.tar.gz \
  $BACKUP_DIR/db_backup_$DATE.sql \
  $BACKUP_DIR/redis_backup_$DATE.rdb \
  /opt/threatguard/.env

# Limpiar archivos temporales
rm $BACKUP_DIR/db_backup_$DATE.sql
rm $BACKUP_DIR/redis_backup_$DATE.rdb

# Limpiar backups antiguos (más de 7 días)
find $BACKUP_DIR -name "threatguard_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completado: $BACKUP_DIR/threatguard_backup_$DATE.tar.gz"

# Opcional: Subir a S3
# aws s3 cp $BACKUP_DIR/threatguard_backup_$DATE.tar.gz s3://tu-bucket/threatguard-backups/
EOF
    
    chmod +x /opt/threatguard/backup.sh
    
    # Agregar a crontab (diario a las 2 AM)
    if [ -n "$SUDO_USER" ]; then
        (crontab -l -u $SUDO_USER 2>/dev/null; echo "0 2 * * * /opt/threatguard/backup.sh >> /opt/threatguard/logs/backup.log 2>&1") | crontab -u $SUDO_USER -
        log_success "Backup automático configurado (diario 2:00 AM)"
    fi
}

# Mostrar información final
show_final_info() {
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "No disponible")
    PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "========================================================================"
    echo "          🎉 ThreatGuard Instalado Exitosamente 🎉"
    echo "========================================================================"
    echo ""
    echo "📍 Direcciones de Acceso:"
    echo "   - API:       http://$PUBLIC_IP:8000"
    echo "   - Dashboard: http://$PUBLIC_IP:8080"
    echo "   - OpenVAS:   http://$PUBLIC_IP:9392"
    echo ""
    echo "🔐 Credenciales (guárdalas en un lugar seguro):"
    echo "   Ver archivo: /opt/threatguard/.env"
    echo ""
    echo "📝 Comandos Útiles:"
    echo "   - Ver logs:        cd /opt/threatguard && docker-compose logs -f"
    echo "   - Verificar salud: /opt/threatguard/check_health.sh"
    echo "   - Reiniciar:       cd /opt/threatguard && docker-compose restart"
    echo "   - Detener:         cd /opt/threatguard && docker-compose down"
    echo "   - Backup manual:   /opt/threatguard/backup.sh"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   1. OpenVAS puede tardar 10-15 minutos en inicializar completamente"
    echo "   2. Cierra sesión y vuelve a conectar para usar Docker sin sudo"
    echo "   3. Verifica que los Security Groups de AWS permitan los puertos necesarios"
    echo ""
    echo "📚 Documentación: /opt/threatguard/docs/"
    echo "========================================================================"
}

# ==============================================================================
# MAIN - Flujo Principal
# ==============================================================================

main() {
    echo ""
    echo "========================================================================"
    echo "       ThreatGuard EC2 Automatic Installer v2.0"
    echo "========================================================================"
    echo ""
    
    check_root
    detect_os
    
    log_info "Iniciando instalación de ThreatGuard..."
    
    install_docker
    install_docker_compose
    install_utilities
    configure_firewall
    configure_system_limits
    setup_directories
    
    # Si los archivos ya están en /opt/threatguard, continuar
    if [ -f "/opt/threatguard/docker-compose.yml" ]; then
        setup_environment
        deploy_threatguard
        verify_installation
        setup_monitoring
        setup_backups
        show_final_info
    else
        log_warning "Los archivos de ThreatGuard no están en /opt/threatguard/"
        log_warning "Por favor, transfiere los archivos y luego ejecuta este script nuevamente"
        echo ""
        echo "Puedes usar:"
        echo "  rsync -avz -e 'ssh -i tu-key.pem' . ec2-user@$PRIVATE_IP:/opt/threatguard/"
        echo ""
        echo "O ejecuta solo la parte de despliegue:"
        echo "  sudo bash $0 --deploy-only"
    fi
    
    log_success "Instalación completada"
}

# Opción para ejecutar solo el despliegue
if [ "$1" = "--deploy-only" ]; then
    check_root
    cd /opt/threatguard
    setup_environment
    deploy_threatguard
    verify_installation
    setup_monitoring
    setup_backups
    show_final_info
else
    main
fi
