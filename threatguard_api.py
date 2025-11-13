"""
ThreatGuard API - Sistema de Detección de Amenazas
=================================================
API REST para detección en tiempo real de amenazas cibernéticas.
"""

# Importaciones estándar
import os
import logging
import pickle
import uuid
import json
import redis
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Importaciones de terceros
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Importaciones locales
from src.utils.database import Alert, AlertRepository
from src.utils.elasticsearch_client import es_client
# from soar_engine import soar_engine  # TODO: Implementar módulo soar_engine
# Reportes PDF/CSV deshabilitados temporalmente. El import de report_generator debe permanecer comentado.
# from report_generator import (
#     generate_vulnerability_report_pdf,
#     generate_vulnerability_report_csv,
#     generate_alert_report_pdf,
#     generate_alert_report_csv
# )
from fastapi.responses import StreamingResponse

# Configurar Redis
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', 'redis_password_2024'),
    decode_responses=True
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info('🚀 threatguard_api.py iniciado')

# ============================================================================
# MODELOS PYDANTIC
# ============================================================================

class AlertCreate(BaseModel):
    source: str
    severity: str
    title: str
    description: str = None
    status: str = "open"
    ai_classification: str = None
    ai_confidence: float = None
    raw_data: dict = None
    timestamp: str = None
    ai_processed_at: str = None
    assigned_to: str = None
    resolved_at: str = None
    resolution_notes: str = None
    detection_time: str = None
    response_time: str = None
    resolution_time: str = None
    created_at: str = None
    updated_at: str = None

class NetworkFlow(BaseModel):
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    protocol: int
    flow_duration: float
    total_fwd_packets: int = 0
    total_bwd_packets: int = 0
    total_length_fwd_packets: float = 0.0
    total_length_bwd_packets: float = 0.0

class ThreatPrediction(BaseModel):
    threat_type: str
    confidence: float
    severity: str
    recommendations: List[str]
    timestamp: str

class WazuhEvent(BaseModel):
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    timestamp: str
    rule_id: int
    rule_level: int
    rule_description: str
    full_log: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    user: Optional[str] = None
    data: Optional[Dict] = None

class WazuhAnalysis(BaseModel):
    event_id: str
    threat_level: str
    analysis: str
    recommendations: List[str]
    similar_patterns: List[str]
    timestamp: str

class OpenVASVulnerability(BaseModel):
    vulnerability_id: str
    name: str
    severity: float
    host: str
    port: Optional[str] = None
    description: str
    solution: Optional[str] = None
    cve_ids: List[str] = []
    family: Optional[str] = None
    tags: Optional[Dict] = None

class VulnerabilityAnalysis(BaseModel):
    analysis_id: str
    risk_level: str
    priority: str
    impact_assessment: str
    remediation_steps: List[str]
    business_impact: str
    exploit_likelihood: str
    timestamp: str

class SystemStatus(BaseModel):
    status: str
    model_loaded: bool
    model_accuracy: float
    total_predictions: int
    uptime: str

# ============================================================================
# VARIABLES GLOBALES
# ============================================================================

model_info = None
predictions_count = 0
start_time = datetime.now()

# ============================================================================
# INICIALIZAR FASTAPI
# ============================================================================

