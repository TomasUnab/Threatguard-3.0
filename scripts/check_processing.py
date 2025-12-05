# -*- coding: utf-8 -*-
"""
Verificar si el procesamiento está funcionando
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("DIAGNOSTICO DE PROCESAMIENTO")
print("=" * 60)

# 1. Total alertas ALTA
query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
total_alta = session.execute(query).scalar()
print(f"\n1. Total Alertas ALTA en DB: {total_alta}")

# 2. Últimas 5 alertas ALTA
query = text("""
    SELECT timestamp, title, raw_data->>'source_ip' as ip
    FROM alerts 
    WHERE ai_classification = 'ALTA'
    ORDER BY timestamp DESC
    LIMIT 5
""")
print("\n2. Últimas 5 Alertas ALTA:")
print("-" * 60)
results = session.execute(query)
for row in results:
    print(f"  [{row.timestamp}] {row.title} - IP: {row.ip}")

# 3. Alertas en los últimos 5 minutos
query = text("""
    SELECT COUNT(*) 
    FROM alerts 
    WHERE timestamp > NOW() - INTERVAL '5 minutes'
""")
recent = session.execute(query).scalar()
print(f"\n3. Alertas en últimos 5 minutos: {recent}")

# 4. Alertas ALTA en últimos 5 minutos
query = text("""
    SELECT COUNT(*) 
    FROM alerts 
    WHERE ai_classification = 'ALTA'
    AND timestamp > NOW() - INTERVAL '5 minutes'
""")
recent_alta = session.execute(query).scalar()
print(f"4. Alertas ALTA en últimos 5 minutos: {recent_alta}")

# 5. Verificar logs del contenedor snort-integration
print("\n5. Estado del contenedor snort-integration:")
print("-" * 60)

session.close()

import subprocess
cmd = 'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker logs --tail 20 threatguard-snort-integration 2>&1 | grep -E \'Alerta enviada|Error\'"'
result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
if result.stdout:
    print(result.stdout)
else:
    print("  (Sin logs recientes)")

print("\n" + "=" * 60)
