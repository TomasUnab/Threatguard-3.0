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
git clone https://github.com/TomasUnab/Threatguard-3.0.git
cd Threatguard-3.0
```

### 2. Instalar dependencias

```bash
# Servidor principal
pip install -r requirements.txt

# Agente
pip install -r requirements-agent.txt

# Cliente del agente
pip install -r requirements-agent-client.txt
```

### 3. Inicializar la base de datos

```bash
python scripts/init_database.py
```

### 4. Descargar modelos (opcional)

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

Copyright © 2025 ThreatGuard. Todos los derechos reservados.

Este software es propietario y confidencial. Queda estrictamente prohibida cualquier copia, modificación, distribución o uso no autorizado sin el permiso expreso por escrito del titular de los derechos de autor.
