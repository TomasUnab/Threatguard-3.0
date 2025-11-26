# -*- coding: utf-8 -*-
"""
Reclasificar alertas existentes de MEDIA a ALTA
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configurar conexión a base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")

print("=" * 60)
print("RECLASIFICANDO ALERTAS EN BASE DE DATOS")
print("=" * 60)

try:
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Reglas que ahora son BAJA prioridad (tráfico interno normal)
    low_priority_rules = [
        "Internet Traffic to Private IP - Possible Spoofing",
        "Possible C2 Beacon - Regular Outbound Traffic"
    ]
    
    print("\n1. Consultando alertas a reclasificar (MEDIA -> BAJA)...")
    
    # Contar alertas MEDIA que deberían ser BAJA
    for rule_title in low_priority_rules:
        query = text("""
            SELECT COUNT(*) 
            FROM alerts 
            WHERE title = :title 
            AND (severity = 'MEDIA' OR ai_classification = 'MEDIA')
        """)
        result = session.execute(query, {"title": rule_title}).scalar()
        print(f"   - {rule_title}: {result} alertas")
    
    # Total a reclasificar
    total_query = text("""
        SELECT COUNT(*) 
        FROM alerts 
        WHERE (
            title = 'Internet Traffic to Private IP - Possible Spoofing' OR
            title = 'Possible C2 Beacon - Regular Outbound Traffic'
        )
        AND (severity = 'MEDIA' OR ai_classification = 'MEDIA')
    """)
    total = session.execute(total_query).scalar()
    
    print(f"\nTotal alertas a reclasificar: {total}")
    
    if total == 0:
        print("\n[INFO] No hay alertas para reclasificar")
        sys.exit(0)
    
    print("\n2. Reclasificando alertas de MEDIA a BAJA...")
    
    # Actualizar severity y ai_classification
    update_query = text("""
        UPDATE alerts 
        SET 
            severity = 'BAJA',
            ai_classification = 'BAJA',
            updated_at = NOW()
        WHERE (
            title = 'Internet Traffic to Private IP - Possible Spoofing' OR
            title = 'Possible C2 Beacon - Regular Outbound Traffic'
        )
        AND (severity = 'MEDIA' OR ai_classification = 'MEDIA')
    """)
    
    result = session.execute(update_query)
    session.commit()
    
    print(f"[OK] {result.rowcount} alertas reclasificadas")
    
    # Verificar nuevos conteos
    print("\n3. Verificando nuevos conteos...")
    
    alta_query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'ALTA'")
    media_query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'MEDIA'")
    baja_query = text("SELECT COUNT(*) FROM alerts WHERE ai_classification = 'BAJA'")
    total_query = text("SELECT COUNT(*) FROM alerts")
    
    alta_count = session.execute(alta_query).scalar()
    media_count = session.execute(media_query).scalar()
    baja_count = session.execute(baja_query).scalar()
    total_count = session.execute(total_query).scalar()
    
    print(f"   - Alertas ALTA: {alta_count}")
    print(f"   - Alertas MEDIA: {media_count}")
    print(f"   - Alertas BAJA: {baja_count}")
    print(f"   - Total: {total_count}")
    
    print("\n" + "=" * 60)
    print("RECLASIFICACION COMPLETADA")
    print("=" * 60)
    print("\nActualiza el dashboard para ver los cambios:")
    print("  http://localhost:8080")
    print("=" * 60)
    
except Exception as e:
    print(f"\n[ERROR] {e}")
    sys.exit(1)
finally:
    session.close()
