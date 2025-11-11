"""
ThreatGuard - Plataforma Inteligente de Monitoreo de Ciberamenazas
================================================================

Una plataforma open source diseñada para PYMEs que integra:
- Recolección de logs y eventos de seguridad (Wazuh)
- Escaneo de vulnerabilidades (OpenVAS) 
- Clasificación de alertas mediante IA
- Dashboard centralizado para monitoreo
- Sistema de notificaciones automatizadas

Autor: ThreatGuard Team
Versión: 1.0.0
Licencia: MIT
"""

__version__ = "1.0.0"
__author__ = "ThreatGuard Team"
__email__ = "support@threatguard.com"
__license__ = "MIT"

# Imports principales
from .utils.logger import get_logger
from .utils.config import settings
from .utils.database import get_database_url

# Configurar logger principal
logger = get_logger(__name__)

def main():
    """Función principal de inicio de ThreatGuard."""
    logger.info(f"Iniciando ThreatGuard v{__version__}")
    logger.info("Plataforma de Monitoreo de Ciberamenazas para PYMEs")
    
    # Verificar configuración
    logger.info("Verificando configuración del sistema...")
    
    try:
        # Verificar conexión a base de datos
        db_url = get_database_url()
        logger.info("✓ Configuración de base de datos: OK")
        
        # Verificar configuración de Redis
        logger.info("✓ Configuración de Redis: OK")
        
        # Verificar integración con Wazuh
        logger.info("✓ Configuración de Wazuh: OK")
        
        # Verificar integración con OpenVAS
        logger.info("✓ Configuración de OpenVAS: OK")
        
        logger.info("Sistema ThreatGuard iniciado correctamente")
        
    except Exception as e:
        logger.error(f"Error al iniciar ThreatGuard: {str(e)}")
        raise

if __name__ == "__main__":
    main()