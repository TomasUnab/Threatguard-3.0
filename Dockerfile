# ThreatGuard - Dockerfile para API y ML
FROM python:3.11-slim

# Etiquetas de metadatos
LABEL maintainer="ThreatGuard Team"
LABEL version="1.0.0"
LABEL description="ThreatGuard AI-powered Cybersecurity API"

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# Instalar dependencias del sistema y tshark
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    wget \
    git \
    tshark \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Crear directorio de trabajo
WORKDIR /app

# Crear usuario no-root para seguridad
RUN groupadd -r threatguard && \
    useradd -r -g threatguard -d /app -s /sbin/nologin threatguard

# Copiar archivos de requisitos primero (para cachear layers)
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Crear directorios necesarios, incluyendo logs/Alamacenamiento y logs/features
RUN mkdir -p /app/models \
             /app/data \
             /app/logs/Alamacenamiento \
             /app/logs/features \
             /app/config \
             /app/scripts \
             /app/src && \
    chown -R threatguard:threatguard /app

# Copiar código fuente
COPY --chown=threatguard:threatguard . .

# Crear directorios para datos persistentes
VOLUME ["/app/data", "/app/models", "/app/logs"]

# Exponer puertos
EXPOSE 8000
EXPOSE 8001

# Script de salud
COPY --chown=threatguard:threatguard healthcheck.py /app/healthcheck.py

RUN chmod +x /app/healthcheck.py

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python /app/healthcheck.py

# Script de inicio modificado para usar el modelo más reciente
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "🚀 Starting ThreatGuard API..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "[PCAP Watcher] Ejecutando watcher de .pcap en segundo plano..."' >> /app/start.sh && \
    echo 'python /app/scripts/pcap_to_features.py &' >> /app/start.sh && \
    echo '# Archivos en /app/models:' >> /app/start.sh && \
    echo 'ls -l /app/models' >> /app/start.sh && \
    echo '# Buscar el modelo más reciente' >> /app/start.sh && \
    echo 'latest_model=$(ls -t /app/models/threatguard_model_*.pkl 2>/dev/null | head -n 1)' >> /app/start.sh && \
    echo 'echo "Modelo detectado por patrón: $latest_model"' >> /app/start.sh && \
    echo 'if [ -z "$latest_model" ]; then' >> /app/start.sh && \
    echo '    echo "⚠️  No se encontró modelo ML. Esperando subida de modelo..."' >> /app/start.sh && \
    echo '    echo "📤 Sube un modelo desde: http://localhost:8080/settings/code.html"' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '    echo "✅ Modelo encontrado: $latest_model"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "🌟 Iniciando ThreatGuard API en puerto 8000..."' >> /app/start.sh && \
    echo 'exec uvicorn threatguard_api:app \\' >> /app/start.sh && \
    echo '    --host 0.0.0.0 \\' >> /app/start.sh && \
    echo '    --port 8000 \\' >> /app/start.sh && \
    echo '    --workers 4 \\' >> /app/start.sh && \
    echo '    --log-level info \\' >> /app/start.sh && \
    echo '    --access-log \\' >> /app/start.sh && \
    echo '    --use-colors' >> /app/start.sh && \
    chmod +x /app/start.sh

# Cambiar a usuario no-root
USER threatguard

# Comando por defecto
CMD ["/app/start.sh"]