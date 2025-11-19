# -*- coding: utf-8 -*-
"""
Ver últimas alertas en base de datos
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("ULTIMAS 10 ALERTAS EN BASE DE DATOS")
print("=" * 60)

query = text("""
    SELECT 
        timestamp,
        ai_classification,
        title,
        raw_data->>'source_ip' as source_ip
    FROM alerts
    ORDER BY timestamp DESC
    LIMIT 10
""")

results = session.execute(query)

for row in results:
    print(f"\n[{row.timestamp}]")
    print(f"  Prioridad: {row.ai_classification}")
    print(f"  Título: {row.title}")
    print(f"  IP Origen: {row.source_ip}")

print("\n" + "=" * 60)

# Contar por prioridad
query_count = text("""
    SELECT ai_classification, COUNT(*) as count
    FROM alerts
    GROUP BY ai_classification
    ORDER BY 
        CASE ai_classification
            WHEN 'ALTA' THEN 1
            WHEN 'MEDIA' THEN 2
            WHEN 'BAJA' THEN 3
        END
""")

print("\nCONTEO POR PRIORIDAD:")
print("-" * 60)
results = session.execute(query_count)
for row in results:
    print(f"  {row.ai_classification}: {row.count}")

session.close()
