# Instalación del Servidor ThreatGuard

Esta guía te llevará a través del proceso de instalación del servidor principal de ThreatGuard.

## 📋 Requisitos Previos

### Hardware Mínimo
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Almacenamiento:** 50 GB SSD
- **Red:** Conexión estable a Internet

### Hardware Recomendado
- **CPU:** 8+ cores
- **RAM:** 16+ GB
- **Almacenamiento:** 100+ GB SSD
- **Red:** Conexión de alta velocidad

### Software Requerido
- Python 3.8 o superior
- PostgreSQL 12 o superior
- Redis 6.0 o superior
- Docker (opcional)
- Sistema Operativo: Ubuntu 20.04+, Debian 10+, CentOS 8+, o Windows Server 2016+

## 🐧 Instalación en Linux

### 1. Clonar el Repositorio

```bash
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0
```

### 2. Instalar Dependencias del Sistema

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib redis-server
```

**CentOS/RHEL:**
```bash
sudo yum install -y python3 python3-pip postgresql-server postgresql-contrib redis
sudo postgresql-setup --initdb
sudo systemctl start postgresql redis
sudo systemctl enable postgresql redis
```

### 3. Crear Entorno Virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Instalar Dependencias de Python

```bash
pip install -r requirements.txt
```

### 5. Configurar Base de Datos

```bash
# Crear base de datos
sudo -u postgres psql -c "CREATE DATABASE threatguard;"
sudo -u postgres psql -c "CREATE USER threatguard_user WITH PASSWORD 'tu_password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE threatguard TO threatguard_user;"

# Inicializar esquema
python scripts/init_database.py
```

### 6. Configurar el Servidor

Copia el archivo de configuración de ejemplo:
```bash
cp config/config.ini.example config/config.ini
nano config/config.ini
```

Configura los siguientes parámetros:
```ini
[DATABASE]
DB_HOST = localhost
DB_PORT = 5432
DB_NAME = threatguard
DB_USER = threatguard_user
DB_PASSWORD = tu_password_seguro

[REDIS]
REDIS_HOST = localhost
REDIS_PORT = 6379

[API]
API_PORT = 8000
SECRET_KEY = genera_una_clave_segura_aleatoria

[EMAIL]
SMTP_SERVER = smtp.gmail.com
SMTP_PORT = 587
SMTP_USERNAME = tu_email@gmail.com
SMTP_PASSWORD = tu_password_de_aplicacion
```

### 7. Iniciar el Servidor

```bash
# Modo desarrollo
python threatguard_api.py

# Modo producción con Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 threatguard_api:app
```

## 🪟 Instalación en Windows

### 1. Instalar Dependencias

1. Descargar e instalar [Python 3.8+](https://www.python.org/downloads/)
2. Descargar e instalar [PostgreSQL](https://www.postgresql.org/download/windows/)
3. Descargar e instalar [Redis](https://github.com/microsoftarchive/redis/releases)

### 2. Clonar el Repositorio

```powershell
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0
```

### 3. Crear Entorno Virtual

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 4. Instalar Dependencias

```powershell
pip install -r requirements.txt
```

### 5. Configurar y Ejecutar

Sigue los mismos pasos de configuración que en Linux (pasos 5-7).

## 🐳 Instalación con Docker

### 1. Clonar el Repositorio

```bash
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0
```

### 2. Configurar Variables de Entorno

```bash
cp config/config.ini.example config/config.ini
# Editar config/config.ini con tus valores
```

### 3. Iniciar con Docker Compose

```bash
docker-compose up -d
```

Esto iniciará:
- Servidor ThreatGuard (puerto 8000)
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- OpenVAS (puerto 9390)

### 4. Verificar Instalación

```bash
docker-compose ps
docker-compose logs -f threatguard
```

## ✅ Verificar la Instalación

Accede a la interfaz web:
```
http://tu-servidor:8000
```

Credenciales por defecto:
- **Usuario:** admin
- **Contraseña:** admin (cambiar inmediatamente)

## 🔧 Próximos Pasos

1. [Configuración Inicial](Initial-Configuration)
2. [Instalar Agentes](Agent-Installation)
3. [Configurar Snort](Snort-Integration)
4. [Configurar OpenVAS](OpenVAS-Integration)

## 🐛 Solución de Problemas

### El servidor no inicia
- Verificar que PostgreSQL y Redis estén corriendo
- Revisar los logs en `logs/threatguard.log`
- Verificar que los puertos no estén en uso

### Error de conexión a la base de datos
- Verificar credenciales en `config/config.ini`
- Asegurar que PostgreSQL acepta conexiones TCP
- Verificar firewall

### Más ayuda
Ver [Troubleshooting](Troubleshooting) para más soluciones.
