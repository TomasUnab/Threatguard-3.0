# -*- coding: utf-8 -*-
"""
Generar ataque de prueba que active alertas ALTA
"""
import subprocess
import time

TARGET = "98.84.174.81"

print("=" * 60)
print("GENERANDO ATAQUE DE PRUEBA - ALERTAS ALTA")
print("=" * 60)
print(f"\nTarget: {TARGET}")
print("\nEste script generará un SSH Brute Force (ALTA)")
print("Presiona Ctrl+C para cancelar en 3 segundos...\n")

try:
    time.sleep(3)
except KeyboardInterrupt:
    print("\nCancelado")
    exit(0)

print("\n1. Generando SSH Brute Force Attack...")
print("   (6 intentos de conexión SSH en 60 segundos)\n")

# Generar 6 intentos SSH rápidos
for i in range(1, 7):
    print(f"   Intento {i}/6...", end=" ", flush=True)
    cmd = f'ssh -o ConnectTimeout=1 -o StrictHostKeyChecking=no test@{TARGET}'
    subprocess.run(cmd, shell=True, capture_output=True, timeout=2)
    print("OK")
    time.sleep(1)

print("\n" + "=" * 60)
print("ATAQUE COMPLETADO")
print("=" * 60)
print("\nEsperando 15 segundos para que se procese...")

time.sleep(15)

print("\nVerificando alertas generadas...")
print("=" * 60)

# Verificar en base de datos
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
    
    # Ver últimas 5 alertas ALTA
    query_recent = text("""
        SELECT title, timestamp 
        FROM alerts 
        WHERE ai_classification = 'ALTA'
        ORDER BY timestamp DESC
        LIMIT 5
    """)
    recent = session.execute(query_recent)
    
    print(f"\nTotal Alertas ALTA: {alta_count}")
    print("\nÚltimas 5 alertas ALTA:")
    print("-" * 60)
    for row in recent:
        print(f"  {row.timestamp} | {row.title}")
    
    session.close()
    
    print("\n" + "=" * 60)
    print("Verifica el dashboard: http://localhost:8080")
    print("=" * 60)
    
except Exception as e:
    print(f"\n[INFO] No se pudo verificar en DB: {e}")
    print("\nVerifica manualmente el dashboard: http://localhost:8080")
