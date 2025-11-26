# -*- coding: utf-8 -*-
"""
Monitorear ataque del compañero en tiempo real
"""
import subprocess
import time
from datetime import datetime

COMPANION_IP = "201.215.209.20"

print("=" * 60)
print("MONITOREANDO IP: " + COMPANION_IP)
print("=" * 60)
print("\nEsperando ataque... (Presiona Ctrl+C para detener)\n")

last_alert_count = 0

try:
    while True:
        # Ver alertas de Snort
        cmd = f'ssh -i "ICF233.pem" ubuntu@98.84.174.81 "sudo docker exec threatguard-snort grep {COMPANION_IP} /var/log/snort/alert | tail -10"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.stdout.strip():
            lines = result.stdout.strip().split('\n')
            current_count = len(lines)
            
            if current_count != last_alert_count:
                print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {current_count} alertas detectadas")
                print("-" * 60)
                
                # Mostrar últimas 3 alertas
                for line in lines[-3:]:
                    if "Priority: 1" in line:
                        print("[ALTA] " + line)
                    elif "Priority: 2" in line:
                        print("[MEDIA] " + line)
                    else:
                        print(line)
                
                last_alert_count = current_count
        else:
            print(".", end="", flush=True)
        
        time.sleep(2)
        
except KeyboardInterrupt:
    print("\n\n" + "=" * 60)
    print("RESUMEN FINAL")
    print("=" * 60)
    
    # Verificar en DB
    import os
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Total ALTA
    query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
    alta_count = session.execute(query).scalar()
    
    # Alertas del compañero
    query_comp = text("""
        SELECT COUNT(*) 
        FROM alerts 
        WHERE raw_data->>'source_ip' = :ip
    """)
    comp_count = session.execute(query_comp, {"ip": COMPANION_IP}).scalar()
    
    print(f"\nTotal Alertas ALTA: {alta_count}")
    print(f"Alertas de {COMPANION_IP}: {comp_count}")
    print("\nVerifica el dashboard: http://localhost:8080")
    print("=" * 60)
    
    session.close()
