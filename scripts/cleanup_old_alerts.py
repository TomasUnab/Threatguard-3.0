#!/usr/bin/env python3
"""
Script para limpiar alertas antiguas de la base de datos
Elimina logs históricos y alertas antiguas automáticamente
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def cleanup_old_alerts(dry_run=False):
    """Limpia alertas antiguas de la base de datos"""
    
    db_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")
    
    print("=" * 60)
    print("🧹 LIMPIEZA DE ALERTAS ANTIGUAS - ThreatGuard")
    print("=" * 60)
    print(f"Fecha: {datetime.now()}")
    print(f"Modo: {'DRY RUN (simulación)' if dry_run else 'EJECUCIÓN REAL'}")
    print("-" * 60)
    
    try:
        engine = create_engine(db_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Calcular fechas
        now = datetime.now()
        date_30_days = now - timedelta(days=30)
        date_90_days = now - timedelta(days=90)
        date_7_days = now - timedelta(days=7)
        date_3_days = now - timedelta(days=3)
        date_60_days = now - timedelta(days=60)
        
        # Contar antes de eliminar
        print("\n📊 Estado ANTES de la limpieza:")
        result = session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as abiertas,
                COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as cerradas,
                COUNT(*) FILTER (WHERE ai_classification = 'BAJA' OR severity = 'BAJA') as bajas,
                COUNT(*) FILTER (WHERE ai_classification = 'BENIGNO' OR severity = 'BENIGNO') as benignas
            FROM alerts
        """))
        stats = result.fetchone()
        print(f"  Total alertas: {stats[0]}")
        print(f"  Abiertas: {stats[1]}")
        print(f"  Cerradas: {stats[2]}")
        print(f"  Baja prioridad: {stats[3]}")
        print(f"  Benignas: {stats[4]}")
        
        if dry_run:
            print("\n🔍 Contando alertas a eliminar (DRY RUN):")
            
            # Contar cada tipo
            queries = [
                ("Cerradas > 30 días", f"SELECT COUNT(*) FROM alerts WHERE status IN ('resolved', 'closed', 'false_positive') AND timestamp < '{date_30_days}'"),
                ("Abiertas > 90 días", f"SELECT COUNT(*) FROM alerts WHERE status = 'open' AND timestamp < '{date_90_days}'"),
                ("Baja prioridad > 7 días", f"SELECT COUNT(*) FROM alerts WHERE (ai_classification = 'BAJA' OR severity = 'BAJA') AND timestamp < '{date_7_days}'"),
                ("Benignas > 3 días", f"SELECT COUNT(*) FROM alerts WHERE (ai_classification = 'BENIGNO' OR severity = 'BENIGNO') AND timestamp < '{date_3_days}'"),
            ]
            
            total_to_delete = 0
            for desc, query in queries:
                count = session.execute(text(query)).scalar()
                print(f"  {desc}: {count}")
                total_to_delete += count
            
            print(f"\n  TOTAL A ELIMINAR: {total_to_delete} alertas")
            print("\n⚠️  Para ejecutar la limpieza real, ejecute sin --dry-run")
            
        else:
            print("\n🗑️  Eliminando alertas antiguas...")
            
            # 1. Cerradas > 30 días
            result = session.execute(text("""
                DELETE FROM alerts 
                WHERE status IN ('resolved', 'closed', 'false_positive')
                AND timestamp < :date
            """), {"date": date_30_days})
            count1 = result.rowcount
            print(f"  ✓ Eliminadas {count1} alertas cerradas > 30 días")
            
            # 2. Abiertas > 90 días
            result = session.execute(text("""
                DELETE FROM alerts 
                WHERE status = 'open'
                AND timestamp < :date
            """), {"date": date_90_days})
            count2 = result.rowcount
            print(f"  ✓ Eliminadas {count2} alertas abiertas > 90 días")
            
            # 3. Baja prioridad > 7 días
            result = session.execute(text("""
                DELETE FROM alerts 
                WHERE (ai_classification = 'BAJA' OR severity = 'BAJA')
                AND timestamp < :date
            """), {"date": date_7_days})
            count3 = result.rowcount
            print(f"  ✓ Eliminadas {count3} alertas de baja prioridad > 7 días")
            
            # 4. Benignas > 3 días
            result = session.execute(text("""
                DELETE FROM alerts 
                WHERE (ai_classification = 'BENIGNO' OR severity = 'BENIGNO')
                AND timestamp < :date
            """), {"date": date_3_days})
            count4 = result.rowcount
            print(f"  ✓ Eliminadas {count4} alertas benignas > 3 días")
            
            # 5. Métricas antiguas
            try:
                result = session.execute(text("""
                    DELETE FROM system_metrics 
                    WHERE timestamp < :date
                """), {"date": date_60_days})
                count5 = result.rowcount
                print(f"  ✓ Eliminadas {count5} métricas del sistema > 60 días")
            except Exception as e:
                print(f"  ⚠️  No se pudieron eliminar métricas: {e}")
            
            session.commit()
            
            total_deleted = count1 + count2 + count3 + count4
            print(f"\n✅ TOTAL ELIMINADO: {total_deleted} alertas")
        
        # Mostrar estado final
        print("\n📊 Estado DESPUÉS de la limpieza:")
        result = session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'open') as abiertas,
                COUNT(*) FILTER (WHERE ai_classification = 'ALTA') as altas,
                COUNT(*) FILTER (WHERE ai_classification = 'MEDIA') as medias,
                MIN(timestamp) as mas_antigua,
                MAX(timestamp) as mas_reciente
            FROM alerts
        """))
        stats = result.fetchone()
        print(f"  Total alertas: {stats[0]}")
        print(f"  Abiertas: {stats[1]}")
        print(f"  Alta prioridad: {stats[2]}")
        print(f"  Media prioridad: {stats[3]}")
        if stats[4]:
            print(f"  Alerta más antigua: {stats[4]}")
        if stats[5]:
            print(f"  Alerta más reciente: {stats[5]}")
        
        session.close()
        print("\n" + "=" * 60)
        print("✅ Limpieza completada exitosamente")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Limpiar alertas antiguas de ThreatGuard")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin eliminar datos")
    args = parser.parse_args()
    
    sys.exit(cleanup_old_alerts(dry_run=args.dry_run))
