"""
Módulo de Recolección de Datos de ThreatGuard
============================================

 Sistema para recolectar datos de diferentes fuentes de seguridad:
 - OpenVAS - Vulnerabilidades y escaneos
 - Fuentes externas - APIs de threat intelligence
 - Datasets públicos - Para entrenamiento de modelos
"""

from .openvas_integration import OpenVASIntegration, OpenVASClient, OpenVASScanner, create_openvas_integration

__all__ = [
    # OpenVAS Integration
    "OpenVASIntegration",
    "OpenVASClient",
    "OpenVASScanner", 
    "create_openvas_integration"
]