# -*- coding: utf-8 -*-
"""
Generar escaneo agresivo para activar alerta ALTA
"""
import socket
import time
import threading
from datetime import datetime

TARGET = "98.84.174.81"
NUM_CONNECTIONS = 25  # Más de 20 para activar la regla

print("=" * 60)
print("GENERANDO ESCANEO AGRESIVO - ALERTA ALTA")
print("=" * 60)
print(f"\nTarget: {TARGET}")
print(f"Conexiones: {NUM_CONNECTIONS} en 10 segundos")
print("\nEsto generará: TCP SYN Port Scan Detected (ALTA)")
print("\nIniciando en 3 segundos...\n")

time.sleep(3)

print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Iniciando escaneo agresivo...")
print("=" * 60)

def scan_port(target, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        sock.connect_ex((target, port))
        sock.close()
    except:
        pass

# Lanzar múltiples conexiones simultáneas
threads = []
ports = list(range(20, 20 + NUM_CONNECTIONS))

start_time = time.time()

for port in ports:
    t = threading.Thread(target=scan_port, args=(TARGET, port))
    t.start()
    threads.append(t)
    print(f"  Conexión {len(threads)}/{NUM_CONNECTIONS}...", end="\r")
    time.sleep(0.3)  # Pequeña pausa entre lanzamientos

# Esperar a que terminen
for t in threads:
    t.join()

elapsed = time.time() - start_time

print(f"\n\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Escaneo completado")
print(f"  Tiempo: {elapsed:.1f} segundos")
print(f"  Conexiones: {NUM_CONNECTIONS}")

print("\n" + "=" * 60)
print("ESPERANDO DETECCIÓN...")
print("=" * 60)
print("\nEsperando 25 segundos para procesamiento...\n")

time.sleep(25)

print("Verificando alertas en base de datos...")

try:
    import os
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Contar ALTA
    query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
    alta_count = session.execute(query).scalar()
    
    # Últimas alertas ALTA
    query_recent = text("""
        SELECT title, timestamp, ai_classification
        FROM alerts 
        WHERE ai_classification = 'ALTA'
        ORDER BY timestamp DESC
        LIMIT 5
    """)
    recent = session.execute(query_recent)
    
    print(f"\n{'='*60}")
    print(f"TOTAL ALERTAS ALTA: {alta_count}")
    print(f"{'='*60}")
    print("\nÚltimas 5 alertas ALTA:")
    for row in recent:
        print(f"  [{row.ai_classification}] {row.title}")
        print(f"       {row.timestamp}")
    
    session.close()
    
except Exception as e:
    print(f"\n[ERROR] {e}")

print("\n" + "=" * 60)
print("VERIFICA EL DASHBOARD: http://localhost:8080")
print("=" * 60)
