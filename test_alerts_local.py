#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generar alertas de ALTA prioridad en ThreatGuard
Ejecutar desde tu maquina local con el tunel SSH activo
"""
import socket
import time
import requests
from concurrent.futures import ThreadPoolExecutor

print("GENERANDO ALERTAS DE ALTA PRIORIDAD")
print("=" * 60)

# PostgreSQL Brute Force (Priority: 1 = ALTA)
print("\n[1/3] PostgreSQL Brute Force Attack...")
print("    Generando 8 intentos de conexion al puerto 5432...")
for i in range(8):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect(('localhost', 5432))
        s.close()
    except:
        pass
    print(f"    Intento {i+1}/8")
    time.sleep(7)
print("    Completado")

# HTTP Flood (Priority: 1 = ALTA)
print("\n[2/3] HTTP Flood Attack...")
print("    Generando 120 requests HTTP...")
def make_request(i):
    try:
        requests.get('http://localhost:8080', timeout=2)
    except:
        pass
    
with ThreadPoolExecutor(max_workers=50) as executor:
    executor.map(make_request, range(120))
print("    Completado")

# SMB Brute Force (Priority: 1 = ALTA)
print("\n[3/3] SMB Brute Force Attack...")
print("    Generando 8 intentos de conexion al puerto 445...")
for i in range(8):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect(('localhost', 445))
        s.close()
    except:
        pass
    print(f"    Intento {i+1}/8")
    time.sleep(7)
print("    Completado")

print("\n" + "=" * 60)
print("TODAS LAS ALERTAS GENERADAS!")
print("\nEspera 30 segundos y verifica:")
print("   Dashboard: http://localhost:8080")
print("\nDeberias ver alertas con severidad ALTA")
print("=" * 60)
