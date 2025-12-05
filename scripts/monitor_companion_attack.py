# -*- coding: utf-8 -*-
"""
Monitorear ataque del compañero en tiempo real
"""
import subprocess
import time

COMPANION_IP = "201.215.209.20"

print("=" * 60)
print("MONITOREANDO ATAQUE DEL COMPAÑERO")
print("=" * 60)
print(f"IP del compañero: {COMPANION_IP}")
print("Esperando ataque...")
print("\nPresiona Ctrl+C para detener\n")

try:
    while True:
        # Ver alertas de Snort en tiempo real
        cmd = f'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort tail -50 /var/log/snort/alert | grep {COMPANION_IP}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout.strip():
            from datetime import datetime
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ALERTAS DETECTADAS:")
            print("=" * 60)
            print(result.stdout)
            print("=" * 60)
            
            # Verificar si hay alerta ALTA
            if "Priority: 1" in result.stdout:
                print("\n🎯 ALERTA ALTA DETECTADA!")
                print("Verificando en base de datos...\n")
                time.sleep(5)
                
                # Verificar en DB
                import os
                from sqlalchemy import create_engine, text
                from sqlalchemy.orm import sessionmaker
                
                DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
                engine = create_engine(DATABASE_URL)
                Session = sessionmaker(bind=engine)
                session = Session()
                
                query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
                alta_count = session.execute(query).scalar()
                
                print(f"Total Alertas ALTA: {alta_count}")
                print("\nVerifica el dashboard: http://localhost:8080")
                session.close()
                break
        else:
            print(".", end="", flush=True)
        
        time.sleep(2)
        
except KeyboardInterrupt:
    print("\n\nMonitoreo detenido")
