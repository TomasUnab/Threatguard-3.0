# 🚀 Guía de Despliegue ThreatGuard en AWS EC2

## 📋 Tabla de Contenidos
- [Requisitos de la Instancia EC2](#requisitos-de-la-instancia-ec2)
- [Archivos Necesarios](#archivos-necesarios)
- [Método 1: Despliegue Rápido con Script](#método-1-despliegue-rápido-con-script)
- [Método 2: Despliegue Manual](#método-2-despliegue-manual)
- [Configuración de Seguridad](#configuración-de-seguridad)
- [Verificación del Sistema](#verificación-del-sistema)
- [Solución de Problemas](#solución-de-problemas)

---

## 🖥️ Requisitos de la Instancia EC2

### Especificaciones Mínimas
| Componente | Recomendado | Mínimo |
|------------|-------------|--------|
| **Tipo de Instancia** | `t3.xlarge` | `t3.large` |
| **vCPUs** | 4 | 2 |
| **RAM** | 16 GB | 8 GB |
| **Almacenamiento** | 50 GB SSD (gp3) | 30 GB SSD |
| **SO** | Amazon Linux 2023 / Ubuntu 22.04 LTS | Ubuntu 20.04 |

### Puertos a Abrir en Security Groups
```
- 22   (SSH)
- 80   (HTTP - Opcional, para redirigir a 8080)
- 443  (HTTPS - Opcional, para redirigir a 8080)
- 8000 (ThreatGuard API)
- 8080 (Dashboard Web)
- 9390 (OpenVAS GMP API)
- 9392 (OpenVAS Web UI)
- 5432 (PostgreSQL - Solo si acceso externo necesario)
```

**Reglas de Seguridad Recomendadas:**
```bash
# SSH desde tu IP
Type: SSH, Protocol: TCP, Port: 22, Source: Tu_IP/32

# Dashboard y API
Type: Custom TCP, Port: 8080, Source: 0.0.0.0/0 (o tu red corporativa)
Type: Custom TCP, Port: 8000, Source: 0.0.0.0/0

# OpenVAS
Type: Custom TCP, Port: 9390, Source: Tu_Red/24
Type: Custom TCP, Port: 9392, Source: Tu_Red/24
```

---

## 📦 Archivos Necesarios

### 🔴 **CRÍTICOS** (Obligatorios para que funcione)

```
ThreatGuard/
├── docker-compose.yml          # Orquestación de contenedores
├── Dockerfile                  # Imagen principal de la API
├── Dockerfile.snort            # Imagen de Snort IDS
├── threatguard_api.py          # API principal
├── openvas_auto_scan.py        # Auto-escáner de vulnerabilidades
├── requirements.txt            # Dependencias Python
├── requirements-snort.txt      # Dependencias Snort
├── nginx.conf                  # Configuración Nginx
│
├── config/
│   ├── config.ini              # Configuración general
│   ├── master.ini              # Configuración del maestro
│   ├── snort.lua               # Reglas de Snort
│   └── local.rules             # Reglas personalizadas Snort
│
├── scripts/
│   └── init_db.sql/            # Scripts de inicialización DB
│       ├── 001_schema.sql
│       ├── 002_alerts.sql
│       ├── 003_assets.sql
│       └── ...
│
├── PAGINA WEB/                 # Frontend completo
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── common-header.html
│   ├── settings-v2.js
│   ├── header-utils.js
│   │
│   ├── executive_summary/
│   ├── alerts_(triage_center)/
│   ├── vulnerability_management/
│   │   ├── Dockerfile
│   │   ├── openvas-server.js
│   │   ├── openvas-integration.js
│   │   └── package.json
│   ├── soar_(automation_&_orchestration)/
│   ├── reports/
│   ├── assets_(asset_&_asrm_mgmt.)/
│   ├── settings/
│   └── ai_assistant_chat_modal/
│
└── src/                        # Código fuente Python
    ├── __init__.py
    ├── ai_models/
    │   ├── cic_ids2017_processor.py
    │   ├── cic_intrusion_models.py
    │   └── data_preprocessing.py
    ├── api/
    │   └── assets_api.py
    ├── data_collection/
    │   ├── openvas_integration.py
    │   ├── snort_integration.py
    │   └── wazuh_integration.py
    └── utils/
        ├── config.py
        └── database.py
```

### 🟡 **OPCIONALES** (Recomendados pero no críticos)

```
├── models/
│   └── trained/                # Modelos ML pre-entrenados
│       └── *.pkl
│
├── data/                       # Datasets (se pueden descargar después)
│   └── CIC-IDS2017/
│
├── docs/
│   ├── DEPLOYMENT.md
│   ├── SNORT_INTEGRATION.md
│   └── SOAR_INTEGRATIONS.md
│
└── scripts/
    ├── init_database.py        # Script de inicialización DB
    ├── setup_openvas.py        # Configuración automática OpenVAS
    └── download_cic_dataset.py # Descarga de datasets
```

### ⚪ **NO NECESARIOS** para EC2

```
❌ .venv/                       # Entorno virtual local
❌ agent.py                     # Solo para agentes (no maestro)
❌ agent_ui.py
❌ build_agent.spec
❌ start_agent.bat
❌ installer/                   # Instaladores Windows
❌ *.bat                        # Scripts Windows
❌ .git/                        # Historial Git
❌ __pycache__/
❌ *.pyc
```

---

## 🚀 Método 1: Despliegue Rápido con Script

### Paso 1: Crear el Script de Despliegue

Usa el script `deploy_to_ec2.sh` incluido en este repositorio:

```bash
# En tu máquina local, prepara los archivos
chmod +x deploy_to_ec2.sh
./deploy_to_ec2.sh
```

### Paso 2: Transferir a EC2

```bash
# Crear archivo comprimido con solo los archivos necesarios
tar -czf threatguard-deploy.tar.gz \
  docker-compose.yml \
  Dockerfile \
  Dockerfile.snort \
  threatguard_api.py \
  openvas_auto_scan.py \
  requirements.txt \
  requirements-snort.txt \
  nginx.conf \
  config/ \
  scripts/init_db.sql/ \
  "PAGINA WEB/" \
  src/

# Transferir a EC2
scp -i tu-key.pem threatguard-deploy.tar.gz ec2-user@TU-IP-EC2:/home/ec2-user/

# O usar rsync (más eficiente)
rsync -avz --progress \
  -e "ssh -i tu-key.pem" \
  --exclude='.venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='data/CIC-IDS2017' \
  --exclude='models/trained' \
  --exclude='agent*.py' \
  --exclude='*.bat' \
  . ec2-user@TU-IP-EC2:/home/ec2-user/ThreatGuard/
```

### Paso 3: Conectar a EC2 y Desplegar

```bash
# Conectar por SSH
ssh -i tu-key.pem ec2-user@TU-IP-EC2

# Descomprimir
cd /home/ec2-user
tar -xzf threatguard-deploy.tar.gz
cd ThreatGuard

# Ejecutar script de instalación automática
chmod +x scripts/ec2_setup.sh
sudo ./scripts/ec2_setup.sh
```

---

## 🛠️ Método 2: Despliegue Manual

### Paso 1: Instalar Docker en EC2

#### Para Amazon Linux 2023:
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Para Ubuntu 22.04:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**⚠️ IMPORTANTE: Cierra sesión y vuelve a conectar para que los permisos de docker surtan efecto**

### Paso 2: Transferir Archivos

```bash
# Opción A: rsync (recomendado)
rsync -avz --progress \
  -e "ssh -i tu-key.pem" \
  --exclude='.venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='data/' \
  --exclude='models/trained/' \
  --exclude='agent*.py' \
  --exclude='*.bat' \
  --exclude='installer/' \
  . ec2-user@TU-IP-EC2:/home/ec2-user/ThreatGuard/

# Opción B: Clonar desde Git (si está en repositorio privado)
ssh -i tu-key.pem ec2-user@TU-IP-EC2
git clone https://github.com/tu-usuario/ThreatGuard.git
cd ThreatGuard
```

### Paso 3: Configurar Variables de Entorno

```bash
# Crear archivo .env para producción
cat > .env << EOF
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=threatguard_db
DATABASE_USER=threatguard_user
DATABASE_PASSWORD=TuPasswordSeguro2024!

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=TuRedisPasswordSeguro2024

# OpenVAS
OPENVAS_HOST=openvas
OPENVAS_PORT=9390
OPENVAS_USER=admin
OPENVAS_PASSWORD=TuOpenVASPasswordSeguro2024

# API
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO

# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
EOF

# Cambiar permisos
chmod 600 .env
```

### Paso 4: Configurar IP del Maestro

```bash
# Editar config/master.ini
nano config/master.ini
```

Cambiar:
```ini
[server]
MASTER_IP = auto  # O poner la IP pública de EC2
```

### Paso 5: Iniciar Servicios

```bash
# Construir imágenes (primera vez)
docker-compose build

# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f
```

### Paso 6: Verificar Estado

```bash
# Ver contenedores corriendo
docker-compose ps

# Verificar API
curl http://localhost:8000/health

# Verificar Dashboard
curl http://localhost:8080
```

---

## 🔒 Configuración de Seguridad

### 1. Firewall (UFW en Ubuntu)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 9390/tcp
sudo ufw allow 9392/tcp
sudo ufw enable
```

### 2. Cambiar Contraseñas por Defecto
```bash
# En docker-compose.yml, cambiar:
- DATABASE_PASSWORD
- REDIS_PASSWORD
- OPENVAS_PASSWORD
```

### 3. Configurar SSL/TLS (Opcional pero Recomendado)
```bash
# Instalar Certbot para Let's Encrypt
sudo snap install certbot --classic

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar en nginx.conf
```

### 4. Limitar Acceso a Puertos Sensibles
```bash
# En el Security Group de AWS:
- PostgreSQL (5432): Solo desde red interna
- Redis (6379): Solo desde red interna
- Elasticsearch (9201): Solo desde localhost
```

---

## ✅ Verificación del Sistema

### Script de Verificación Completa

```bash
#!/bin/bash
echo "🔍 Verificando ThreatGuard..."

# 1. Contenedores
echo "📦 Contenedores:"
docker-compose ps

# 2. API
echo -e "\n🔌 API Health:"
curl -s http://localhost:8000/health | jq

# 3. Dashboard
echo -e "\n🖥️ Dashboard:"
curl -Is http://localhost:8080 | head -1

# 4. Database
echo -e "\n💾 Database:"
docker exec threatguard-postgres psql -U threatguard_user -d threatguard_db -c "SELECT COUNT(*) FROM alerts;"

# 5. Redis
echo -e "\n📮 Redis:"
docker exec threatguard-redis redis-cli -a redis_password_2024 PING

# 6. OpenVAS
echo -e "\n🛡️ OpenVAS:"
docker exec threatguard-openvas ps aux | grep gvmd

# 7. Snort
echo -e "\n🚨 Snort:"
docker logs threatguard-snort --tail 5

echo -e "\n✅ Verificación completa"
```

Guardar como `check_system.sh` y ejecutar:
```bash
chmod +x check_system.sh
./check_system.sh
```

---

## 🐛 Solución de Problemas

### Problema 1: Contenedores no inician
```bash
# Ver logs detallados
docker-compose logs --tail=100

# Reiniciar un contenedor específico
docker-compose restart threatguard-api

# Reconstruir imágenes
docker-compose build --no-cache
docker-compose up -d
```

### Problema 2: OpenVAS tarda en inicializar
```bash
# OpenVAS puede tardar 10-15 minutos en cargar feeds la primera vez
docker logs threatguard-openvas -f

# Verificar progreso
docker exec threatguard-openvas ps aux | grep -E "gvmd|ospd"
```

### Problema 3: Error de memoria
```bash
# Aumentar límites de Elasticsearch
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Reducir memoria de Elasticsearch en docker-compose.yml:
ES_JAVA_OPTS=-Xms1g -Xmx1g  # En lugar de 2g
```

### Problema 4: Puerto ya en uso
```bash
# Ver qué proceso usa el puerto
sudo lsof -i :8000

# Matar proceso
sudo kill -9 <PID>

# O cambiar puerto en docker-compose.yml
```

### Problema 5: Sin espacio en disco
```bash
# Limpiar imágenes no usadas
docker system prune -a

# Ver uso de espacio
docker system df

# Limpiar volúmenes
docker volume prune
```

---

## 📊 Monitoreo Continuo

### CloudWatch Logs (AWS)
```bash
# Instalar CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configurar logs
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Backups Automáticos
```bash
# Crear script de backup
cat > /home/ec2-user/backup_threatguard.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ec2-user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec threatguard-postgres pg_dump -U threatguard_user threatguard_db > \
  $BACKUP_DIR/db_backup_$DATE.sql

# Backup Redis
docker exec threatguard-redis redis-cli -a redis_password_2024 --rdb \
  $BACKUP_DIR/redis_backup_$DATE.rdb

# Comprimir
tar -czf $BACKUP_DIR/threatguard_backup_$DATE.tar.gz \
  $BACKUP_DIR/db_backup_$DATE.sql \
  $BACKUP_DIR/redis_backup_$DATE.rdb

# Limpiar archivos antiguos (más de 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete

echo "Backup completado: $BACKUP_DIR/threatguard_backup_$DATE.tar.gz"
EOF

# Agregar a crontab (diario a las 2 AM)
chmod +x /home/ec2-user/backup_threatguard.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/backup_threatguard.sh") | crontab -
```

---

## 🎯 Checklist Final

- [ ] Instancia EC2 creada con tipo adecuado (t3.large o superior)
- [ ] Security Groups configurados con puertos necesarios
- [ ] Docker y Docker Compose instalados
- [ ] Archivos transferidos (solo los necesarios)
- [ ] Variables de entorno configuradas (.env)
- [ ] Contraseñas cambiadas en docker-compose.yml
- [ ] `docker-compose up -d` ejecutado exitosamente
- [ ] API responde en http://IP-EC2:8000/health
- [ ] Dashboard accesible en http://IP-EC2:8080
- [ ] OpenVAS inicializado (verificar con logs)
- [ ] Base de datos inicializada
- [ ] Snort detectando tráfico
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado (CloudWatch)
- [ ] Firewall configurado (UFW/Security Groups)

---

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. **Revisa los logs**: `docker-compose logs -f`
2. **Verifica recursos**: `htop` o `docker stats`
3. **Consulta la documentación**: `/docs/DEPLOYMENT.md`
4. **Revisar issues conocidos**: GitHub Issues

---

## 📝 Notas Adicionales

### Costos Estimados AWS (Mensual)
- **EC2 t3.xlarge** (4 vCPU, 16GB): ~$120/mes
- **EBS 50GB gp3**: ~$4/mes
- **Elastic IP**: $3.60/mes (si está inactiva)
- **Data Transfer**: Variable según uso

**Total estimado**: ~$130-150/mes

### Escalabilidad
Para manejar más agentes o tráfico:
1. Usar RDS en lugar de PostgreSQL local
2. Usar ElastiCache en lugar de Redis local
3. Auto Scaling Group con múltiples instancias
4. Application Load Balancer para distribuir tráfico

---

**Última actualización**: Noviembre 2025
**Versión ThreatGuard**: 2.0