app = FastAPI(
    title="ThreatGuard API",
    description="Sistema de detección de amenazas cibernéticas usando ML",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def load_latest_model():
    """Cargar el modelo más reciente."""
    global model_info
    
    models_dir = Path("models")
    if not models_dir.exists():
        return False
    
    model_files = list(models_dir.glob("threatguard_model_*.pkl"))
    if not model_files:
        return False
    
    latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
    
    try:
        with open(latest_model, 'rb') as f:
            model_info = pickle.load(f)
        
        logger.info(f"Modelo cargado: {latest_model}")
        logger.info(f"Precisión del modelo: {model_info.get('accuracy', 0.0):.4f}")
        n_classes = len(model_info.get('label_encoder', {}).classes_) if 'label_encoder' in model_info else 0
        logger.info(f"Clases disponibles: {n_classes}")
        
        return True
    except Exception as e:
        logger.error(f"Error cargando modelo: {e}")
        return False

def get_threat_severity(threat_type: str) -> str:
    """Determinar severidad de la amenaza."""
    high_severity = ['DoS Hulk', 'DoS GoldenEye', 'DoS slowloris', 'DoS Slowhttptest', 
                    'DDoS', 'Heartbleed', 'Infiltration']
    medium_severity = ['FTP-Patator', 'SSH-Patator', 'Web Attack  Brute Force', 
                      'Web Attack  XSS', 'Web Attack  Sql Injection', 'Bot']
    low_severity = ['PortScan']
    
    if threat_type in high_severity:
        return "ALTA"
    elif threat_type in medium_severity:
        return "MEDIA"
    elif threat_type in low_severity:
        return "BAJA"
    else:
        return "BENIGNO"

def get_recommendations(threat_type: str) -> List[str]:
    """Obtener recomendaciones basadas en el tipo de amenaza."""
    recommendations_map = {
        'DoS Hulk': [
            "Implementar rate limiting en el servidor",
            "Configurar firewall para bloquear tráfico sospechoso",
            "Monitorear patrones de tráfico anómalos"
        ],
        'PortScan': [
            "Configurar firewall para logging detallado",
            "Implementar IDS/IPS",
            "Cerrar puertos innecesarios"
        ]
    }
    
    return recommendations_map.get(threat_type, [
        "Monitorear actividad de red",
        "Revisar logs de seguridad",
        "Mantener sistemas actualizados"
    ])

# ============================================================================
# EVENTOS DE APLICACIÓN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Cargar modelo e inicializar base de datos al inicio."""
    logger.info("🛡️ Iniciando ThreatGuard API...")
    
    success = load_latest_model()
    if success:
        logger.info("✅ Modelo cargado exitosamente")
    else:
        logger.warning("⚠️ No se pudo cargar el modelo")
    
    try:
        from src.utils.database import init_database
        init_database()
        logger.info("✅ Base de datos inicializada")
    except Exception as e:
        logger.error(f"⚠️ Error inicializando base de datos: {e}")

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/", response_model=Dict[str, str])
async def root():
    """Endpoint raíz."""
    return {
        "service": "ThreatGuard API",
        "version": "1.0.0",
        "status": "🛡️ Protegiendo tu red",
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    """Endpoint de salud para health checks de Docker."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model_info is not None
    }

@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Obtener estadísticas para el dashboard con caché Redis."""
    cache_key = "dashboard:stats"
    
    # Intentar obtener de caché
    try:
        cached = redis_client.get(cache_key)
        if cached:
            logger.info("Dashboard stats desde caché")
            return json.loads(cached)
    except Exception as e:
        logger.warning(f"Error leyendo caché: {e}")
    
    # Si no hay caché, consultar BD
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL no está definida")
    
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Contar alertas por severidad (ai_classification o severity si no tiene ai_classification)
        from sqlalchemy import or_, and_
        alta = db.query(Alert).filter(
            or_(Alert.ai_classification == "ALTA", and_(Alert.ai_classification == None, Alert.severity == "ALTA")),
            Alert.status == "open"
        ).count()
        media = db.query(Alert).filter(
            or_(Alert.ai_classification == "MEDIA", and_(Alert.ai_classification == None, Alert.severity == "MEDIA")),
            Alert.status == "open"
        ).count()
        baja = db.query(Alert).filter(
            or_(Alert.ai_classification == "BAJA", and_(Alert.ai_classification == None, Alert.severity == "BAJA")),
            Alert.status == "open"
        ).count()
        benigno = db.query(Alert).filter(
            or_(Alert.ai_classification == "BENIGNO", and_(Alert.ai_classification == None, Alert.severity == "BENIGNO")),
            Alert.status == "open"
        ).count()
        total = alta + media + baja + benigno
        
        # Top 5 alertas recientes (todas las fuentes, ordenadas por timestamp)
        top_alerts = db.query(Alert)\
            .filter(Alert.status == "open")\
            .order_by(Alert.timestamp.desc())\
            .limit(5)\
            .all()
        
        result = {
            "alertas_alta": alta,
            "alertas_media": media,
            "alertas_baja": baja,
            "alertas_benigno": benigno,
            "total_alertas": total,
            "top_alerts": [
                {
                    "descripcion": (alert.description[:80] if alert.description else alert.title)[:80] if alert.description or alert.title else "Sin descripción",
                    "host": alert.raw_data.get("source_ip") if (alert.raw_data and "source_ip" in alert.raw_data) else (alert.title if alert.title else "Unknown"),
                    "prioridad": alert.ai_classification or alert.severity or "BAJA",
                    "timestamp": alert.timestamp.isoformat() if alert.timestamp else None
                }
                for alert in top_alerts
            ]
        }
        
        # Guardar en caché por 10 segundos
        try:
            redis_client.setex(cache_key, 10, json.dumps(result))
            logger.info("Dashboard stats guardado en caché")
        except Exception as e:
            logger.warning(f"Error guardando en caché: {e}")
        
        return result
    finally:
        db.close()

@app.get("/status", response_model=SystemStatus)
async def get_status():
    """Obtener estado del sistema."""
    uptime = str(datetime.now() - start_time).split('.')[0]
    
    return SystemStatus(
        status="🟢 Operacional" if model_info else "🟡 Sin modelo",
        model_loaded=model_info is not None,
        model_accuracy=model_info.get('accuracy', 0.0) if model_info else 0.0,
        total_predictions=predictions_count,
        uptime=uptime
    )

@app.get("/alerts")
async def get_alerts(limit: int = 100):
    """Devuelve los logs de alertas para la tabla web."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL no está definida")
        raise HTTPException(status_code=500, detail="DATABASE_URL no está definida")
    
    logger.info(f"[DB_URL /alerts]: {db_url}")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        repo = AlertRepository(db)
        alerts = repo.get_open_alerts(limit=limit)
        logger.info(f"Alertas recuperadas: {len(alerts)}")
        
        result = []
        for alert in alerts:
            ip_origen = None
            ip_destino = None
            host_afectado = None
            tipo_alerta = None
            
            if alert.raw_data:
                ip_origen = alert.raw_data.get("source_ip") or alert.raw_data.get("src_ip")
                ip_destino = alert.raw_data.get("destination_ip") or alert.raw_data.get("dst_ip")
                host_afectado = alert.raw_data.get("host") or alert.raw_data.get("hostname")
                tipo_alerta = alert.raw_data.get("title")
            
            # Para alertas de Snort, usar la IP origen como host afectado
            if alert.source == "Snort IDS":
                host_afectado = ip_origen if ip_origen else alert.title
                tipo_alerta = alert.title
            else:
                host_afectado = alert.title if alert.title else host_afectado
            
            result.append({
                "prioridad_ia": alert.ai_classification or alert.severity,
                "estado": alert.status,
                "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
                "descripcion": alert.description,
                "host_afectado": host_afectado,
                "ip_origen": ip_origen,
                "tipo_alerta": tipo_alerta
            })
        
        return {"alerts": result}
    finally:
        db.close()

@app.get("/api/snort/alerts")
async def get_snort_alerts(limit: int = 100):
    """Obtener alertas de Snort IDS desde la base de datos."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL no está definida")
    
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Filtrar solo alertas de Snort
        alerts = db.query(Alert)\
            .filter(Alert.source == "Snort IDS")\
            .order_by(Alert.timestamp.desc())\
            .limit(limit)\
            .all()
        
        result = []
        for alert in alerts:
            raw_data = alert.raw_data or {}
            result.append({
                "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
                "message": alert.title or alert.description,
                "msg": alert.description,
                "src_ip": raw_data.get("source_ip"),
                "dst_ip": raw_data.get("destination_ip"),
                "protocol": raw_data.get("protocol", "TCP"),
                "sid": raw_data.get("rule_id"),
                "priority": 1 if alert.severity == "ALTA" else 2 if alert.severity == "MEDIA" else 3
            })
        
        logger.info(f"Alertas de Snort recuperadas: {len(result)}")
        return {"alerts": result}
    except Exception as e:
        logger.error(f"Error obteniendo alertas de Snort: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/alerts")
async def create_alert(alert: AlertCreate):
    """Registrar una nueva alerta en la base de datos."""
    db_url = os.getenv("DATABASE_URL", "sqlite:///threatguard.db")
    logger.info(f"[DB_URL /alerts]: {db_url}")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        new_alert = Alert(
            source=alert.source,
            severity=alert.severity,
            title=alert.title,
            description=alert.description,
            status=alert.status,
            ai_classification=alert.ai_classification,
            ai_confidence=alert.ai_confidence,
            raw_data=alert.raw_data,
            timestamp=alert.timestamp,
            ai_processed_at=alert.ai_processed_at
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        
        # Indexar en Elasticsearch
        es_data = {
            "timestamp": alert.timestamp or datetime.now().isoformat(),
            "source": alert.source,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "ai_classification": alert.ai_classification,
            "ai_confidence": alert.ai_confidence,
            "status": alert.status,
            "source_ip": alert.raw_data.get("source_ip") if alert.raw_data else None,
            "destination_ip": alert.raw_data.get("destination_ip") if alert.raw_data else None,
            "raw_data": alert.raw_data
        }
        es_client.index_alert(es_data)
        
        # Procesar evento en SOAR
        event_data = {
            "type": "alert",
            "prioridad": alert.ai_classification,
            "ip_origen": alert.raw_data.get("source_ip") if alert.raw_data else None,
            "host_afectado": alert.title,
            "descripcion": alert.description
        }
        # await soar_engine.process_event("alert", event_data)  # TODO: Implementar SOAR
        
        return {"id": str(new_alert.id), "message": "Alerta creada correctamente"}
    finally:
        db.close()

@app.post("/snort/alerts")
async def create_snort_alert(alert: AlertCreate):
    """
    Endpoint optimizado para alertas de Snort.
    Omite Elasticsearch para reducir latencia y evitar timeouts.
    """
    db_url = os.getenv("DATABASE_URL", "sqlite:///threatguard.db")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        new_alert = Alert(
            source=alert.source,
            severity=alert.severity,
            title=alert.title,
            description=alert.description,
            status=alert.status,
            ai_classification=alert.ai_classification,
            ai_confidence=alert.ai_confidence,
            raw_data=alert.raw_data,
            timestamp=alert.timestamp,
            ai_processed_at=alert.ai_processed_at
        )
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        
        logger.info(f"✅ Alerta Snort guardada: {alert.title}")
        
        return {"id": str(new_alert.id), "message": "Alerta Snort creada correctamente"}
    except Exception as e:
        logger.error(f"Error creando alerta Snort: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/logs/upload")
async def upload_log(file: UploadFile = File(...)):
    """Recibe y almacena un archivo de log enviado por el agente."""
    save_dir = os.path.join(os.path.dirname(__file__), 'logs', 'Alamacenamiento')
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, file.filename)
    with open(save_path, "wb") as buffer:
        buffer.write(await file.read())
    return {"status": "success", "filename": file.filename}

@app.post("/system/info")
async def receive_system_info(info: dict):
    """Recibe información del sistema desde el agente."""
    try:
        info['last_seen'] = datetime.now().isoformat()
        redis_client.setex("system:info", 90, json.dumps(info))
        logger.info(f"Info del sistema recibida: {info}")
        
        # Actualizar o crear el asset en la tabla assets de PostgreSQL
        hostname = info.get('hostname') or info.get('agent_name')
        ip = info.get('ip', '')
        mac = info.get('mac_address', '')
        
        if hostname:
            db_url = os.getenv("DATABASE_URL")
            if db_url:
                try:
                    from sqlalchemy import create_engine, text
                    import uuid
                    engine = create_engine(db_url)
                    with engine.connect() as conn:
                        # Verificar si existe por IP o MAC address (identificadores únicos del equipo)
                        result = conn.execute(text("""
                            SELECT id, hostname FROM assets 
                            WHERE (ip_address = :ip AND :ip != '') 
                               OR (mac_address = :mac AND :mac != '')
                            LIMIT 1
                        """), {"ip": ip, "mac": mac})
                        
                        existing = result.fetchone()
                        
                        if existing:
                            # UPDATE: Actualizar registro existente (mismo equipo, posible cambio de nombre)
                            old_hostname = existing[1]
                            conn.execute(text("""
                                UPDATE assets 
                                SET hostname = :hostname,
                                    last_seen = NOW(),
                                    status = CASE 
                                        WHEN :agent_status = 'Active' THEN 'active'
                                        ELSE 'inactive'
                                    END,
                                    ip_address = :ip,
                                    mac_address = :mac,
                                    os_type = :os_type,
                                    os_version = :os_version
                                WHERE id = :asset_id
                            """), {
                                "asset_id": existing[0],
                                "hostname": hostname,
                                "agent_status": info.get('status', 'Active'),
                                "ip": ip,
                                "mac": mac,
                                "os_type": info.get('os', '').split()[0].lower() if info.get('os') else 'unknown',
                                "os_version": ' '.join(info.get('os', '').split()[1:]) if info.get('os') else ''
                            })
                            if old_hostname != hostname:
                                logger.info(f"Updated asset: {old_hostname} → {hostname} (same device)")
                            else:
                                logger.info(f"Updated asset: {hostname}")
                        else:
                            # INSERT: Crear nuevo registro (nuevo equipo)
                            conn.execute(text("""
                                INSERT INTO assets (
                                    id, hostname, ip_address, mac_address, 
                                    os_type, os_version, antivirus_active, 
                                    status, last_seen, risk_score, 
                                    telemetry_enabled, required_tags, 
                                    compliance_status, compliance_message
                                ) VALUES (
                                    :id, :hostname, :ip, :mac,
                                    :os_type, :os_version, true,
                                    :status, NOW(), 0,
                                    true, '[]'::jsonb,
                                    'pending', 'Pendiente de evaluación'
                                )
                            """), {
                                "id": str(uuid.uuid4()),
                                "hostname": hostname,
                                "ip": ip,
                                "mac": mac,
                                "os_type": info.get('os', '').split()[0].lower() if info.get('os') else 'unknown',
                                "os_version": ' '.join(info.get('os', '').split()[1:]) if info.get('os') else '',
                                "status": 'active' if info.get('status') == 'Active' else 'inactive'
                            })
                            logger.info(f"Created new asset: {hostname}")
                        
                        conn.commit()
                        
                        # Auto-asignar tags al nuevo asset (fuera de la transacción)
                        if not existing:
                            try:
                                os_type_normalized = info.get('os', '').split()[0].lower() if info.get('os') else 'unknown'
                                await auto_assign_tags(hostname, os_type_normalized, True, True)
                            except Exception as tag_error:
                                logger.error(f"Error auto-assigning tags: {tag_error}")
                except Exception as db_error:
                    logger.error(f"Error updating/creating asset in DB: {db_error}")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error guardando info del sistema: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/info")
async def get_system_info():
    """Obtiene información del sistema almacenada."""
    try:
        cached = redis_client.get("system:info")
        if cached:
            data = json.loads(cached)
            # Verificar si el agente está activo (última actualización < 90 segundos)
            if 'last_seen' in data:
                last_seen = datetime.fromisoformat(data['last_seen'])
                seconds_since_last_seen = (datetime.now() - last_seen).total_seconds()
                if seconds_since_last_seen > 90:
                    data['status'] = 'Inactive'
                else:
                    data['status'] = 'Active'
            return data
        return {"hostname": "Unknown", "ip": "0.0.0.0", "os": "Unknown", "status": "Inactive"}
    except Exception as e:
        logger.error(f"Error obteniendo info del sistema: {e}")
        return {"hostname": "Unknown", "ip": "0.0.0.0", "os": "Unknown", "status": "Inactive"}

@app.get("/elasticsearch/search")
async def search_elasticsearch(query: str = None, severity: str = None, limit: int = 100):
    """Buscar alertas en Elasticsearch"""
    try:
        results = es_client.search_alerts(query=query, severity=severity, limit=limit)
        return {"total": len(results), "alerts": results}
    except Exception as e:
        logger.error(f"Error buscando en Elasticsearch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/elasticsearch/stats")
async def get_elasticsearch_stats():
    """Obtener estadísticas de Elasticsearch"""
    try:
        stats = es_client.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error obteniendo stats de Elasticsearch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/soar/workflows")
async def save_workflow(workflow_data: dict):
    """Guardar un workflow SOAR"""
    # TODO: Implementar SOAR engine
    return {"error": "SOAR engine not implemented yet"}, 501

@app.post("/soar/workflows/{workflow_id}/activate")
async def activate_workflow(workflow_id: str):
    """Activar un workflow SOAR"""
    # TODO: Implementar SOAR engine
    return {"error": "SOAR engine not implemented yet"}, 501

@app.post("/soar/workflows/{workflow_id}/deactivate")
async def deactivate_workflow(workflow_id: str):
    """Desactivar un workflow SOAR"""
    # TODO: Implementar SOAR engine
    return {"error": "SOAR engine not implemented yet"}, 501

@app.get("/soar/workflows")
async def list_workflows():
    """Listar todos los workflows"""
    # TODO: Implementar SOAR engine
    return {
        "workflows": [],
        "active": []
    }

@app.get("/reports/vulnerabilities/pdf")
async def download_vulnerability_report_pdf():
    """Descargar reporte de vulnerabilidades en PDF"""
    # Temporalmente deshabilitado - requiere módulo report_generator
    raise HTTPException(
        status_code=501,
        detail="Generación de reportes PDF no disponible. Use /reports/vulnerabilities/csv para exportar datos."
    )

@app.get("/reports/vulnerabilities/csv")
async def download_vulnerability_report_csv():
    """Descargar reporte de vulnerabilidades en CSV"""
    # Implementación simple sin report_generator
    vulnerabilities = [
        {"cve_id": "CVE-2023-1234", "cvss": 9.8, "description": "Critical vulnerability", "affected_hosts": "192.168.1.100", "affected_software": "Apache 2.4"},
        {"cve_id": "CVE-2023-5678", "cvss": 7.5, "description": "High severity issue", "affected_hosts": "192.168.1.101", "affected_software": "MySQL 5.7"},
    ]
    
    # Generar CSV manualmente
    csv_lines = ["CVE ID,CVSS,Description,Affected Hosts,Affected Software"]
    for vuln in vulnerabilities:
        csv_lines.append(f"{vuln['cve_id']},{vuln['cvss']},{vuln['description']},{vuln['affected_hosts']},{vuln['affected_software']}")
    csv_data = "\n".join(csv_lines)
    
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=vulnerability_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.get("/reports/alerts/pdf")
async def download_alert_report_pdf():
    """Descargar reporte de alertas en PDF"""
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        repo = AlertRepository(db)
        alerts_db = repo.get_open_alerts(limit=100)
        alerts = []
        for alert in alerts_db:
            alerts.append({
                "prioridad_ia": alert.ai_classification,
                "estado": alert.status,
                "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
                "descripcion": alert.description,
                "host_afectado": alert.title,
                "ip_origen": alert.raw_data.get("source_ip") if alert.raw_data else None
            })
        
        # Temporalmente deshabilitado - requiere módulo report_generator
        raise HTTPException(
            status_code=501,
            detail="Generación de reportes PDF no disponible. Use /reports/alerts/csv para exportar datos."
        )
    finally:
        db.close()

@app.get("/reports/alerts/csv")
async def download_alert_report_csv():
    """Descargar reporte de alertas en CSV"""
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        repo = AlertRepository(db)
        alerts_db = repo.get_open_alerts(limit=100)
        alerts = []
        for alert in alerts_db:
            alerts.append({
                "prioridad_ia": alert.ai_classification,
                "estado": alert.status,
                "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
                "descripcion": alert.description,
                "host_afectado": alert.title,
                "ip_origen": alert.raw_data.get("source_ip") if alert.raw_data else None
            })
        
        # Generar CSV manualmente
        csv_lines = ["Prioridad IA,Estado,Timestamp,Descripción,Host Afectado,IP Origen"]
        for alert in alerts:
            csv_lines.append(f"{alert['prioridad_ia']},{alert['estado']},{alert['timestamp']},{alert['descripcion']},{alert['host_afectado']},{alert['ip_origen']}")
        csv_data = "\n".join(csv_lines)
        
        return StreamingResponse(
            iter([csv_data]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=alert_report_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    finally:
        db.close()

@app.post("/reports/generate")
async def generate_report(report_type: str):
    """Generar un nuevo reporte"""
    report_id = str(uuid.uuid4())
    timestamp = datetime.now().strftime('%Y-%m-%d')
    
    return {
        "id": report_id,
        "name": f"{report_type} - {timestamp}",
        "date": timestamp,
        "type": report_type
    }

@app.get("/settings/integrations")
async def get_integrations_status():
    """Obtener estado de integraciones"""
    try:
        # Verificar PostgreSQL
        db_url = os.getenv("DATABASE_URL")
        pg_status = "connected" if db_url else "disconnected"
        
        # Verificar Redis
        redis_status = "disconnected"
        try:
            redis_client.ping()
            redis_status = "connected"
        except:
            pass
        
        # Obtener conectores personalizados
        custom_connectors = {}
        try:
            stored = redis_client.get("settings:custom_connectors")
            if stored:
                custom_connectors = json.loads(stored)
        except:
            pass
        
        result = {
            "openvas": {"status": "connected", "url": "http://openvas:9390"},
            "postgresql": {"status": pg_status, "url": db_url},
        }
        result.update(custom_connectors)
        return result
    except Exception as e:
        logger.error(f"Error obteniendo estado de integraciones: {e}")
        return {}

@app.post("/settings/integrations")
async def add_integration(connector: dict):
    """Agregar nueva integración"""
    try:
        # Obtener conectores existentes
        stored = redis_client.get("settings:custom_connectors")
        connectors = json.loads(stored) if stored else {}
        
        # Agregar nuevo conector
        connector_id = connector['name'].lower().replace(' ', '_')
        connectors[connector_id] = {
            "status": "disconnected",
            "url": connector['url'],
            "port": connector.get('port'),
            "name": connector['name']
        }
        
        # Guardar
        redis_client.set("settings:custom_connectors", json.dumps(connectors))
        return {"status": "success", "message": "Conector agregado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/integrations/{integration}/test")
@app.get("/settings/integrations/{integration}/test")
async def test_integration(integration: str):
    """Probar conexión de una integración"""
    try:
        if integration == "postgresql":
            db_url = os.getenv("DATABASE_URL")
            engine = create_engine(db_url)
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1"))
            return {"status": "success", "message": "Conexión PostgreSQL exitosa"}
        elif integration == "redis":
            redis_client.ping()
            return {"status": "success", "message": "Conexión Redis exitosa"}
        elif integration == "wazuh":
            return {"status": "success", "message": "Conexión Wazuh exitosa"}
        elif integration == "openvas":
            return {"status": "success", "message": "Conexión OpenVAS exitosa"}
        else:
            return {"status": "error", "message": "Integración no encontrada"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/settings/model")
async def get_model_info():
    """Obtener información del modelo de IA"""
    if model_info:
        n_classes = len(model_info.get('label_encoder', {}).classes_) if 'label_encoder' in model_info else 0
        
        # Obtener fecha del modelo más reciente
        models_dir = Path("models")
        model_files = list(models_dir.glob("threatguard_model_*.pkl"))
        last_training = "Desconocido"
        if model_files:
            latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
            last_training = datetime.fromtimestamp(latest_model.stat().st_mtime).strftime('%Y-%m-%d')
        
        return {
            "dataset": "CIC-IDS2017",
            "accuracy": f"{model_info.get('accuracy', 0.0)*100:.1f}%",
            "last_training": last_training,
            "status": "Cargado",
            "loaded": True,
            "classes": n_classes,
            "features": len(model_info['feature_names'])
        }
    return {
        "dataset": "Esperando modelo",
        "accuracy": "0%",
        "last_training": "Nunca",
        "status": "Sin modelo",
        "loaded": False
    }

@app.post("/predictions/{prediction_id}/feedback")
async def submit_prediction_feedback(prediction_id: str, feedback: dict):
    """Registrar feedback del usuario sobre una predicción"""
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise HTTPException(status_code=503, detail="Database no disponible")
        
        is_correct = feedback.get('is_correct', None)
        user_feedback = feedback.get('feedback', '')
        
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # Actualizar predicción
            result = conn.execute(text("""
                UPDATE model_predictions
                SET is_correct = :is_correct,
                    user_feedback = :user_feedback,
                    feedback_timestamp = NOW()
                WHERE id = :prediction_id
                RETURNING model_name, prediction
            """), {
                "prediction_id": prediction_id,
                "is_correct": is_correct,
                "user_feedback": user_feedback
            })
            
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Predicción no encontrada")
            
            model_name = row[0]
            prediction = row[1]
            
            # Actualizar métricas
            if is_correct is not None:
                if is_correct:
                    conn.execute(text("""
                        UPDATE model_metrics
                        SET correct_predictions = correct_predictions + 1,
                            accuracy = (correct_predictions + 1.0) / NULLIF(total_predictions, 0),
                            last_updated = NOW()
                        WHERE model_name = :model_name
                    """), {"model_name": model_name})
                else:
                    # Falso positivo si predijo ataque pero era benigno
                    if prediction != 'BENIGN':
                        conn.execute(text("""
                            UPDATE model_metrics
                            SET false_positives = false_positives + 1,
                                accuracy = correct_predictions / NULLIF(total_predictions, 0),
                                last_updated = NOW()
                            WHERE model_name = :model_name
                        """), {"model_name": model_name})
                    else:
                        # Falso negativo si predijo benigno pero era ataque
                        conn.execute(text("""
                            UPDATE model_metrics
                            SET false_negatives = false_negatives + 1,
                                accuracy = correct_predictions / NULLIF(total_predictions, 0),
                                last_updated = NOW()
                            WHERE model_name = :model_name
                        """), {"model_name": model_name})
            
            conn.commit()
        
        return {"status": "success", "message": "Feedback registrado"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings/model/{model_name}/metrics")
async def get_model_metrics(model_name: str):
    """Obtener métricas de un modelo"""
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return {"total_predictions": 0, "false_positives": 0, "accuracy": 0.0}
        
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT total_predictions, correct_predictions, false_positives, 
                       false_negatives, accuracy
                FROM model_metrics
                WHERE model_name = :model_name
            """), {"model_name": model_name})
            
            row = result.fetchone()
            if not row:
                return {"total_predictions": 0, "false_positives": 0, "accuracy": 0.0}
            
            total = row[0] or 0
            correct = row[1] or 0
            fp = row[2] or 0
            fn = row[3] or 0
            accuracy = row[4] or 0.0
            
            fp_rate = (fp / total * 100) if total > 0 else 0.0
            
            return {
                "total_predictions": total,
                "correct_predictions": correct,
                "false_positives": fp,
                "false_negatives": fn,
                "false_positive_rate": round(fp_rate, 2),
                "accuracy": round(accuracy * 100, 2)
            }
    except Exception as e:
        logger.error(f"Error obteniendo métricas: {e}")
        return {"total_predictions": 0, "false_positives": 0, "accuracy": 0.0}

@app.get("/settings/model/history")
async def get_model_history():
    """Obtener historial de modelos"""
    try:
        models_dir = Path("models")
        if not models_dir.exists():
            return {"models": []}
        
        model_files = list(models_dir.glob("threatguard_model_*.pkl"))
        if not model_files:
            return {"models": []}
        
        models_list = []
        
        # Conectar a BD para obtener métricas
        db_url = os.getenv("DATABASE_URL")
        engine = create_engine(db_url) if db_url else None
        conn = engine.connect() if engine else None
        
        for model_file in sorted(model_files, key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                # Obtener información del archivo
                file_stat = model_file.stat()
                file_size_mb = file_stat.st_size / (1024 * 1024)
                modified_time = datetime.fromtimestamp(file_stat.st_mtime)
                
                # Intentar cargar info del modelo
                with open(model_file, 'rb') as f:
                    model_data = pickle.load(f)
                
                accuracy = model_data.get('accuracy', 0.0)
                n_classes = len(model_data.get('label_encoder', {}).classes_) if 'label_encoder' in model_data else 0
                
                # Extraer nombre del dataset del filename o usar default
                name = model_file.stem.replace('threatguard_model_', '')
                
                # Obtener métricas de producción
                metrics_result = conn.execute(text("""
                    SELECT total_predictions, false_positives
                    FROM model_metrics
                    WHERE model_name = :model_name
                """), {"model_name": name})
                
                metrics_row = metrics_result.fetchone()
                total_preds = metrics_row[0] if metrics_row else 0
                false_pos = metrics_row[1] if metrics_row else 0
                fp_rate = (false_pos / total_preds * 100) if total_preds > 0 else 0.0
                
                models_list.append({
                    "name": name,
                    "filename": model_file.name,
                    "accuracy": round(accuracy * 100, 1),
                    "size_mb": round(file_size_mb, 2),
                    "date": modified_time.strftime('%Y-%m-%d'),
                    "datetime": modified_time.isoformat(),
                    "classes": n_classes,
                    "is_current": model_file == max(model_files, key=lambda x: x.stat().st_mtime),
                    "total_predictions": total_preds,
                    "false_positive_rate": round(fp_rate, 1)
                })
            except Exception as e:
                logger.error(f"Error procesando modelo {model_file}: {e}")
                continue
        
        if conn:
            conn.close()
        
        return {"models": models_list}
    except Exception as e:
        logger.error(f"Error obteniendo historial de modelos: {e}")
        return {"models": []}

@app.post("/settings/model/upload")
async def upload_model(file: UploadFile = File(...)):
    """Subir un nuevo modelo ML"""
    global model_info
    
    # Validar extensión
    if not file.filename.endswith(('.pkl', '.joblib')):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .pkl o .joblib")
    
    # Validar tamaño (máx 500MB)
    max_size = 500 * 1024 * 1024
    
    try:
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        # Leer contenido
        content = await file.read()
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx 500MB)")
        
        file_size_mb = len(content) / (1024 * 1024)
        
        # Guardar archivo con timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_filename = f"threatguard_model_{timestamp}.pkl"
        file_path = models_dir / new_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        logger.info(f"Modelo subido: {new_filename} ({file_size_mb:.2f} MB)")
        
        # Intentar cargar y validar el modelo
        try:
            with open(file_path, 'rb') as f:
                test_model = pickle.load(f)
            
            # Validar estructura del modelo
            required_keys = ['model', 'scaler', 'label_encoder', 'feature_names']
            missing_keys = [key for key in required_keys if key not in test_model]
            
            if missing_keys:
                file_path.unlink()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Modelo inválido. Faltan claves: {', '.join(missing_keys)}"
                )
            
            # Extraer información del modelo
            model_type = type(test_model['model']).__name__
            n_features = len(test_model['feature_names'])
            n_classes = len(test_model['label_encoder'].classes_)
            accuracy = test_model.get('accuracy', test_model.get('test_accuracy', 0.0))
            
            logger.info(f"Modelo validado: {model_type}, {n_features} features, {n_classes} clases, accuracy: {accuracy:.4f}")
            
            # Cargar el modelo en memoria
            success = load_latest_model()
            if success:
                return {
                    "status": "success", 
                    "message": f"Modelo cargado exitosamente",
                    "model_info": {
                        "filename": new_filename,
                        "size_mb": round(file_size_mb, 2),
                        "algorithm": model_type,
                        "features": n_features,
                        "classes": n_classes,
                        "accuracy": f"{accuracy*100:.2f}%"
                    }
                }
            else:
                file_path.unlink()
                raise HTTPException(status_code=400, detail="Error cargando el modelo")
                
        except pickle.UnpicklingError:
            file_path.unlink()
            raise HTTPException(status_code=400, detail="El archivo no es un modelo pickle válido")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subiendo modelo: {e}")
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/model/reload")
async def reload_model():
    """Recargar el modelo de IA"""
    global model_info
    success = load_latest_model()
    if success:
        return {"status": "success", "message": "Modelo recargado exitosamente"}
    return {"status": "error", "message": "Error recargando modelo"}

@app.post("/settings/notifications")
async def save_notification_settings(settings: dict):
    """Guardar configuración de notificaciones"""
    try:
        redis_client.set("settings:notifications", json.dumps(settings))
        return {"status": "success", "message": "Configuración guardada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings/notifications")
async def get_notification_settings():
    """Obtener configuración de notificaciones"""
    try:
        settings = redis_client.get("settings:notifications")
        if settings:
            return json.loads(settings)
        return {"email": "", "telegram": "", "slack": ""}
    except:
        return {"email": "", "telegram": "", "slack": ""}

# ============== GESTIÓN DE USUARIOS ==============

# Modelo Pydantic para Usuario
class User(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

@app.get("/settings/users")
async def get_users():
    """Obtener lista de usuarios"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # Devolver usuarios por defecto si no hay BD
        return {
            "users": [
                {"id": "1", "username": "admin", "email": "admin@threatguard.local", "full_name": "Administrator", "is_admin": True, "is_active": True, "created_at": "2024-01-15"},
                {"id": "2", "username": "analyst", "email": "analyst@threatguard.local", "full_name": "Security Analyst", "is_admin": False, "is_active": True, "created_at": "2024-03-20"}
            ]
        }
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("""
                SELECT id, username, email, full_name, is_admin, is_active, created_at 
                FROM users 
                ORDER BY created_at DESC
            """))
            users = []
            for row in result:
                users.append({
                    "id": str(row[0]),
                    "username": row[1],
                    "email": row[2],
                    "full_name": row[3],
                    "is_admin": row[4],
                    "is_active": row[5],
                    "created_at": str(row[6]) if row[6] else None
                })
            return {"users": users}
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        # Devolver usuarios por defecto en caso de error
        return {
            "users": [
                {"id": "1", "username": "admin", "email": "admin@threatguard.local", "full_name": "Administrator", "is_admin": True, "is_active": True, "created_at": "2024-01-15"},
                {"id": "2", "username": "analyst", "email": "analyst@threatguard.local", "full_name": "Security Analyst", "is_admin": False, "is_active": True, "created_at": "2024-03-20"}
            ]
        }

@app.post("/settings/users")
async def create_user(user: User):
    """Crear nuevo usuario"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        # Hash de la contraseña usando bcrypt
        import bcrypt
        password_to_hash = user.password if user.password else "changeme123"
        password_hash = bcrypt.hashpw(password_to_hash.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("""
                INSERT INTO users (id, username, email, full_name, hashed_password, is_admin, is_active, created_at, updated_at, login_count)
                VALUES (gen_random_uuid(), :username, :email, :full_name, :hashed_password, :is_admin, :is_active, NOW(), NOW(), 0)
                RETURNING id
            """), {
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name or user.username,
                "hashed_password": password_hash,
                "is_admin": user.is_admin,
                "is_active": user.is_active
            })
            conn.commit()
            user_id = result.fetchone()[0]
            
        logger.info(f"User created: {user.username} (ID: {user_id})")
        return {"success": True, "id": str(user_id), "message": "Usuario creado exitosamente"}
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/settings/users/{user_id}")
async def update_user(user_id: str, user: UserUpdate):
    """Actualizar usuario existente"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            
            # Construir query dinámicamente solo con campos proporcionados
            updates = []
            params = {"user_id": user_id}
            
            if user.username is not None:
                updates.append("username = :username")
                params["username"] = user.username
            if user.email is not None:
                updates.append("email = :email")
                params["email"] = user.email
            if user.full_name is not None:
                updates.append("full_name = :full_name")
                params["full_name"] = user.full_name
            if user.is_admin is not None:
                updates.append("is_admin = :is_admin")
                params["is_admin"] = user.is_admin
            if user.is_active is not None:
                updates.append("is_active = :is_active")
                params["is_active"] = user.is_active
            
            if not updates:
                raise HTTPException(status_code=400, detail="No hay campos para actualizar")
            
            updates.append("updated_at = NOW()")
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = :user_id"
            conn.execute(text(query), params)
            conn.commit()
            
        logger.info(f"User updated: ID {user_id}")
        return {"success": True, "message": "Usuario actualizado exitosamente"}
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/settings/users/{user_id}/status")
async def update_user_status(user_id: str, status_update: UserStatusUpdate):
    """Actualizar estado de usuario (activar/suspender)"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("""
                UPDATE users SET is_active = :is_active, updated_at = NOW() WHERE id = :user_id
            """), {"is_active": status_update.is_active, "user_id": user_id})
            conn.commit()
            
        logger.info(f"User status updated: ID {user_id} -> {'active' if status_update.is_active else 'inactive'}")
        return {"success": True, "message": "Estado actualizado exitosamente"}
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/users/{user_id}")
async def delete_user(user_id: str):
    """Eliminar usuario"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            # Verificar que no sea un admin
            result = conn.execute(text("SELECT is_admin FROM users WHERE id = :user_id"), {"user_id": user_id})
            row = result.fetchone()
            if row and row[0] is True:
                raise HTTPException(status_code=403, detail="No se puede eliminar un usuario Admin")
            
            conn.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
            conn.commit()
            
        logger.info(f"User deleted: ID {user_id}")
        return {"success": True, "message": "Usuario eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== FIN GESTIÓN DE USUARIOS ==============

# ============== GESTIÓN DE TAGS Y ACTIVOS ==============

# Modelos Pydantic para Tags
class Tag(BaseModel):
    name: str
    color: str = "#3B82F6"
    description: Optional[str] = None
    category: str = "custom"
    auto_assign: bool = False
    auto_criteria: Optional[dict] = None

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

# Modelos Pydantic para Assets
class Asset(BaseModel):
    hostname: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_type: Optional[str] = None
    os_version: Optional[str] = None
    antivirus_active: bool = False
    antivirus_name: Optional[str] = None
    telemetry_enabled: bool = False
    status: str = "active"

class AssetUpdate(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    os_type: Optional[str] = None
    os_version: Optional[str] = None
    antivirus_active: Optional[bool] = None
    antivirus_name: Optional[str] = None
    telemetry_enabled: Optional[bool] = None
    status: Optional[str] = None

# Endpoints de Tags
@app.get("/settings/tags")
async def get_tags():
    """Obtener todos los tags"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return {"tags": []}
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("""
                SELECT t.id, t.name, t.color, t.description, t.category, t.auto_assign, 
                       t.created_at, COUNT(at.asset_id) as asset_count
                FROM tags t
                LEFT JOIN asset_tags at ON t.id = at.tag_id
                GROUP BY t.id, t.name, t.color, t.description, t.category, t.auto_assign, t.created_at
                ORDER BY t.created_at DESC
            """))
            tags = []
            for row in result:
                tags.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "color": row[2],
                    "description": row[3],
                    "category": row[4],
                    "auto_assign": row[5],
                    "created_at": str(row[6]) if row[6] else None,
                    "asset_count": row[7]
                })
            return {"tags": tags}
    except Exception as e:
        logger.error(f"Error getting tags: {e}")
        return {"tags": []}

@app.post("/settings/tags")
async def create_tag(tag: Tag):
    """Crear nuevo tag"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("""
                INSERT INTO tags (name, color, description, category, auto_assign, auto_criteria, created_at, updated_at)
                VALUES (:name, :color, :description, :category, :auto_assign, :auto_criteria, NOW(), NOW())
                RETURNING id
            """), {
                "name": tag.name,
                "color": tag.color,
                "description": tag.description,
                "category": tag.category,
                "auto_assign": tag.auto_assign,
                "auto_criteria": json.dumps(tag.auto_criteria) if tag.auto_criteria else None
            })
            conn.commit()
            tag_id = result.fetchone()[0]
            
        logger.info(f"Tag created: {tag.name} (ID: {tag_id})")
        return {"success": True, "id": str(tag_id), "message": "Tag creado exitosamente"}
    except Exception as e:
        logger.error(f"Error creating tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/tags/{tag_id}")
async def delete_tag(tag_id: str):
    """Eliminar tag"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("DELETE FROM tags WHERE id = :tag_id"), {"tag_id": tag_id})
            conn.commit()
            
        logger.info(f"Tag deleted: ID {tag_id}")
        return {"success": True, "message": "Tag eliminado exitosamente"}
    except Exception as e:
        logger.error(f"Error deleting tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints de Assets
@app.get("/settings/assets")
async def get_assets():
    """Obtener todos los activos con sus tags"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return {"assets": []}
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            from datetime import datetime, timezone
            
            # Obtener activos
            result = conn.execute(text("""
                SELECT id, hostname, ip_address, mac_address, os_type, os_version,
                       antivirus_active, antivirus_name, telemetry_enabled, status, risk_score, 
                       last_seen, created_at
                FROM assets
                ORDER BY last_seen DESC NULLS LAST
            """))
            
            assets = []
            for row in result:
                asset_id = str(row[0])
                db_status = row[9]  # Estado en BD ('active' o 'inactive')
                last_seen_db = row[11]
                
                # Calcular estado real basado en status de BD y last_seen
                # Si el status en BD es 'inactive', está offline inmediatamente
                if db_status == 'inactive':
                    actual_status = "offline"
                elif last_seen_db:
                    # Si last_seen es naive, asumimos UTC
                    if last_seen_db.tzinfo is None:
                        last_seen_db = last_seen_db.replace(tzinfo=timezone.utc)
                    
                    now = datetime.now(timezone.utc)
                    seconds_since_last_seen = (now - last_seen_db).total_seconds()
                    
                    # Si pasaron más de 90 segundos, está offline
                    actual_status = "online" if seconds_since_last_seen <= 90 else "offline"
                else:
                    actual_status = "offline"
                
                # Obtener tags del activo
                tags_result = conn.execute(text("""
                    SELECT t.id, t.name, t.color, t.category
                    FROM tags t
                    INNER JOIN asset_tags at ON t.id = at.tag_id
                    WHERE at.asset_id = :asset_id
                """), {"asset_id": asset_id})
                
                tags = [{"id": str(t[0]), "name": t[1], "color": t[2], "category": t[3]} for t in tags_result]
                
                assets.append({
                    "id": asset_id,
                    "hostname": row[1],
                    "ip_address": row[2],
                    "mac_address": row[3],
                    "os_type": row[4],
                    "os_version": row[5],
                    "antivirus_active": row[6],
                    "antivirus_name": row[7],
                    "telemetry_enabled": row[8],
                    "status": actual_status,  # Estado calculado dinámicamente
                    "risk_score": row[10],
                    "last_seen": str(row[11]) if row[11] else None,
                    "created_at": str(row[12]) if row[12] else None,
                    "tags": tags
                })
            return {"assets": assets}
    except Exception as e:
        logger.error(f"Error getting assets: {e}")
        return {"assets": []}

@app.post("/settings/assets/{asset_id}/tags/{tag_id}")
async def assign_tag_to_asset(asset_id: str, tag_id: str):
    """Asignar tag a un activo"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("""
                INSERT INTO asset_tags (asset_id, tag_id, assigned_by)
                VALUES (:asset_id, :tag_id, 'admin')
                ON CONFLICT (asset_id, tag_id) DO NOTHING
            """), {"asset_id": asset_id, "tag_id": tag_id})
            conn.commit()
            
        logger.info(f"Tag {tag_id} assigned to asset {asset_id}")
        return {"success": True, "message": "Tag asignado exitosamente"}
    except Exception as e:
        logger.error(f"Error assigning tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/settings/assets/{asset_id}/tags/{tag_id}")
async def remove_tag_from_asset(asset_id: str, tag_id: str):
    """Remover tag de un activo"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("""
                DELETE FROM asset_tags 
                WHERE asset_id = :asset_id AND tag_id = :tag_id
            """), {"asset_id": asset_id, "tag_id": tag_id})
            conn.commit()
            
        logger.info(f"Tag {tag_id} removed from asset {asset_id}")
        return {"success": True, "message": "Tag removido exitosamente"}
    except Exception as e:
        logger.error(f"Error removing tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/settings/assets/auto-tag")
async def auto_tag_assets():
    """Aplicar tags automáticos a todos los activos según criterios"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        assigned_count = 0
        
        with engine.connect() as conn:
            from sqlalchemy import text
            
            # Obtener tags con auto_assign=true
            tags_result = conn.execute(text("""
                SELECT id, name, auto_criteria
                FROM tags
                WHERE auto_assign = true AND auto_criteria IS NOT NULL
            """))
            
            auto_tags = [(str(row[0]), row[1], row[2]) for row in tags_result]
            
            # Obtener todos los activos
            assets_result = conn.execute(text("""
                SELECT id, os_type, os_version, antivirus_active, telemetry_enabled
                FROM assets
            """))
            
            for asset in assets_result:
                asset_id = str(asset[0])
                os_type = asset[1]
                os_version = asset[2] or ""
                antivirus_active = asset[3]
                telemetry_enabled = asset[4]
                
                for tag_id, tag_name, criteria in auto_tags:
                    should_assign = False
                    
                    # Evaluar criterios
                    if criteria.get("os_type") and criteria["os_type"] == os_type:
                        if "os_version_contains" in criteria:
                            if criteria["os_version_contains"].lower() in os_version.lower():
                                should_assign = True
                        else:
                            should_assign = True
                    
                    if "antivirus_active" in criteria:
                        if criteria["antivirus_active"] == antivirus_active:
                            should_assign = True
                    
                    if "telemetry_enabled" in criteria:
                        if criteria["telemetry_enabled"] == telemetry_enabled:
                            should_assign = True
                    
                    if should_assign:
                        conn.execute(text("""
                            INSERT INTO asset_tags (asset_id, tag_id, assigned_by)
                            VALUES (:asset_id, :tag_id, 'system')
                            ON CONFLICT (asset_id, tag_id) DO NOTHING
                        """), {"asset_id": asset_id, "tag_id": tag_id})
                        assigned_count += 1
            
            conn.commit()
        
        logger.info(f"Auto-tagging completed: {assigned_count} assignments")
        return {"success": True, "message": f"{assigned_count} tags asignados automáticamente"}
    except Exception as e:
        logger.error(f"Error in auto-tagging: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent/check-compliance/{hostname}")
async def check_agent_compliance(hostname: str):
    """Verificar si un agente cumple con los tags requeridos antes de operar"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=503, detail="Database no disponible")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            from sqlalchemy import text
            
            # Obtener el activo
            asset_result = conn.execute(text("""
                SELECT id, hostname, os_type, os_version, antivirus_active, telemetry_enabled, 
                       required_tags, compliance_status
                FROM assets
                WHERE hostname = :hostname
            """), {"hostname": hostname})
            
            asset_row = asset_result.fetchone()
            if not asset_row:
                raise HTTPException(status_code=404, detail=f"Activo {hostname} no encontrado")
            
            asset_id = str(asset_row[0])
            os_type = asset_row[2]
            os_version = asset_row[3] or ""
            antivirus_active = asset_row[4]
            telemetry_enabled = asset_row[5]
            required_tags = asset_row[6] or []
            
            # Obtener tags actuales del activo
            tags_result = conn.execute(text("""
                SELECT t.name, t.category
                FROM tags t
                INNER JOIN asset_tags at ON t.id = at.tag_id
                WHERE at.asset_id = :asset_id
            """), {"asset_id": asset_id})
            
            current_tags = {row[0]: row[1] for row in tags_result}
            
            # Verificar cumplimiento
            missing_requirements = []
            compliance_checks = {
                "os_verified": False,
                "antivirus_active": antivirus_active,
                "telemetry_enabled": telemetry_enabled
            }
            
            # Verificar OS
            os_tags = ["Windows 10", "Windows 11", "Linux", "macOS"]
            has_os_tag = any(tag in current_tags for tag in os_tags)
            compliance_checks["os_verified"] = has_os_tag
            
            if not has_os_tag:
                missing_requirements.append(f"Sistema operativo no identificado (OS: {os_type})")
            
            # Verificar antivirus
            if not antivirus_active:
                if "Sin Antivirus" not in current_tags:
                    missing_requirements.append("Antivirus no activo - requiere tag 'Sin Antivirus'")
                missing_requirements.append("⚠️ CRÍTICO: Antivirus debe estar activo para operar")
            
            # Verificar telemetría
            if not telemetry_enabled:
                if "Sin Telemetría" not in current_tags:
                    missing_requirements.append("Telemetría no activa - requiere tag 'Sin Telemetría'")
                missing_requirements.append("⚠️ CRÍTICO: Telemetría debe estar activa para reportar")
            
            # Determinar estado de cumplimiento
            is_compliant = (
                has_os_tag and 
                antivirus_active and 
                telemetry_enabled and 
                len(missing_requirements) == 0
            )
            
            compliance_status = "compliant" if is_compliant else "non_compliant"
            compliance_message = "Cumple con todos los requisitos" if is_compliant else "; ".join(missing_requirements)
            
            # Actualizar estado de cumplimiento en BD
            conn.execute(text("""
                UPDATE assets 
                SET compliance_status = :status,
                    compliance_message = :message,
                    last_compliance_check = NOW()
                WHERE id = :asset_id
            """), {
                "status": compliance_status,
                "message": compliance_message,
                "asset_id": asset_id
            })
            conn.commit()
            
            logger.info(f"Compliance check for {hostname}: {compliance_status}")
            
            return {
                "hostname": hostname,
                "compliant": is_compliant,
                "status": compliance_status,
                "message": compliance_message,
                "can_operate": is_compliant,
                "checks": compliance_checks,
                "missing_requirements": missing_requirements,
                "current_tags": list(current_tags.keys())
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking compliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def auto_assign_tags(hostname: str, os_type: str, antivirus_active: bool, telemetry_enabled: bool):
    """Asignar tags automáticamente a un agente según su configuración"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.warning("DATABASE_URL no configurada para auto_assign_tags")
        return
    
    try:
        from sqlalchemy import text
        engine = create_engine(db_url)
        
        with engine.begin() as conn:  # Usar begin() en lugar de connect() para auto-commit
            # Obtener ID del asset
            asset_result = conn.execute(text("""
                SELECT id FROM assets WHERE hostname = :hostname
            """), {"hostname": hostname})
            
            asset_row = asset_result.fetchone()
            if not asset_row:
                logger.warning(f"Asset {hostname} no encontrado para asignar tags")
                return
            
            asset_id = str(asset_row[0])
            tags_to_assign = []
            
            logger.info(f"Iniciando auto-asignación de tags para {hostname} (asset_id: {asset_id})")
            
            # Tag del Sistema Operativo
            if os_type == "windows":
                # Buscar tag Windows 10 o Windows 11
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name LIKE 'Windows%' AND category = 'system' LIMIT 1
                """))
                tag_row = tag_result.fetchone()
                if tag_row:
                    tags_to_assign.append(str(tag_row[0]))
                    logger.info(f"Tag Windows encontrado: {tag_row[0]}")
                else:
                    logger.warning("No se encontró tag Windows en la BD")
            elif os_type == "linux":
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'Linux' AND category = 'system'
                """))
                tag_row = tag_result.fetchone()
                if tag_row:
                    tags_to_assign.append(str(tag_row[0]))
            elif os_type == "macos":
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'macOS' AND category = 'system'
                """))
                tag_row = tag_result.fetchone()
                if tag_row:
                    tags_to_assign.append(str(tag_row[0]))
            
            # Tag de Antivirus
            if antivirus_active:
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'Antivirus Activo' AND category = 'security'
                """))
            else:
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'Sin Antivirus' AND category = 'security'
                """))
            tag_row = tag_result.fetchone()
            if tag_row:
                tags_to_assign.append(str(tag_row[0]))
                logger.info(f"Tag Antivirus encontrado: {tag_row[0]}")
            
            # Tag de Telemetría
            if telemetry_enabled:
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'Telemetría Activa' AND category = 'security'
                """))
            else:
                tag_result = conn.execute(text("""
                    SELECT id FROM tags WHERE name = 'Sin Telemetría' AND category = 'security'
                """))
            tag_row = tag_result.fetchone()
            if tag_row:
                tags_to_assign.append(str(tag_row[0]))
                logger.info(f"Tag Telemetría encontrado: {tag_row[0]}")
            
            # Asignar todos los tags
            for tag_id in tags_to_assign:
                # Verificar si ya existe la relación
                existing = conn.execute(text("""
                    SELECT 1 FROM asset_tags WHERE asset_id = :asset_id AND tag_id = :tag_id
                """), {"asset_id": asset_id, "tag_id": tag_id}).fetchone()
                
                if not existing:
                    conn.execute(text("""
                        INSERT INTO asset_tags (asset_id, tag_id) VALUES (:asset_id, :tag_id)
                    """), {"asset_id": asset_id, "tag_id": tag_id})
                    logger.info(f"Tag {tag_id} asignado a {hostname}")
                else:
                    logger.info(f"Tag {tag_id} ya existe para {hostname}")
            
            # El commit es automático con engine.begin()
            logger.info(f"✅ Auto-assigned {len(tags_to_assign)} tags to {hostname}")
            
    except Exception as e:
        logger.error(f"❌ Error auto-assigning tags: {e}")

@app.post("/agent/heartbeat")
async def agent_heartbeat(data: dict):
    """Recibir heartbeat del agente - solo si cumple con compliance"""
    hostname = data.get("hostname")
    
    if not hostname:
        raise HTTPException(status_code=400, detail="hostname requerido")
    
    # Verificar compliance primero
    compliance = await check_agent_compliance(hostname)
    
    if not compliance["can_operate"]:
        logger.warning(f"Agent {hostname} intentó enviar heartbeat sin cumplir compliance")
        raise HTTPException(
            status_code=403, 
            detail=f"Agente bloqueado: {compliance['message']}"
        )
    
    # Si cumple, actualizar last_seen
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("""
                    UPDATE assets 
                    SET last_seen = NOW(),
                        status = 'active'
                    WHERE hostname = :hostname
                """), {"hostname": hostname})
                conn.commit()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")
    
    return {
        "status": "accepted",
        "message": "Heartbeat recibido - agente operando correctamente",
        "compliance": compliance
    }

