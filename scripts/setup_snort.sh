#!/bin/bash
# Setup Snort 3 for ThreatGuard
# ==============================

echo "🛡️ Configurando Snort 3 para ThreatGuard..."

# Crear directorios necesarios
mkdir -p /var/log/snort
mkdir -p /usr/local/etc/snort/rules

# Descargar reglas comunitarias de Snort 3
echo "📥 Descargando reglas comunitarias de Snort 3..."
wget -O /tmp/snort3-community-rules.tar.gz https://www.snort.org/downloads/community/snort3-community-rules.tar.gz

if [ -f /tmp/snort3-community-rules.tar.gz ]; then
    tar -xzf /tmp/snort3-community-rules.tar.gz -C /usr/local/etc/snort/rules/ --strip-components=1
    echo "✅ Reglas comunitarias instaladas"
else
    echo "⚠️ No se pudieron descargar las reglas comunitarias"
fi

# Copiar configuración
cp config/local.rules /usr/local/etc/snort/rules/local.rules
cp config/snort.lua /usr/local/etc/snort/snort.lua

echo "✅ Snort 3 configurado correctamente"
echo ""
echo "Para iniciar Snort 3:"
echo "  docker-compose up -d snort"
echo ""
echo "Para ver alertas en tiempo real:"
echo "  docker-compose logs -f snort-integration"
