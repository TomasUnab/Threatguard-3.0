#!/usr/bin/env python3
"""
Script de Inicialización de Base de Datos - ThreatGuard
========================================================

Verifica la conexión a PostgreSQL, crea las tablas necesarias
y opcionalmente inserta datos de prueba.

Uso:
    python scripts/init_database.py
    python scripts/init_database.py --test-data
    python scripts/init_database.py --drop-all  # ¡CUIDADO!
"""

import sys
import os
import argparse
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

import logging
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError

# Importar modelos y configuración
from src.utils.database import (
    Base, Alert, Vulnerability, ScanJob, User, SystemMetric, 
    ConfigurationItem, DatabaseManager, get_database_url
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_connection(database_url: str) -> bool:
    """Probar conexión a la base de datos."""
    logger.info("🔌 Probando conexión a PostgreSQL...")
    logger.info(f"📍 URL: {database_url.replace(database_url.split('@')[0].split('://')[1], '****')}")
    
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            logger.info(f"✅ Conexión exitosa!")
            logger.info(f"📊 PostgreSQL version: {version}")
            return True
    except OperationalError as e:
        logger.error(f"❌ Error de conexión: {e}")
        logger.error("💡 Verifica que PostgreSQL esté corriendo y las credenciales sean correctas")
        return False
    except Exception as e:
        logger.error(f"❌ Error inesperado: {e}")
        return False


def check_tables_exist(database_url: str) -> dict:
    """Verificar qué tablas existen."""
    logger.info("\n📋 Verificando tablas existentes...")
    
    try:
        engine = create_engine(database_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        expected_tables = [
            'alerts', 'vulnerabilities', 'scan_jobs', 
            'users', 'system_metrics', 'configurations'
        ]
        
        results = {}
        for table in expected_tables:
            exists = table in tables
            status = "✅" if exists else "❌"
            logger.info(f"{status} Tabla '{table}': {'EXISTE' if exists else 'NO EXISTE'}")
            results[table] = exists
        
        return results
    except Exception as e:
        logger.error(f"❌ Error verificando tablas: {e}")
        return {}


def create_all_tables(database_url: str, drop_existing: bool = False) -> bool:
    """Crear todas las tablas."""
    logger.info("\n🏗️  Creando tablas en la base de datos...")
    
    try:
        engine = create_engine(database_url, echo=False)
        
        if drop_existing:
            logger.warning("⚠️  ELIMINANDO TODAS LAS TABLAS EXISTENTES...")
            Base.metadata.drop_all(bind=engine)
            logger.info("🗑️  Tablas eliminadas")
        
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente!")
        
        # Verificar que se crearon
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        logger.info(f"📊 Total de tablas en la base de datos: {len(created_tables)}")
        
        for table in created_tables:
            logger.info(f"   - {table}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")
        return False


def insert_test_data(database_url: str) -> bool:
    """Insertar datos de prueba."""
    logger.info("\n🧪 Insertando datos de prueba...")
    
    try:
        from sqlalchemy.orm import sessionmaker
        
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Alerta de prueba
        test_alert = Alert(
            source="TEST",
            severity="🔴 ALTA",
            title="Alerta de Prueba - Configuración Inicial",
            description="Esta es una alerta de prueba para verificar que el sistema funciona correctamente.",
            status="open",
            ai_classification="Test",
            ai_confidence=1.0,
            raw_data={
                "test": True,
                "source_ip": "192.168.1.100",
                "destination_ip": "10.0.0.1",
                "protocol": "TCP",
                "port": 443
            },
            timestamp=datetime.utcnow()
        )
        
        db.add(test_alert)
        db.commit()
        db.refresh(test_alert)
        
        logger.info(f"✅ Alerta de prueba creada con ID: {test_alert.id}")
        
        # Métrica de prueba
        test_metric = SystemMetric(
            metric_name="system.initialized",
            metric_value=1.0,
            metric_unit="boolean",
            tags={"type": "initialization", "version": "1.0.0"},
            timestamp=datetime.utcnow()
        )
        
        db.add(test_metric)
        db.commit()
        
        logger.info("✅ Métrica de prueba creada")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Error insertando datos de prueba: {e}")
        return False


def show_summary(database_url: str):
    """Mostrar resumen del estado de la base de datos."""
    logger.info("\n" + "=" * 60)
    logger.info("📊 RESUMEN DEL ESTADO DE LA BASE DE DATOS")
    logger.info("=" * 60)
    
    try:
        from sqlalchemy.orm import sessionmaker
        
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Contar registros
        alert_count = db.query(Alert).count()
        vuln_count = db.query(Vulnerability).count()
        metric_count = db.query(SystemMetric).count()
        
        logger.info(f"📋 Alertas: {alert_count}")
        logger.info(f"🔒 Vulnerabilidades: {vuln_count}")
        logger.info(f"📊 Métricas: {metric_count}")
        
        # Última alerta
        if alert_count > 0:
            last_alert = db.query(Alert).order_by(Alert.timestamp.desc()).first()
            logger.info(f"\n🚨 Última alerta:")
            logger.info(f"   - ID: {last_alert.id}")
            logger.info(f"   - Título: {last_alert.title}")
            logger.info(f"   - Severidad: {last_alert.severity}")
            logger.info(f"   - Fecha: {last_alert.timestamp}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo resumen: {e}")


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description="Inicializar base de datos de ThreatGuard"
    )
    parser.add_argument(
        '--drop-all',
        action='store_true',
        help='Eliminar todas las tablas antes de crear (¡CUIDADO!)'
    )
    parser.add_argument(
        '--test-data',
        action='store_true',
        help='Insertar datos de prueba'
    )
    parser.add_argument(
        '--check-only',
        action='store_true',
        help='Solo verificar conexión y tablas, no crear nada'
    )
    
    args = parser.parse_args()
    
    logger.info("🛡️  THREATGUARD - Inicialización de Base de Datos")
    logger.info("=" * 60)
    
    # Obtener URL de la base de datos
    database_url = get_database_url()
    
    # Probar conexión
    if not test_connection(database_url):
        logger.error("\n❌ No se pudo conectar a la base de datos. Abortando.")
        sys.exit(1)
    
    # Verificar tablas existentes
    existing_tables = check_tables_exist(database_url)
    
    if args.check_only:
        logger.info("\n✅ Verificación completa. No se realizaron cambios.")
        return
    
    # Crear tablas si no existen
    all_exist = all(existing_tables.values()) if existing_tables else False
    
    if not all_exist or args.drop_all:
        if args.drop_all:
            response = input("\n⚠️  ¿Estás seguro de eliminar TODAS las tablas? (escribir 'SI' para confirmar): ")
            if response != 'SI':
                logger.info("❌ Operación cancelada")
                return
        
        if not create_all_tables(database_url, drop_existing=args.drop_all):
            logger.error("\n❌ Error creando tablas. Abortando.")
            sys.exit(1)
    else:
        logger.info("\n✅ Todas las tablas ya existen")
    
    # Insertar datos de prueba
    if args.test_data:
        insert_test_data(database_url)
    
    # Mostrar resumen
    show_summary(database_url)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ Inicialización completada exitosamente!")
    logger.info("=" * 60)
    logger.info("\n💡 Próximos pasos:")
    logger.info("   1. Inicia el backend: python threatguard_api.py")
    logger.info("   2. Prueba el endpoint: http://localhost:8000/health")
    logger.info("   3. Revisa la documentación: http://localhost:8000/docs")


if __name__ == "__main__":
    main()
