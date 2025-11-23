"""
Sistema de Base de Datos de ThreatGuard
======================================

Manejo de conexiones, modelos y operaciones de base de datos:
- Configuración de SQLAlchemy
- Modelos de datos para alertas, vulnerabilidades, usuarios
- Operaciones CRUD básicas
- Migraciones y esquemas
- Pool de conexiones
"""

import os
from typing import Optional, Generator, Dict, Any, List
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func
import uuid

# Custom Types for Cross-Database Compatibility
class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value

# Base para modelos
Base = declarative_base()

class Alert(Base):
    """Modelo para alertas de seguridad."""
    
    __tablename__ = "alerts"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String(100), nullable=False)  # wazuh, openvas, manual
    severity = Column(String(20), nullable=False)  # high, medium, low
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    raw_data = Column(JSON, nullable=True)  # Datos originales

    
    # Clasificación por IA
    ai_classification = Column(String(100), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_processed_at = Column(DateTime, nullable=True)
    
    # Estado del alert
    status = Column(String(20), default="open")  # open, in_progress, resolved, false_positive
    assigned_to = Column(String(100), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Métricas
    detection_time = Column(DateTime, nullable=True)  # Tiempo de detección
    response_time = Column(DateTime, nullable=True)   # Tiempo de respuesta
    resolution_time = Column(DateTime, nullable=True) # Tiempo de resolución
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Vulnerability(Base):
    """Modelo para vulnerabilidades encontradas."""
    
    __tablename__ = "vulnerabilities"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    scan_id = Column(String(100), nullable=False)
    target_host = Column(String(255), nullable=False)
    target_port = Column(Integer, nullable=True)
    
    # Información de la vulnerabilidad
    cve_id = Column(String(20), nullable=True)
    cvss_score = Column(Float, nullable=True)
    severity = Column(String(20), nullable=False)
    vulnerability_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    
    # Datos técnicos
    service = Column(String(100), nullable=True)
    protocol = Column(String(20), nullable=True)
    raw_output = Column(Text, nullable=True)
    
    # Estado
    status = Column(String(20), default="open")  # open, patched, mitigated, false_positive
    priority = Column(Integer, default=0)  # 0-10, calculado por IA
    
    # Fechas
    discovered_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    patched_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ScanJob(Base):
    """Modelo para trabajos de escaneo."""
    
    __tablename__ = "scan_jobs"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    scan_type = Column(String(50), nullable=False)  # vulnerability, port, service
    targets = Column(JSON, nullable=False)  # Lista de targets
    
    # Configuración del escaneo
    config = Column(JSON, nullable=True)
    scan_profile = Column(String(100), nullable=True)
    
    # Estado y progreso
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)  # Porcentaje
    
    # Resultados
    vulnerabilities_found = Column(Integer, default=0)
    hosts_scanned = Column(Integer, default=0)
    
    # Tiempos
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Usuario que inició el escaneo
    created_by = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    """Modelo para usuarios del sistema."""
    
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    
    # Autenticación
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # Configuración de notificaciones
    email_notifications = Column(Boolean, default=True)
    slack_notifications = Column(Boolean, default=False)
    notification_preferences = Column(JSON, nullable=True)
    
    # Sesiones
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemMetric(Base):
    """Modelo para métricas del sistema."""
    
    __tablename__ = "system_metrics"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50), nullable=True)
    
    # Contexto adicional
    tags = Column(JSON, nullable=True)
    metric_metadata = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)

class ConfigurationItem(Base):
    """Modelo para configuración del sistema."""
    
    __tablename__ = "configurations"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    
    # Control de cambios
    created_by = Column(String(100), nullable=True)
    updated_by = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DatabaseManager:
    """Manager para operaciones de base de datos."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False  # Cambiar a True para debug SQL
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
    
    def create_tables(self):
        """Crear todas las tablas."""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_tables(self):
        """Eliminar todas las tablas (¡Cuidado!)."""
        Base.metadata.drop_all(bind=self.engine)
    
    def get_session(self) -> Generator[Session, None, None]:
        """Obtener sesión de base de datos."""
        session = self.SessionLocal()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def get_async_session(self):
        """Obtener sesión asíncrona (para uso futuro)."""
        session = self.SessionLocal()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

class AlertRepository:
    """Repositorio para operaciones con alertas."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_alert(self, alert_data: Dict[str, Any]) -> Alert:
        """Crear nueva alerta."""
        alert = Alert(**alert_data)
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert
    
    def get_alert_by_id(self, alert_id: str) -> Optional[Alert]:
        """Obtener alerta por ID."""
        return self.db.query(Alert).filter(Alert.id == alert_id).first()
    
    def get_alerts_by_severity(self, severity: str, limit: int = 100) -> List[Alert]:
        """Obtener alertas por severidad."""
        return self.db.query(Alert)\
            .filter(Alert.severity == severity)\
            .order_by(Alert.timestamp.desc())\
            .limit(limit)\
            .all()
    
    def get_open_alerts(self, limit: int = 100) -> List[Alert]:
        """Obtener alertas abiertas."""
        from sqlalchemy import case
        severity_order = case(
            (Alert.ai_classification == 'ALTA', 1),
            (Alert.ai_classification == 'MEDIA', 2),
            (Alert.ai_classification == 'BAJA', 3),
            else_=4
        )
        return self.db.query(Alert)\
            .filter(Alert.status == "open")\
            .order_by(severity_order, Alert.timestamp.desc())\
            .limit(limit)\
            .all()
    
    def update_alert_status(self, alert_id: str, status: str, notes: str = None) -> bool:
        """Actualizar estado de alerta."""
        alert = self.get_alert_by_id(alert_id)
        if alert:
            alert.status = status
            if notes:
                alert.resolution_notes = notes
            if status == "resolved":
                alert.resolved_at = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def get_alerts_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de alertas."""
        total_alerts = self.db.query(Alert).count()
        open_alerts = self.db.query(Alert).filter(Alert.status == "open").count()
        high_severity = self.db.query(Alert).filter(Alert.severity == "high").count()
        
        # MTTD y MTTR
        resolved_alerts = self.db.query(Alert)\
            .filter(Alert.status == "resolved")\
            .filter(Alert.resolution_time.isnot(None))\
            .all()
        
        if resolved_alerts:
            avg_detection_time = sum([
                (alert.detection_time - alert.timestamp).total_seconds() 
                for alert in resolved_alerts if alert.detection_time
            ]) / len(resolved_alerts)
            
            avg_resolution_time = sum([
                (alert.resolution_time - alert.detection_time).total_seconds() 
                for alert in resolved_alerts 
                if alert.detection_time and alert.resolution_time
            ]) / len([a for a in resolved_alerts if a.detection_time and a.resolution_time])
        else:
            avg_detection_time = 0
            avg_resolution_time = 0
        
        return {
            "total_alerts": total_alerts,
            "open_alerts": open_alerts,
            "high_severity_alerts": high_severity,
            "mttd_seconds": avg_detection_time,
            "mttr_seconds": avg_resolution_time
        }

def get_database_url() -> str:
    """Obtener URL de base de datos desde configuración."""
    return os.getenv("DATABASE_URL", "postgresql://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db")

# Instancia global del database manager
db_manager = DatabaseManager(get_database_url())

def get_db() -> Generator[Session, None, None]:
    """Dependency para obtener sesión de base de datos."""
    return db_manager.get_session()

def init_database():
    """Inicializar base de datos."""
    db_manager.create_tables()
    print("✓ Base de datos inicializada correctamente")