# 🚀 ThreatGuard EC2 - Referencia Rápida

## 📦 Archivos Esenciales para EC2

### ✅ Lista de Archivos OBLIGATORIOS

```
📂 ThreatGuard/
│
├── 🔴 CRÍTICOS (Sin estos NO funciona)
│   ├── docker-compose.yml           # Orquestación de contenedores
│   ├── Dockerfile                   # Imagen de la API
│   ├── Dockerfile.snort             # Imagen de Snort
│   ├── threatguard_api.py           # API principal
│   ├── openvas_auto_scan.py         # Auto-escáner
│   ├── requirements.txt             # Dependencias Python
│   ├── requirements-snort.txt       # Dependencias Snort
│   ├── nginx.conf                   # Config Nginx
│   │
│   ├── 📁 config/                   # Configuraciones
│   │   ├── config.ini
│   │   ├── master.ini
│   │   ├── snort.lua
│   │   └── local.rules
│   │
│   ├── 📁 scripts/                  # Scripts de inicialización
│   │   ├── init_db.sql/
│   │   └── ec2_setup.sh            # Script de instalación
│   │
│   ├── 📁 PAGINA WEB/              # Frontend completo
│   │   ├── Dockerfile
│   │   ├── nginx.conf
│   │   ├── index.html
│   │   └── [todos los subdirectorios]
│   │
│   └── 📁 src/                      # Código fuente
│       ├── ai_models/
│       ├── api/
│       ├── data_collection/
│       └── utils/
│
├── 🟡 OPCIONALES (Recomendados)
│   ├── docs/                        # Documentación
│   ├── models/trained/              # Modelos pre-entrenados
│   └── data/                        # Datasets (grandes)
│
└── ⚪ NO NECESARIOS para EC2
    ├── .venv/                       # Entorno virtual local
    ├── agent*.py                    # Solo para agentes
    ├── *.bat                        # Scripts Windows
    ├── installer/                   # Instalador Windows
    └── __pycache__/                 # Cache Python
```

---

## 🎯 3 Métodos de Despliegue

### Método 1: Script Automatizado (Recomendado) ⭐

```powershell
# En Windows PowerShell
.\transfer_to_ec2.ps1 -EC2_IP "54.123.45.67" -KeyFile "C:\Users\tu-usuario\.ssh\tu-key.pem"

# Luego en EC2
sudo bash /opt/threatguard/scripts/ec2_setup.sh
```

**Ventajas:** Todo automatizado, incluye backups, monitoreo, y configuración segura.

---

### Método 2: Paquete Comprimido

```bash
# En Linux/Mac (o Git Bash en Windows)
chmod +x prepare_ec2_package.sh
./prepare_ec2_package.sh

# Transferir
scp -i tu-key.pem threatguard-ec2-*.tar.gz ec2-user@TU-IP:/home/ec2-user/

# En EC2
tar -xzf threatguard-ec2-*.tar.gz
sudo mv threatguard-ec2-* /opt/threatguard
sudo bash /opt/threatguard/scripts/ec2_setup.sh
```

**Ventajas:** Paquete único, fácil de versionar.

---

### Método 3: rsync Directo

```bash
# Desde tu máquina (Linux/Mac/Git Bash)
rsync -avz --progress \
  -e "ssh -i tu-key.pem" \
  --exclude='.venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='data/CIC-IDS2017' \
  --exclude='agent*.py' \
  --exclude='*.bat' \
  . ec2-user@TU-IP-EC2:/opt/threatguard/

# En EC2
sudo bash /opt/threatguard/scripts/ec2_setup.sh
```

**Ventajas:** Rápido, solo transfiere cambios, ideal para actualizaciones.

---

## ⚙️ Configuración de EC2

### Tipo de Instancia
| Uso | Tipo | vCPU | RAM | Precio/mes (aprox) |
|-----|------|------|-----|-------------------|
| **Producción** | `t3.xlarge` | 4 | 16 GB | ~$120 |
| Desarrollo | `t3.large` | 2 | 8 GB | ~$60 |
| Pruebas | `t3.medium` | 2 | 4 GB | ~$30 |

### Security Groups (Firewall)
```yaml
Inbound Rules:
  - Type: SSH, Port: 22, Source: Tu_IP/32
  - Type: Custom TCP, Port: 8000, Source: 0.0.0.0/0  # API
  - Type: Custom TCP, Port: 8080, Source: 0.0.0.0/0  # Dashboard
  - Type: Custom TCP, Port: 9390, Source: Tu_Red/24  # OpenVAS
  - Type: Custom TCP, Port: 9392, Source: Tu_Red/24  # OpenVAS Web

Outbound Rules:
  - All traffic (por defecto)
```

### Almacenamiento
- **Mínimo:** 30 GB SSD (gp3)
- **Recomendado:** 50 GB SSD (gp3)
- **Producción:** 100 GB SSD (gp3) con snapshots automáticos

---

## 🛠️ Comandos Esenciales en EC2

### Instalación
```bash
# Instalación completa automatizada
sudo bash /opt/threatguard/scripts/ec2_setup.sh

# Solo despliegue (si Docker ya está instalado)
sudo bash /opt/threatguard/scripts/ec2_setup.sh --deploy-only
```

### Gestión de Servicios
```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f threatguard-api

# Reiniciar todos los servicios
docker-compose restart

# Reiniciar un servicio específico
docker-compose restart threatguard-api

# Detener todos los servicios
docker-compose down

# Iniciar todos los servicios
docker-compose up -d

# Reconstruir e iniciar
docker-compose up -d --build
```

