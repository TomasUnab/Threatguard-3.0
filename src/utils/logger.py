"""
Sistema de Logging de ThreatGuard
=================================

Sistema de logging centralizado y configurable que proporciona:
- Logging estructurado con múltiples niveles
- Rotación automática de archivos de log
- Formato personalizable
- Logging a consola y archivo
- Integración con sistemas de monitoreo
"""

import os
import sys
import logging
import logging.handlers
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
import json

# Importar loguru si está disponible (opcional)
try:
    from loguru import logger as loguru_logger
    LOGURU_AVAILABLE = True
except ImportError:
    LOGURU_AVAILABLE = False

class ThreatGuardFormatter(logging.Formatter):
    """Formatter personalizado para logs de ThreatGuard."""
    
    def __init__(self, include_json: bool = False):
        self.include_json = include_json
        super().__init__()
    
    def format(self, record):
        # Crear timestamp
        timestamp = datetime.fromtimestamp(record.created).isoformat()
        
        # Información básica del log
        log_data = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Agregar información adicional si existe
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'alert_id'):
            log_data['alert_id'] = record.alert_id
        if hasattr(record, 'scan_id'):
            log_data['scan_id'] = record.scan_id
        
        # Agregar información de excepción si existe
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        if self.include_json:
            return json.dumps(log_data)
        else:
            # Formato legible para humanos
            return f"{timestamp} | {record.levelname:8} | {record.name:20} | {record.getMessage()}"

class SecurityLogger:
    """Logger especializado para eventos de seguridad."""
    
    def __init__(self, name: str = "threatguard.security"):
        self.logger = logging.getLogger(name)
        self._setup_security_handlers()
    
    def _setup_security_handlers(self):
        """Configurar handlers específicos para logs de seguridad."""
        # Crear directorio de logs si no existe
        log_dir = Path("./logs/security")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Handler para eventos de seguridad críticos
        security_handler = logging.handlers.TimedRotatingFileHandler(
            log_dir / "security.log",
            when="midnight",
            interval=1,
            backupCount=30,
            encoding="utf-8"
        )
        security_handler.setFormatter(ThreatGuardFormatter(include_json=True))
        security_handler.setLevel(logging.WARNING)
        
        self.logger.addHandler(security_handler)
        self.logger.setLevel(logging.INFO)
    
    def alert_detected(self, alert_id: str, severity: str, source: str, message: str, **kwargs):
        """Registrar detección de alerta."""
        extra = {
            'alert_id': alert_id,
            'severity': severity,
            'source': source,
            **kwargs
        }
        self.logger.warning(f"ALERT_DETECTED: {message}", extra=extra)
    
    def vulnerability_found(self, scan_id: str, vulnerability: str, severity: str, target: str, **kwargs):
        """Registrar vulnerabilidad encontrada."""
        extra = {
            'scan_id': scan_id,
            'vulnerability': vulnerability,
            'severity': severity,
            'target': target,
            **kwargs
        }
        self.logger.error(f"VULNERABILITY_FOUND: {vulnerability} en {target}", extra=extra)
    
    def incident_escalated(self, incident_id: str, from_level: str, to_level: str, reason: str, **kwargs):
        """Registrar escalamiento de incidente."""
        extra = {
            'incident_id': incident_id,
            'from_level': from_level,
            'to_level': to_level,
            'reason': reason,
            **kwargs
        }
        self.logger.critical(f"INCIDENT_ESCALATED: {incident_id} escalado de {from_level} a {to_level}", extra=extra)
    
    def login_attempt(self, user: str, success: bool, ip: str, user_agent: str = None, **kwargs):
        """Registrar intento de login."""
        status = "SUCCESS" if success else "FAILED"
        extra = {
            'user': user,
            'success': success,
            'ip': ip,
            'user_agent': user_agent,
            **kwargs
        }
        level = logging.INFO if success else logging.WARNING
        self.logger.log(level, f"LOGIN_ATTEMPT: {status} para usuario {user} desde {ip}", extra=extra)

class PerformanceLogger:
    """Logger para métricas de rendimiento."""
    
    def __init__(self, name: str = "threatguard.performance"):
        self.logger = logging.getLogger(name)
        self._setup_performance_handlers()
    
    def _setup_performance_handlers(self):
        """Configurar handlers para métricas de rendimiento."""
        log_dir = Path("./logs/performance")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        perf_handler = logging.handlers.TimedRotatingFileHandler(
            log_dir / "performance.log",
            when="midnight",
            interval=1,
            backupCount=7,
            encoding="utf-8"
        )
        perf_handler.setFormatter(ThreatGuardFormatter(include_json=True))
        self.logger.addHandler(perf_handler)
        self.logger.setLevel(logging.INFO)
    
    def scan_completed(self, scan_id: str, duration: float, targets_count: int, vulnerabilities_found: int, **kwargs):
        """Registrar finalización de escaneo."""
        extra = {
            'scan_id': scan_id,
            'duration_seconds': duration,
            'targets_count': targets_count,
            'vulnerabilities_found': vulnerabilities_found,
            **kwargs
        }
        self.logger.info(f"SCAN_COMPLETED: {scan_id} en {duration:.2f}s", extra=extra)
    
    def model_training_completed(self, model_name: str, duration: float, accuracy: float, **kwargs):
        """Registrar finalización de entrenamiento de modelo."""
        extra = {
            'model_name': model_name,
            'duration_seconds': duration,
            'accuracy': accuracy,
            **kwargs
        }
        self.logger.info(f"MODEL_TRAINING_COMPLETED: {model_name} - Accuracy: {accuracy:.4f}", extra=extra)

def setup_logging(
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    enable_json: bool = False,
    enable_console: bool = True
) -> logging.Logger:
    """
    Configurar el sistema de logging de ThreatGuard.
    
    Args:
        log_level: Nivel de logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Archivo donde guardar los logs
        enable_json: Si usar formato JSON para los logs
        enable_console: Si mostrar logs en consola
    
    Returns:
        Logger configurado
    """
    
    # Crear logger raíz
    root_logger = logging.getLogger("threatguard")
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Limpiar handlers existentes
    root_logger.handlers.clear()
    
    # Configurar handler de consola
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(ThreatGuardFormatter(include_json=enable_json))
        console_handler.setLevel(getattr(logging, log_level.upper()))
        root_logger.addHandler(console_handler)
    
    # Configurar handler de archivo
    if log_file:
        # Crear directorio si no existe
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setFormatter(ThreatGuardFormatter(include_json=enable_json))
        file_handler.setLevel(getattr(logging, log_level.upper()))
        root_logger.addHandler(file_handler)
    
    return root_logger

def get_logger(name: str) -> logging.Logger:
    """
    Obtener un logger con nombre específico.
    
    Args:
        name: Nombre del logger
        
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)

class LogContext:
    """Contexto para agregar información adicional a los logs."""
    
    def __init__(self, **context):
        self.context = context
    
    def __enter__(self):
        # Agregar contexto a los logs
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Limpiar contexto
        pass

# Instancias globales de loggers especializados
security_logger = SecurityLogger()
performance_logger = PerformanceLogger()

# Configurar logging básico
main_logger = setup_logging(
    log_level="INFO",
    log_file="./logs/threatguard.log",
    enable_console=True
)