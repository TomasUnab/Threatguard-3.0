import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

alta = session.execute(text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")).scalar()
print(f"Total ALTA: {alta}")

# Alertas del compañero
comp = session.execute(text("SELECT COUNT(*) FROM alerts WHERE raw_data->>'source_ip' = '201.215.209.20' AND ai_classification = 'ALTA'")).scalar()
print(f"ALTA del compañero: {comp}")

session.close()
