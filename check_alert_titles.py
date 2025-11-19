# -*- coding: utf-8 -*-
"""
Verificar títulos de alertas en la base de datos
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("TOP 20 TITULOS DE ALERTAS MAS COMUNES")
print("=" * 60)

query = text("""
    SELECT title, ai_classification, COUNT(*) as count
    FROM alerts
    WHERE ai_classification = 'MEDIA'
    GROUP BY title, ai_classification
    ORDER BY count DESC
    LIMIT 20
""")

results = session.execute(query)

for row in results:
    print(f"{row.count:6d} | {row.ai_classification:5s} | {row.title}")

print("\n" + "=" * 60)

# Ver también las ALTA
print("\nALERTAS ALTA:")
query_alta = text("""
    SELECT title, COUNT(*) as count
    FROM alerts
    WHERE ai_classification = 'ALTA'
    GROUP BY title
    ORDER BY count DESC
    LIMIT 10
""")

results_alta = session.execute(query_alta)
for row in results_alta:
    print(f"{row.count:6d} | {row.title}")

session.close()
