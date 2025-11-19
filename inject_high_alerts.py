# -*- coding: utf-8 -*-
"""
Inyectar alertas de ALTA prioridad directamente a la API de ThreatGuard
"""
import requests
import json
from datetime import datetime

API_URL = "http://localhost:8000"

alertas_alta = [
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "PostgreSQL Brute Force Attack Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54321 | Destino: 172.18.0.2:5432 | Rule ID: 1:1000016:1",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.95,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "HTTP Flood Attack Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54322 | Destino: 172.18.0.9:8080 | Rule ID: 1:1000041:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.98,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "SMB Brute Force Attack Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54323 | Destino: 172.18.0.2:445 | Rule ID: 1:1000013:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.92,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "SQL Injection - UNION Attack",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54324 | Destino: 172.18.0.9:8080 | Rule ID: 1:1000020:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.96,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "XSS Attack - Script Tag Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54325 | Destino: 172.18.0.9:8080 | Rule ID: 1:1000023:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.94,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "SSH Brute Force Attack Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54326 | Destino: 172.18.0.2:22 | Rule ID: 1:1000010:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.97,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "Reverse Shell Connection Detected",
        "description": "Protocolo: TCP | Origen: 172.18.0.2:54327 | Destino: 192.168.1.100:4444 | Rule ID: 1:1000050:1",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.99,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "ICMP Flood Attack Detected",
        "description": "Protocolo: ICMP | Origen: 192.168.1.100 | Destino: 172.18.0.2 | Rule ID: 1:1000001:2",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.93,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "Command Injection - PowerShell Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54328 | Destino: 172.18.0.9:8080 | Rule ID: 1:1000030:1",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.95,
        "timestamp": datetime.now().isoformat()
    },
    {
        "source": "Snort IDS",
        "severity": "ALTA",
        "title": "Ransomware - SMB Traffic Spike Detected",
        "description": "Protocolo: TCP | Origen: 192.168.1.100:54329 | Destino: 172.18.0.2:445 | Rule ID: 1:1000060:1",
        "status": "open",
        "ai_classification": "ALTA",
        "ai_confidence": 0.91,
        "timestamp": datetime.now().isoformat()
    }
]

print("INYECTANDO ALERTAS DE ALTA PRIORIDAD")
print("=" * 60)

exitosas = 0
fallidas = 0

for i, alerta in enumerate(alertas_alta, 1):
    try:
        response = requests.post(f"{API_URL}/snort/alerts", json=alerta, timeout=5)
        if response.status_code == 200:
            print(f"[{i}/10] OK - {alerta['title']}")
            exitosas += 1
        else:
            print(f"[{i}/10] ERROR {response.status_code} - {alerta['title']}")
            fallidas += 1
    except Exception as e:
        print(f"[{i}/10] ERROR - {alerta['title']}: {e}")
        fallidas += 1

print("=" * 60)
print(f"RESULTADO: {exitosas} exitosas, {fallidas} fallidas")
print("\nVerifica el dashboard en: http://localhost:8080")
print("=" * 60)