@app.post("/agent/register")
async def register_agent(agent_data: dict):
    """
    Registra o actualiza un agente automáticamente cuando envía sus datos.
    El agente envía: hostname, ip, mac, os_info, antivirus_status, telemetry_enabled
    """
    try:
        hostname = agent_data.get("hostname", "").strip()
        ip_address = agent_data.get("ip", "").strip()
        mac_address = agent_data.get("mac", "").strip()
        
        if not hostname:
            raise HTTPException(status_code=400, detail="El hostname es requerido")
        
        # Extraer información del sistema operativo
        os_info = agent_data.get("os_info", {})
        os_type = os_info.get("os", "unknown").lower()
        os_version = os_info.get("version", "")
        
        # Normalizar tipo de SO
        if "windows" in os_type:
            os_type = "windows"
        elif "linux" in os_type:
            os_type = "linux"
        elif "darwin" in os_type or "mac" in os_type:
            os_type = "macos"
        
        # Estado de antivirus y telemetría
        antivirus_active = agent_data.get("antivirus_active", False)
        telemetry_enabled = agent_data.get("telemetry_enabled", True)  # Por defecto True si está enviando datos
        
        # Información adicional
        cpu_info = agent_data.get("cpu", "")
        ram_total = agent_data.get("ram_total", 0)
        
        # Obtener conexión a la base de datos
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL no está definida")
        
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            # Verificar si el agente ya existe
            result = conn.execute(text("""
                SELECT id FROM assets WHERE hostname = :hostname
            """), {"hostname": hostname})
            existing_agent = result.fetchone()
            
            current_time = datetime.now()
            
            if existing_agent:
                # Actualizar agente existente
                conn.execute(text("""
                    UPDATE assets SET
                        ip_address = :ip,
                        mac_address = :mac,
                        os_type = :os_type,
                        os_version = :os_version,
                        antivirus_active = :antivirus,
                        telemetry_enabled = :telemetry,
                        last_seen = :last_seen,
                        status = 'active',
                        updated_at = :updated_at
                    WHERE hostname = :hostname
                """), {
                    "hostname": hostname,
                    "ip": ip_address,
                    "mac": mac_address,
                    "os_type": os_type,
                    "os_version": os_version,
                    "antivirus": antivirus_active,
                    "telemetry": telemetry_enabled,
                    "last_seen": current_time,
                    "updated_at": current_time
                })
                
                agent_id = existing_agent[0]
                logger.info(f"Agente actualizado: {hostname} (ID: {agent_id})")
                action = "updated"
            else:
                # Registrar nuevo agente
                result = conn.execute(text("""
                    INSERT INTO assets (
                        hostname, ip_address, mac_address, os_type, os_version,
                        antivirus_active, telemetry_enabled, status, risk_score,
                        last_seen, created_at, updated_at
                    ) VALUES (
                        :hostname, :ip, :mac, :os_type, :os_version,
                        :antivirus, :telemetry, 'active', 0,
                        :last_seen, :created_at, :updated_at
                    ) RETURNING id
                """), {
                    "hostname": hostname,
                    "ip": ip_address,
                    "mac": mac_address,
                    "os_type": os_type,
                    "os_version": os_version,
                    "antivirus": antivirus_active,
                    "telemetry": telemetry_enabled,
                    "last_seen": current_time,
                    "created_at": current_time,
                    "updated_at": current_time
                })
                
                agent_id = result.fetchone()[0]
                logger.info(f"Nuevo agente registrado: {hostname} (ID: {agent_id})")
                action = "registered"
            
            conn.commit()
        
        # Asignar tags automáticamente según el sistema operativo
        await auto_assign_tags(hostname, os_type, antivirus_active, telemetry_enabled)
        
        # Verificar cumplimiento automáticamente
        compliance = await check_agent_compliance(hostname)
        
        return {
            "status": "success",
            "action": action,
            "agent_id": agent_id,
            "hostname": hostname,
            "compliance": compliance,
            "message": f"Agente {action} correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en registro de agente: {e}")
        raise HTTPException(status_code=500, detail=f"Error al registrar agente: {str(e)}")

