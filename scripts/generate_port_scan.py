# -*- coding: utf-8 -*-
"""
Generar Port Scan para activar alerta ALTA
"""
import socket
import time
from datetime import datetime

TARGET = "98.84.174.81"
PORTS = range(1, 26)  # Escanear puertos 1-25

print("=" * 60)
print("GENERANDO PORT SCAN - ALERTA ALTA")
print("=" * 60)
print(f"\nTarget: {TARGET}")
print(f"Puertos: {PORTS.start}-{PORTS.stop-1}")
print("\nEsto generará: TCP SYN Port Scan Detected (ALTA)")
print("\nPresiona Ctrl+C para cancelar en 3 segundos...\n")

try:
    time.sleep(3)
except KeyboardInterrupt:
    print("\nCancelado")
    exit(0)

print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Iniciando port scan...")
print("=" * 60)

open_ports = []
closed_ports = 0

for port in PORTS:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        result = sock.connect_ex((TARGET, port))
        
        if result == 0:
            print(f"  Puerto {port:5d} - ABIERTO")
            open_ports.append(port)
        else:
            closed_ports += 1
            if closed_ports % 5 == 0:
                print(f"  Escaneados {closed_ports + len(open_ports)}/{len(PORTS)} puertos...", end="\r")
        
        sock.close()
        time.sleep(0.1)  # Pequeña pausa entre conexiones
        
    except socket.error:
        closed_ports += 1
    except KeyboardInterrupt:
        print("\n\nEscaneo interrumpido")
        break

print("\n\n" + "=" * 60)
print("PORT SCAN COMPLETADO")
print("=" * 60)
print(f"\nPuertos abiertos encontrados: {len(open_ports)}")
if open_ports:
    print(f"  {open_ports}")
print(f"Puertos cerrados: {closed_ports}")
print(f"Total escaneado: {len(open_ports) + closed_ports}")

print("\n" + "=" * 60)
print("ESPERANDO PROCESAMIENTO DE ALERTA...")
print("=" * 60)
print("\nEsperando 20 segundos para que Snort detecte y procese...")

time.sleep(20)

print("\nVerificando alertas...")

try:
    import os
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Contar alertas ALTA
    query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
    alta_count = session.execute(query).scalar()
    
    # Buscar alerta de Port Scan
    query_scan = text("""
        SELECT title, timestamp 
        FROM alerts 
        WHERE title LIKE '%Port Scan%'
        ORDER BY timestamp DESC
        LIMIT 3
    """)
    scans = session.execute(query_scan)
    
    print(f"\nTotal Alertas ALTA: {alta_count}")
    print("\nAlertas de Port Scan detectadas:")
    print("-" * 60)
    found = False
    for row in scans:
        print(f"  {row.timestamp} | {row.title}")
        found = True
    
    if not found:
        print("  (Ninguna detectada aún - puede tomar más tiempo)")
    
    session.close()
    
except Exception as e:
    print(f"\n[INFO] {e}")

print("\n" + "=" * 60)
print("Verifica el dashboard: http://localhost:8080")
print("El contador de ALTA debería haber aumentado")
print("=" * 60)
