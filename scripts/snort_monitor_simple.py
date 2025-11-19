#!/usr/bin/env python3
import os
import time
import requests
import json
from datetime import datetime

API_URL = os.getenv("THREATGUARD_API_URL", "http://threatguard-api:8000")
ALERT_FILE = "/var/log/snort/alert_fast.txt"

print("🔍 Iniciando monitor de alertas de Snort...")
print(f"📡 API URL: {API_URL}")

# Esperar a que la API esté disponible
while True:
    try:
        r = requests.get(f"{API_URL}/health", timeout=5)
        if r.status_code == 200:
            print("✅ API disponible")
            break
    except:
        print("⏳ Esperando API...")
        time.sleep(5)

# Leer posición inicial
last_pos = 0
if os.path.exists(ALERT_FILE):
    with open(ALERT_FILE, 'r') as f:
        f.seek(0, 2)  # Ir al final
        last_pos = f.tell()

# Monitorear archivo
while True:
    try:
        if not os.path.exists(ALERT_FILE):
            time.sleep(1)
            continue
            
        with open(ALERT_FILE, 'r') as f:
            f.seek(last_pos)
            lines = f.readlines()
            last_pos = f.tell()
            
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Parsear prioridad
            priority = "2"
            if "Priority: 0" in line:
                priority = "0"
            elif "Priority: 1" in line:
                priority = "1"
                
            # Mapear severidad
            severity_map = {"0": "BAJA", "1": "ALTA", "2": "MEDIA"}
            severity = severity_map.get(priority, "BAJA")
            
            # Extraer título
            title = "Snort Alert"
            if '"' in line:
                parts = line.split('"')
                if len(parts) >= 2:
                    title = parts[1]
            
            # Crear payload
            payload = {
                "source": "Snort IDS",
                "severity": severity,
                "title": title,
                "description": "Alerta detectada por Snort",
                "status": "open",
                "ai_classification": severity,
                "raw_data": {"raw_alert": line}
            }
            
            # Enviar a API
            try:
                r = requests.post(f"{API_URL}/snort/alerts", json=payload, timeout=10)
                if r.status_code == 200:
                    print(f"✅ Alerta enviada: {title}")
                else:
                    print(f"❌ Error {r.status_code}: {r.text[:100]}")
            except Exception as e:
                print(f"❌ Error: {e}")
                
        time.sleep(1)
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(5)
