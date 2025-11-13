#!/bin/bash
# Monitor Snort alerts and send to ThreatGuard API

API_URL="${THREATGUARD_API_URL:-http://threatguard-api:8000}"
ALERT_FILE="/var/log/snort/alert_fast.txt"
LAST_LINE=0

echo "🔍 Iniciando monitor de alertas de Snort..."
echo "📡 API URL: $API_URL"
echo "📄 Archivo: $ALERT_FILE"

# Esperar a que la API esté disponible
echo "⏳ Esperando a que la API esté disponible..."
until curl -s "$API_URL/health" > /dev/null 2>&1; do
    echo "⏳ API no disponible, esperando 5s..."
    sleep 5
done
echo "✅ API disponible"

# Monitorear el archivo
tail -F "$ALERT_FILE" 2>/dev/null | while read -r line; do
    if [ -n "$line" ]; then
        # Parsear la alerta y enviar a la API
        timestamp=$(echo "$line" | grep -oP '^\d{2}/\d{2}-\d{2}:\d{2}:\d{2}\.\d+' || echo "")
        title=$(echo "$line" | grep -oP '"\K[^"]+' || echo "Snort Alert")
        priority=$(echo "$line" | grep -oP 'Priority:\s*\K\d+' || echo "2")
        protocol=$(echo "$line" | grep -oP '\{\K\w+' || echo "Unknown")
        
        # Mapear prioridad a severidad
        case "$priority" in
            0) severity="BAJA" ;;
            1) severity="ALTA" ;;
            2) severity="MEDIA" ;;
            *) severity="BAJA" ;;
        esac
        
        # Crear timestamp ISO
        iso_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S")
        
        # Crear JSON payload simple
        json_payload='{"source":"Snort IDS","severity":"'"$severity"'","title":"'"$title"'","description":"Alerta detectada por Snort","status":"open","raw_data":{"protocol":"'"$protocol"'"},"timestamp":"'"$iso_timestamp"'"}'
        
        # Enviar a la API
        http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/snort/alerts" \
            -H "Content-Type: application/json" \
            -d "$json_payload" 2>&1)
        
        if [ "$http_code" = "200" ]; then
            echo "✅ Alerta enviada: $title"
        else
            echo "❌ Error enviando alerta (HTTP $http_code)"
        fi
    fi
done
