# -*- coding: utf-8 -*-
"""
Ver alertas del compañero
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

COMPANION_IP = "201.215.209.20"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print(f"ALERTAS DEL COMPANERO: {COMPANION_IP}")
print("=" * 60)

# Alertas del compañero
query = text("""
    SELECT 
        timestamp,
        ai_classification,
        title
    FROM alerts
    WHERE raw_data->>'source_ip' = :ip
    ORDER BY timestamp DESC
    LIMIT 20
""")

results = session.execute(query, {"ip": COMPANION_IP})

count = 0
for row in results:
    count += 1
    print(f"\n[{row.timestamp}]")
    print(f"  [{row.ai_classification}] {row.title}")

print("\n" + "=" * 60)
print(f"Total alertas de {COMPANION_IP}: {count}")

# Contar por prioridad
query_count = text("""
    SELECT ai_classification, COUNT(*) as count
    FROM alerts
    WHERE raw_data->>'source_ip' = :ip
    GROUP BY ai_classification
""")

results = session.execute(query_count, {"ip": COMPANION_IP})
print("\nPor prioridad:")
for row in results:
    print(f"  {row.ai_classification}: {row.count}")

session.close()
