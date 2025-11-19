import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Alertas del compañero desde las 22:10
query = text("""
    SELECT COUNT(*) 
    FROM alerts 
    WHERE raw_data->>'source_ip' = '201.215.209.20'
    AND timestamp >= '2025-11-19 22:10:00'
""")
count = session.execute(query).scalar()
print(f"Alertas del compañero desde 22:10: {count}")

# Total ALTA actual
query2 = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
total = session.execute(query2).scalar()
print(f"Total ALTA en DB: {total}")

session.close()