### Verificación
```bash
# Script de verificación completa
/opt/threatguard/check_health.sh

# Verificar API manualmente
curl http://localhost:8000/health

# Verificar Dashboard
curl http://localhost:8080

# Verificar contenedores corriendo
docker ps

# Ver uso de recursos
docker stats
```

### Mantenimiento
```bash
# Backup manual
/opt/threatguard/backup.sh

# Ver backups
ls -lh /opt/threatguard/backups/

# Limpiar imágenes no usadas
docker system prune -a

# Ver uso de disco
df -h
du -sh /opt/threatguard/*

# Ver logs del sistema
journalctl -u docker -f
```

---

## 🔐 Seguridad Post-Instalación

### 1. Cambiar Contraseñas
```bash
# Editar archivo de entorno
sudo nano /opt/threatguard/.env

# Cambiar:
DATABASE_PASSWORD=...
REDIS_PASSWORD=...
OPENVAS_PASSWORD=...

# Reiniciar servicios
cd /opt/threatguard
docker-compose down
docker-compose up -d
```

### 2. Configurar SSL/TLS
```bash
# Instalar Certbot
sudo snap install certbot --classic

# Obtener certificado (requiere dominio)
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar en nginx (ver docs/SSL_SETUP.md)
```

### 3. Firewall Local (UFW en Ubuntu)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

---

## 🐛 Solución Rápida de Problemas

### Problema: Contenedor no inicia
```bash
# Ver logs
docker logs threatguard-api --tail 50

# Reiniciar
docker-compose restart threatguard-api

# Reconstruir
docker-compose up -d --build threatguard-api
```

### Problema: OpenVAS tarda mucho
```bash
# Es normal, puede tardar 10-15 minutos la primera vez
docker logs threatguard-openvas -f

# Verificar procesos
docker exec threatguard-openvas ps aux | grep gvmd
```

### Problema: Sin memoria
```bash
# Ver uso
free -h
docker stats

# Reducir memoria de Elasticsearch
# Editar docker-compose.yml:
ES_JAVA_OPTS=-Xms1g -Xmx1g  # En lugar de 2g
```

### Problema: Puerto ocupado
```bash
# Ver qué usa el puerto
sudo lsof -i :8000

# Matar proceso
sudo kill -9 <PID>
```

---

## 📊 URLs de Acceso

Una vez desplegado, accede a:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Dashboard** | `http://TU-IP:8080` | Ver en la web |
| **API** | `http://TU-IP:8000` | No requiere (por ahora) |
| **API Docs** | `http://TU-IP:8000/docs` | Swagger UI |
| **OpenVAS** | `http://TU-IP:9392` | admin / Ver .env |
| **PostgreSQL** | `TU-IP:5432` | Ver .env |

---

## 💰 Costos Estimados AWS (Mensual)

### Configuración Recomendada
```
✓ EC2 t3.xlarge (4 vCPU, 16GB RAM):  ~$120
✓ EBS 50GB gp3:                       ~$4
✓ Elastic IP:                         ~$0 (si está asociada)
✓ Data Transfer (50GB out):          ~$4.50
✓ Backups S3 (100GB):                ~$2.30
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL APROXIMADO:                    ~$130/mes
```

### Optimización de Costos
```
💡 Usar Reserved Instances: -40% de descuento
💡 Usar Savings Plans: -30-50% de descuento
💡 Apagar instancia fuera de horario: -70% de ahorro
💡 Usar Spot Instances (no producción): -90% de descuento
```

---

## 📚 Documentación Adicional

- **Guía Completa:** `docs/AWS_EC2_DEPLOYMENT.md`
- **Despliegue General:** `docs/DEPLOYMENT.md`
- **Integración Snort:** `docs/SNORT_INTEGRATION.md`
- **SOAR:** `docs/SOAR_INTEGRATIONS.md`

---

## ✅ Checklist de Despliegue

```
Pre-Despliegue:
☐ Instancia EC2 creada (t3.large o superior)
☐ Security Groups configurados
☐ Key Pair descargada (.pem)
☐ Elastic IP asignada (opcional)

Transferencia:
☐ Archivos transferidos a /opt/threatguard
☐ Script ec2_setup.sh tiene permisos de ejecución

Instalación:
☐ Script ec2_setup.sh ejecutado exitosamente
☐ Contraseñas guardadas en lugar seguro
☐ Docker y Docker Compose instalados

Post-Instalación:
☐ Todos los contenedores corriendo
☐ API responde: curl http://localhost:8000/health
☐ Dashboard accesible: http://TU-IP:8080
☐ OpenVAS inicializado completamente
☐ Backups automáticos configurados

Seguridad:
☐ Contraseñas cambiadas del default
☐ Firewall configurado (UFW/Security Groups)
☐ SSH solo desde IP conocida
☐ Backups funcionando

Monitoreo:
☐ Script check_health.sh funciona
☐ CloudWatch configurado (opcional)
☐ Alertas configuradas (opcional)
```

---

## 🆘 Soporte

**Orden de troubleshooting:**
1. Ejecutar `/opt/threatguard/check_health.sh`
2. Revisar logs: `docker-compose logs -f`
3. Verificar recursos: `htop` y `docker stats`
4. Consultar documentación en `/docs/`
5. Buscar en GitHub Issues

---

**Última actualización:** Noviembre 2025  
**Versión:** ThreatGuard 2.0
