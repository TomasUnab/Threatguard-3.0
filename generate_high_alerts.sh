#!/bin/bash
echo "🔥 GENERANDO ALERTAS DE ALTA PRIORIDAD PARA THREATGUARD"
echo "========================================================"

# PostgreSQL Brute Force Attack (Priority: 1 = ALTA)
echo ""
echo "📊 [1/3] Generando PostgreSQL Brute Force Attack..."
echo "    Requiere: 5+ conexiones en 60 segundos"
for i in {1..8}; do
    echo "    Intento $i/8..."
    timeout 1 bash -c "</dev/tcp/172.18.0.2/5432" 2>/dev/null || true
    sleep 7
done
echo "    ✅ PostgreSQL Brute Force completado"

# HTTP Flood Attack (Priority: 1 = ALTA)
echo ""
echo "🌐 [2/3] Generando HTTP Flood Attack..."
echo "    Requiere: 100+ requests en 10 segundos"
for i in {1..120}; do
    curl -s http://172.18.0.9:8080 > /dev/null 2>&1 &
done
wait
echo "    ✅ HTTP Flood completado"

# SMB Brute Force Attack (Priority: 1 = ALTA)
echo ""
echo "🔒 [3/3] Generando SMB Brute Force Attack..."
echo "    Requiere: 5+ conexiones en 60 segundos"
for i in {1..8}; do
    echo "    Intento $i/8..."
    timeout 1 bash -c "</dev/tcp/172.18.0.2/445" 2>/dev/null || true
    sleep 7
done
echo "    ✅ SMB Brute Force completado"

echo ""
echo "========================================================"
echo "✅ TODAS LAS ALERTAS GENERADAS!"
echo ""
echo "📊 Espera 30 segundos y verifica:"
echo "   1. Dashboard: http://localhost:8080"
echo "   2. Logs: sudo docker logs threatguard-snort-integration --tail 50"
echo ""
echo "🔍 Deberías ver alertas con severidad ALTA en el dashboard"
echo "========================================================"
