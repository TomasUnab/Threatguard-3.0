"""
Configuración de ThreatGuard
============================

Sistema de configuración centralizada que maneja:
- Variables de entorno
- Archivos de configuración INI
- Validación de parámetros
- Configuraciones por defecto
"""

import os
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

class DatabaseSettings:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = int(os.getenv("DB_PORT", "5432"))
        self.name = os.getenv("DB_NAME", "threatguard_db")
        self.user = os.getenv("DB_USER", "threatguard_user")
        self.password = os.getenv("DB_PASSWORD", "secure_password_2024!")
        self.echo = os.getenv("DB_ECHO", "False").lower() == "true"
    
    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

class RedisSettings:
    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "localhost")
        self.port = int(os.getenv("REDIS_PORT", "6379"))
        self.db = int(os.getenv("REDIS_DB", "0"))
        self.password = os.getenv("REDIS_PASSWORD")
    
    @property
    def url(self) -> str:
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"

class OpenVASSettings:
    def __init__(self):
        self.host = os.getenv("OPENVAS_HOST", "localhost")
        self.port = int(os.getenv("OPENVAS_PORT", "9390"))
        self.user = os.getenv("OPENVAS_USER", "admin")
        self.password = os.getenv("OPENVAS_PASSWORD", "admin-password")
        self.socket_timeout = int(os.getenv("OPENVAS_SOCKET_TIMEOUT", "60"))
        self.connection_timeout = int(os.getenv("OPENVAS_CONNECTION_TIMEOUT", "60"))

class SecuritySettings:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")
        self.algorithm = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

class EmailSettings:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.use_tls = os.getenv("SMTP_USE_TLS", "True").lower() == "true"
        self.username = os.getenv("SMTP_USERNAME", "alerts@yourcompany.com")
        self.password = os.getenv("SMTP_PASSWORD", "app-password")
        self.email_from = os.getenv("EMAIL_FROM", "ThreatGuard <alerts@yourcompany.com>")

class SlackSettings:
    def __init__(self):
        self.webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        self.token = os.getenv("SLACK_TOKEN")
        self.channel = os.getenv("SLACK_CHANNEL", "#security-alerts")
        self.username = os.getenv("SLACK_USERNAME", "ThreatGuard Bot")

class MLSettings:
    def __init__(self):
        self.model_path = os.getenv("MODEL_PATH", "./models/")
        self.train_test_split = float(os.getenv("TRAIN_TEST_SPLIT", "0.2"))
        self.random_state = int(os.getenv("RANDOM_STATE", "42"))
        self.cv_folds = int(os.getenv("CV_FOLDS", "5"))
        self.retrain_hours = int(os.getenv("MODEL_RETRAIN_HOURS", "168"))

class APISettings:
    def __init__(self):
        self.host = os.getenv("API_HOST", "0.0.0.0")
        self.port = int(os.getenv("API_PORT", "8000"))
        self.reload = os.getenv("API_RELOAD", "True").lower() == "true"
        self.workers = int(os.getenv("API_WORKERS", "4"))
        cors = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        self.cors_origins = [o.strip() for o in cors.split(",")]

class LoggingSettings:
    def __init__(self):
        self.level = os.getenv("LOG_LEVEL", "INFO")
        self.format = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        self.file = os.getenv("LOG_FILE", "./logs/threatguard.log")
        self.max_size = os.getenv("LOG_MAX_SIZE", "10MB")
        self.backup_count = int(os.getenv("LOG_BACKUP_COUNT", "5"))

class AlertSettings:
    def __init__(self):
        self.high_priority_threshold = float(os.getenv("HIGH_PRIORITY_THRESHOLD", "8.0"))
        self.medium_priority_threshold = float(os.getenv("MEDIUM_PRIORITY_THRESHOLD", "5.0"))
        self.max_alerts_per_minute = int(os.getenv("MAX_ALERTS_PER_MINUTE", "10"))
        self.cooldown_minutes = int(os.getenv("ALERT_COOLDOWN_MINUTES", "5"))

class Settings:
    def __init__(self):
        self.app_name = "ThreatGuard"
        self.app_version = "1.0.0"
        self.description = "Plataforma Inteligente de Monitoreo de Ciberamenazas"
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = os.getenv("DEBUG", "True").lower() == "true"
        
        self.database = DatabaseSettings()
        self.redis = RedisSettings()
        self.openvas = OpenVASSettings()
        self.security = SecuritySettings()
        self.email = EmailSettings()
        self.slack = SlackSettings()
        self.ml = MLSettings()
        self.api = APISettings()
        self.logging = LoggingSettings()
        self.alerts = AlertSettings()
        
        self.elasticsearch_heap_size = os.getenv("ELASTICSEARCH_HEAP_SIZE", "2g")
        self.backup_enabled = os.getenv("BACKUP_ENABLED", "True").lower() == "true"
        self.backup_schedule = os.getenv("BACKUP_SCHEDULE", "0 2 * * *")
        self.backup_retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
        self.ssl_enabled = os.getenv("SSL_ENABLED", "True").lower() == "true"
        self.ssl_cert_path = os.getenv("SSL_CERT_PATH", "./config/ssl/cert.pem")
        self.ssl_key_path = os.getenv("SSL_KEY_PATH", "./config/ssl/key.pem")

settings = Settings()

def get_database_url() -> str:
    """Obtener URL de base de datos."""
    return settings.database.url

def get_redis_url() -> str:
    """Obtener URL de Redis."""
    return settings.redis.url

def is_production() -> bool:
    """Verificar si está en modo producción."""
    return settings.environment.lower() == "production"

def is_development() -> bool:
    """Verificar si está en modo desarrollo."""
    return settings.environment.lower() == "development"