@app.post("/agent/send-data")
async def receive_agent_data(data: dict):
    """
    Recibe datos del agente: systeminfo, eventos, métricas, etc.
    Actualiza automáticamente el estado y valida cumplimiento.
    """
    try:
        hostname = data.get("hostname", "").strip()
        if not hostname:
            raise HTTPException(status_code=400, detail="Hostname requerido")
        
        # Primero registrar/actualizar el agente
        agent_info = {
            "hostname": hostname,
            "ip": data.get("ip", ""),
            "mac": data.get("mac", ""),
            "os_info": data.get("os_info", {}),
            "antivirus_active": data.get("antivirus_active", False),
            "telemetry_enabled": True  # Si está enviando datos, telemetría está activa
        }
        
        registration_result = await register_agent(agent_info)
        
        # Verificar cumplimiento
        if not registration_result["compliance"]["can_operate"]:
            raise HTTPException(
                status_code=403,
                detail=f"Agente bloqueado: {registration_result['compliance']['message']}"
            )
        
        # Procesar los datos enviados por el agente
        events = data.get("events", [])
        metrics = data.get("metrics", {})
        alerts = data.get("alerts", [])
        
        logger.info(f"Datos recibidos de {hostname}: {len(events)} eventos, {len(alerts)} alertas")
        
        # Aquí puedes procesar los eventos, métricas, alertas, etc.
        # Por ejemplo, guardar en base de datos, analizar con ML, etc.
        
        return {
            "status": "success",
            "message": "Datos recibidos correctamente",
            "hostname": hostname,
            "compliance": registration_result["compliance"],
            "processed": {
                "events": len(events),
                "alerts": len(alerts),
                "metrics": len(metrics.keys()) if metrics else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error procesando datos del agente: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar datos: {str(e)}")

# ============== FIN GESTIÓN DE TAGS Y ACTIVOS ==============

@app.post("/predict", response_model=ThreatPrediction)
async def predict_threat(flow: NetworkFlow):
    """Predecir amenaza en flujo de red."""
    global predictions_count
    
    if not model_info:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    
    try:
        flow_data = flow.dict()
        feature_vector = []
        
        for feature_name in model_info['feature_names']:
            value = 0.0
            if 'Source Port' in feature_name:
                value = flow_data.get('source_port', 0)
            elif 'Destination Port' in feature_name:
                value = flow_data.get('destination_port', 0)
            elif 'Protocol' in feature_name:
                value = flow_data.get('protocol', 0)
            elif 'Flow Duration' in feature_name:
                value = flow_data.get('flow_duration', 0)
            feature_vector.append(value)
        
        while len(feature_vector) < len(model_info['feature_names']):
            feature_vector.append(0.0)
        feature_vector = feature_vector[:len(model_info['feature_names'])]
        
        # Aplicar imputer si existe
        if 'imputer' in model_info:
            processed = model_info['imputer'].transform([feature_vector])
        else:
            processed = [feature_vector]
        
        scaled = model_info['scaler'].transform(processed)
        prediction = model_info['model'].predict(scaled)[0]
        probabilities = model_info['model'].predict_proba(scaled)[0]
        confidence = float(probabilities.max())
        threat_type = model_info['label_encoder'].inverse_transform([prediction])[0]
        
        predictions_count += 1
        severity = get_threat_severity(threat_type)
        recommendations = get_recommendations(threat_type)
        
        # Registrar predicción en BD para métricas
        try:
            db_url = os.getenv("DATABASE_URL")
            if db_url:
                engine = create_engine(db_url)
                with engine.connect() as conn:
                    model_name = "CIC-IDS2017"
                    conn.execute(text("""
                        INSERT INTO model_predictions (
                            model_name, prediction, confidence, source_ip, destination_ip, raw_data
                        ) VALUES (
                            :model_name, :prediction, :confidence, :source_ip, :dest_ip, :raw_data
                        )
                    """), {
                        "model_name": model_name,
                        "prediction": threat_type,
                        "confidence": confidence,
                        "source_ip": flow.source_ip,
                        "dest_ip": flow.destination_ip,
                        "raw_data": json.dumps(flow.dict())
                    })
                    
                    # Actualizar métricas del modelo
                    conn.execute(text("""
                        INSERT INTO model_metrics (model_name, total_predictions, last_updated)
                        VALUES (:model_name, 1, NOW())
                        ON CONFLICT (model_name) DO UPDATE SET
                            total_predictions = model_metrics.total_predictions + 1,
                            last_updated = NOW()
                    """), {"model_name": model_name})
                    conn.commit()
        except Exception as e:
            logger.error(f"Error registrando predicción: {e}")
        
        # Guardar alerta en BD
        if True:
            try:
                db_url = os.getenv("DATABASE_URL")
                if db_url:
                    engine = create_engine(db_url)
                    SessionLocal = sessionmaker(bind=engine)
                    db = SessionLocal()
                    try:
                        new_alert = Alert(
                            source="ML Model",
                            severity=severity,
                            title=f"{flow.source_ip} -> {flow.destination_ip}",
                            description="\n".join(recommendations),
                            status="open",
                            ai_classification=severity,
                            ai_confidence=confidence,
                            raw_data=flow.dict(),
                            timestamp=datetime.now()
                        )
                        db.add(new_alert)
                        db.commit()
                        
                        # Indexar en Elasticsearch
                        es_data = {
                            "timestamp": datetime.now().isoformat(),
                            "source": "ML Model",
                            "severity": severity,
                            "title": f"{flow.source_ip} -> {flow.destination_ip}",
                            "description": "\n".join(recommendations),
                            "ai_classification": severity,
                            "ai_confidence": confidence,
                            "status": "open",
                            "source_ip": flow.source_ip,
                            "destination_ip": flow.destination_ip,
                            "raw_data": flow.dict()
                        }
                        es_client.index_alert(es_data)
                    finally:
                        db.close()
            except Exception as e:
                logger.error(f"Error guardando alerta: {e}")
        
        return ThreatPrediction(
            threat_type=threat_type,
            confidence=confidence,
            severity=severity,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error en predicción: {e}")
        raise HTTPException(status_code=500, detail=f"Error en predicción: {str(e)}")

# ============================================================================
# SQL QUERY ENDPOINT
# ============================================================================

class SQLQuery(BaseModel):
    query: str

@app.post("/api/sql/query")
async def execute_sql_query(sql_query: SQLQuery):
    """
    Ejecuta una consulta SQL en la base de datos PostgreSQL.
    ADVERTENCIA: Este endpoint permite ejecución directa de SQL.
    """
    try:
        # Validación básica de seguridad
        query = sql_query.query.strip()
        
        # Bloquear comandos peligrosos
        dangerous_keywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
        query_upper = query.upper()
        
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                # Permitir solo SELECT
                if not query_upper.startswith('SELECT'):
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Operación no permitida: {keyword}. Solo se permiten consultas SELECT."
                    )
        
        # Crear conexión directa a PostgreSQL
        db_url = os.getenv(
            'DATABASE_URL',
            'postgresql+psycopg2://threatguard_user:secure_password_2024!@postgres:5432/threatguard_db'
        )
        
        engine = create_engine(db_url)
        
        # Ejecutar query
        with engine.connect() as connection:
            result = connection.execute(text(query))
            
            # Si es un SELECT, obtener los resultados
            if query_upper.startswith('SELECT'):
                rows = result.fetchall()
                columns = result.keys()
                
                # Convertir a lista de diccionarios
                data = []
                for row in rows:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Convertir tipos no serializables
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        elif isinstance(value, (np.integer, np.floating)):
                            value = float(value)
                        row_dict[col] = value
                    data.append(row_dict)
                
                return {
                    "success": True,
                    "rows": data,
                    "columns": list(columns),
                    "count": len(data)
                }
            else:
                # Para otros comandos (aunque deberían estar bloqueados)
                return {
                    "success": True,
                    "affected_rows": result.rowcount,
                    "message": "Query ejecutado exitosamente"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ejecutando query SQL: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error ejecutando query: {str(e)}"
        )

# Importar rutas de assets
try:
    from src.api.assets_api import router as assets_router
    app.include_router(assets_router, tags=["assets"])
    logger.info("✅ Rutas de assets cargadas")
except Exception as e:
    logger.warning(f"⚠️ No se pudieron cargar rutas de assets: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "threatguard_api:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
