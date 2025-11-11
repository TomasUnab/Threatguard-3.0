# ThreatGuard

Sistema de detección de amenazas y gestión de seguridad con IA.

## 🚀 Características

- Detección de intrusiones con Machine Learning
- Integración con Snort IDS
- Escaneo de vulnerabilidades con OpenVAS
- Dashboard web interactivo
- Sistema de alertas y notificaciones
- Gestión de activos y ASRM
- Automatización SOAR

## 📋 Requisitos

- Python 3.8+
- PostgreSQL 12+
- Redis
- Docker (opcional)
- OpenVAS (para escaneo de vulnerabilidades)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/ThreatGuard.git
cd ThreatGuard
```

### 2. Configurar el entorno

```bash
# Copiar archivos de configuración de ejemplo
cp config/config.ini.example config/config.ini
cp config/master.ini.example config/master.ini

# Editar los archivos .ini con tus credenciales
```

### 3. Instalar dependencias

```bash
# Servidor principal
pip install -r requirements.txt

# Agente
pip install -r requirements-agent.txt

# Cliente del agente
pip install -r requirements-agent-client.txt
```

### 4. Inicializar la base de datos

```bash
python scripts/init_database.py
```

### 5. Descargar modelos (opcional)

Los modelos de ML entrenados son muy grandes. Puedes:
- Entrenar tus propios modelos usando los scripts en `src/ai_models/`
- Descargar modelos preentrenados desde [RELEASES]

## 🐳 Instalación con Docker

```bash
docker-compose up -d
```

## 📖 Documentación

Consulta la carpeta `docs/` para documentación detallada:
- [Configuración del Agente](docs/AGENT_SETUP.md)
- [Construcción del Agente](docs/AGENT_BUILD.md)
- [Integración con Snort](docs/SNORT_INTEGRATION.md)
- [Despliegue en AWS EC2](docs/AWS_EC2_DEPLOYMENT.md)

## 🔒 Seguridad

**IMPORTANTE:** 
- Nunca subas archivos `.ini` con credenciales reales
- Cambia todas las contraseñas por defecto
- Genera claves secretas únicas para producción
- Usa HTTPS en producción

## 📝 Licencia

Copyright © 2025 Tomas Unab. Todos los derechos reservados.

Este software es propietario y confidencial. Queda estrictamente prohibida cualquier copia, modificación, distribución o uso no autorizado sin el permiso expreso por escrito del titular de los derechos de autor.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request
