#!/bin/bash
# Script de limpieza rápida para ThreatGuard 3.0 (Linux/Mac)
# Ejecuta la limpieza de logs antiguos vía API

API_URL="${API_URL:-http://localhost:8000}"

echo "============================================================"
echo "  LIMPIEZA DE LOGS - ThreatGuard 3.0"
echo "============================================================"
echo

# Verificar conexión API
echo "[1/3] Verificando API..."
if ! curl -sf "${API_URL}/health" > /dev/null 2>&1; then
    echo "[ERROR] API no responde en ${API_URL}"
    echo "Asegúrate de que los contenedores estén corriendo:"
    echo "   docker-compose up -d"
    exit 1
fi
echo "[OK] API respondiendo correctamente"
echo

# Mostrar estadísticas antes
echo "[2/3] Estadísticas ANTES de la limpieza:"
curl -s "${API_URL}/dashboard/stats" | jq '.'
echo

# Ejecutar limpieza
echo "[3/3] Ejecutando limpieza..."
echo
curl -X POST "${API_URL}/maintenance/cleanup?days_closed=30&days_open=90&days_low=7&days_benign=3" | jq '.'
echo

echo "============================================================"
echo "  LIMPIEZA COMPLETADA"
echo "============================================================"
echo
echo "Para ver estadísticas actualizadas:"
echo "   curl ${API_URL}/dashboard/stats | jq '.'"
echo
