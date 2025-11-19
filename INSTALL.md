# ThreatGuard - Guía de Instalación

## 📋 Requisitos Previos

### Software Necesario
- **Docker Desktop** (Windows/Mac) o **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git** para clonar el repositorio
- **4GB RAM** mínimo (8GB recomendado)
- **20GB** espacio en disco

### Puertos Requeridos
- `8080` - Frontend Web
- `8000` - API Backend
- `5432` - PostgreSQL
- `6379` - Redis
- `9200` - Elasticsearch
- `9390` - OpenVAS

## 🚀 Instalación Rápida

### 1. Clonar el Repositorio
```bash
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0
```

### 2. Configurar Variables de Entorno (Opcional)
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env
```

### 3. Iniciar Contenedores
```bash
# Construir e iniciar todos los servicios
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f
```

### 4. Verificar Instalación
```bash
# Ver estado de contenedores
docker ps

# Verificar salud de servicios
docker-compose ps
```

## 🌐 Acceso a la Aplicación

Una vez iniciados los contenedores:

- **Dashboard Web**: http://localhost:8080
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Credenciales por Defecto
- **Usuario**: admin
- **Contraseña**: changeme123

⚠️ **IMPORTANTE**: Cambia las credenciales en producción

## 📦 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 8080 | Interfaz web (Nginx) |
| API | 8000 | Backend FastAPI |
| PostgreSQL | 5432 | Base de datos principal |
| Redis | 6379 | Caché y sesiones |
| Elasticsearch | 9200 | Búsqueda y análisis |
| OpenVAS | 9390 | Escaneo de vulnerabilidades |
| Snort | - | IDS/IPS |

## 🔧 Configuración Post-Instalación

### 1. Subir Modelo de Machine Learning
1. Ir a **Settings** → **Gestión del Modelo (IA)**
2. Hacer clic en **Cargar Nuevo Modelo**
3. Seleccionar archivo `.pkl` entrenado
4. Esperar validación y carga

### 2. Configurar Integraciones
1. Ir a **Settings** → **Integraciones**
2. Probar conexión con **PostgreSQL** y **OpenVAS**
3. Agregar conectores personalizados si es necesario

### 3. Configurar Snort IDS
1. Ir a **Settings** → **Snort IDS**
2. Revisar reglas predefinidas en tab **Reglas**
3. Configurar políticas en tab **Políticas**
4. Aplicar cambios y reiniciar Snort

### 4. Crear Usuarios
1. Ir a **Settings** → **Gestión de Usuarios**
2. Hacer clic en **Agregar Usuario**
3. Completar formulario y asignar rol

## 🐛 Solución de Problemas

### Contenedor no inicia
```bash
# Ver logs del contenedor
docker logs threatguard-api

# Reiniciar contenedor específico
docker-compose restart threatguard-api
```

### Puerto ya en uso
```bash
# Verificar qué proceso usa el puerto
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # Linux/Mac

# Cambiar puerto en docker-compose.yml
```

### Base de datos no conecta
```bash
# Verificar que PostgreSQL esté corriendo
docker exec threatguard-postgres pg_isready

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Modelo ML no carga
1. Verificar que el archivo `.pkl` esté en `models/`
2. Revisar logs: `docker logs threatguard-api`
3. Subir modelo desde interfaz web

## 🔄 Actualización

### Actualizar a última versión
```bash
# Detener contenedores
docker-compose down

# Obtener últimos cambios
git pull origin main

# Reconstruir e iniciar
docker-compose up -d --build
```

### Mantener datos
Los volúmenes de Docker persisten datos automáticamente:
- Base de datos PostgreSQL
- Modelos ML
- Logs y configuraciones

## 🗑️ Desinstalación

### Detener y eliminar contenedores
```bash
docker-compose down
```

### Eliminar volúmenes (⚠️ Borra todos los datos)
```bash
docker-compose down -v
```

### Eliminar imágenes
```bash
docker rmi $(docker images 'threatguard*' -q)
```

## 📚 Documentación Adicional

- [Configuración del Agente](docs/AGENT_SETUP.md)
- [Integración con Snort](docs/SNORT_INTEGRATION.md)
- [Despliegue en AWS](docs/AWS_EC2_DEPLOYMENT.md)
- [Changelog](CHANGELOG.md)

## 🆘 Soporte

- **Issues**: https://github.com/TomasUnab/Threatguard-3.0/issues
- **Documentación**: Ver carpeta `docs/`
- **Email**: support@threatguard.local

## 📄 Licencia

Copyright © 2025 ThreatGuard. Todos los derechos reservados.

---

**¿Problemas con la instalación?** Abre un issue en GitHub con:
1. Sistema operativo y versión
2. Versión de Docker
3. Logs del contenedor problemático
4. Pasos para reproducir el error
