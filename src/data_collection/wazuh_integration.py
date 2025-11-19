"""
Integración con Wazuh SIEM
==========================

Módulo para conectar con Wazuh y recolectar logs y eventos de seguridad:
- Conexión a la API de Wazuh
- Recolección de alertas en tiempo real
- Procesamiento de logs de agentes
- Normalización de datos
- Almacenamiento en base de datos
"""

import json
import asyncio
import requests
from typing import Dict, List, Optional, Any, Generator
from datetime import datetime, timedelta
from dataclasses import dataclass
import urllib3
from requests.auth import HTTPBasicAuth
import base64
import time

# Suprimir warnings de SSL no verificado
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@dataclass
class WazuhAlert:
    """Estructura para alertas de Wazuh."""
    
    id: str
    timestamp: datetime
    agent_id: str
    agent_name: str
    rule_id: int
    rule_level: int
    rule_description: str
    location: str
    full_log: str
    decoded_fields: Dict[str, Any]
    classification: Optional[str] = None
    severity: Optional[str] = None
    
    @property
    def severity_from_level(self) -> str:
        """Calcular severidad basada en el nivel de regla."""
        if self.rule_level >= 12:
            return "high"
        elif self.rule_level >= 7:
            return "medium"
        else:
            return "low"

class WazuhAPIClient:
    """Cliente para la API de Wazuh."""
    
    def __init__(self, host: str, port: int, username: str, password: str, verify_ssl: bool = False):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.verify_ssl = verify_ssl
        self.base_url = f"{'https' if verify_ssl else 'http'}://{host}:{port}"
        self.session = requests.Session()
        self.token = None
        self.token_expires = None
        
    def authenticate(self) -> bool:
        """Autenticar con la API de Wazuh."""
        try:
            auth_url = f"{self.base_url}/security/user/authenticate"
            auth = HTTPBasicAuth(self.username, self.password)
            
            response = self.session.get(
                auth_url,
                auth=auth,
                verify=self.verify_ssl,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('data', {}).get('token')
                # Token expira en 15 minutos por defecto
                self.token_expires = datetime.now() + timedelta(minutes=14)
                
                # Establecer header de autorización
                self.session.headers.update({
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                })
                return True
            else:
                print(f"Error de autenticación: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error conectando a Wazuh API: {str(e)}")
            return False
    
    def _ensure_authenticated(self) -> bool:
        """Asegurar que tenemos un token válido."""
        if not self.token or (self.token_expires and datetime.now() >= self.token_expires):
            return self.authenticate()
        return True
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None, data: Dict = None) -> Optional[Dict]:
        """Hacer petición a la API con manejo de errores."""
        if not self._ensure_authenticated():
            return None
            
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=data,
                verify=self.verify_ssl,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                # Token expirado, intentar reautenticar
                if self.authenticate():
                    response = self.session.request(
                        method=method,
                        url=url,
                        params=params,
                        json=data,
                        verify=self.verify_ssl,
                        timeout=30
                    )
                    return response.json() if response.status_code == 200 else None
            else:
                print(f"Error en petición API: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error en petición HTTP: {str(e)}")
            return None
    
    def get_agents(self) -> List[Dict]:
        """Obtener lista de agentes conectados."""
        response = self._make_request('GET', '/agents')
        if response and 'data' in response:
            return response['data']['affected_items']
        return []
    
    def get_alerts(self, limit: int = 1000, offset: int = 0, 
                   start_time: datetime = None, end_time: datetime = None,
                   agent_id: str = None, rule_level: int = None) -> List[Dict]:
        """Obtener alertas de Wazuh."""
        params = {
            'limit': limit,
            'offset': offset,
            'sort': '-timestamp'
        }
        
        if start_time:
            params['time_since'] = start_time.strftime('%Y-%m-%dT%H:%M:%S')
        if end_time:
            params['time_until'] = end_time.strftime('%Y-%m-%dT%H:%M:%S')
        if agent_id:
            params['agent_id'] = agent_id
        if rule_level:
            params['rule_level'] = rule_level
        
        response = self._make_request('GET', '/alerts', params=params)
        if response and 'data' in response:
            return response['data']['affected_items']
        return []
    
    def get_rules(self) -> List[Dict]:
        """Obtener reglas de detección."""
        response = self._make_request('GET', '/rules')
        if response and 'data' in response:
            return response['data']['affected_items']
        return []
    
    def get_system_info(self) -> Dict:
        """Obtener información del sistema Wazuh."""
        response = self._make_request('GET', '/manager/info')
        if response and 'data' in response:
            return response['data']['affected_items'][0]
        return {}

class WazuhLogProcessor:
    """Procesador de logs de Wazuh."""
    
    def __init__(self, api_client: WazuhAPIClient):
        self.api_client = api_client
        self.last_processed = datetime.now() - timedelta(hours=1)
        
    def normalize_alert(self, raw_alert: Dict) -> WazuhAlert:
        """Normalizar alerta de Wazuh a formato estándar."""
        try:
            alert = WazuhAlert(
                id=raw_alert.get('id', ''),
                timestamp=datetime.fromisoformat(raw_alert.get('timestamp', '').replace('Z', '+00:00')),
                agent_id=raw_alert.get('agent', {}).get('id', ''),
                agent_name=raw_alert.get('agent', {}).get('name', ''),
                rule_id=raw_alert.get('rule', {}).get('id', 0),
                rule_level=raw_alert.get('rule', {}).get('level', 0),
                rule_description=raw_alert.get('rule', {}).get('description', ''),
                location=raw_alert.get('location', ''),
                full_log=raw_alert.get('full_log', ''),
                decoded_fields=raw_alert.get('decoder', {})
            )
            
            # Asignar severidad basada en el nivel
            alert.severity = alert.severity_from_level
            
            # Clasificación básica basada en reglas
            alert.classification = self._classify_alert(alert)
            
            return alert
            
        except Exception as e:
            print(f"Error normalizando alerta: {str(e)}")
            return None
    
    def _classify_alert(self, alert: WazuhAlert) -> str:
        """Clasificación básica de alertas."""
        rule_desc = alert.rule_description.lower()
        
        if any(keyword in rule_desc for keyword in ['attack', 'intrusion', 'malware', 'exploit']):
            return 'attack'
        elif any(keyword in rule_desc for keyword in ['login', 'authentication', 'access']):
            return 'authentication'
        elif any(keyword in rule_desc for keyword in ['firewall', 'blocked', 'denied']):
            return 'network_security'
        elif any(keyword in rule_desc for keyword in ['file', 'integrity', 'modified']):
            return 'file_integrity'
        else:
            return 'other'
    
    def process_new_alerts(self) -> Generator[WazuhAlert, None, None]:
        """Procesar nuevas alertas desde la última ejecución."""
        end_time = datetime.now()
        
        try:
            raw_alerts = self.api_client.get_alerts(
                start_time=self.last_processed,
                end_time=end_time,
                limit=10000
            )
            
            processed_count = 0
            for raw_alert in raw_alerts:
                normalized_alert = self.normalize_alert(raw_alert)
                if normalized_alert:
                    yield normalized_alert
                    processed_count += 1
            
            self.last_processed = end_time
            print(f"Procesadas {processed_count} alertas de Wazuh")
            
        except Exception as e:
            print(f"Error procesando alertas: {str(e)}")
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de agentes."""
        agents = self.api_client.get_agents()
        
        stats = {
            'total_agents': len(agents),
            'active_agents': len([a for a in agents if a.get('status') == 'active']),
            'disconnected_agents': len([a for a in agents if a.get('status') == 'disconnected']),
            'agents_by_os': {}
        }
        
        # Agrupar por OS
        for agent in agents:
            os_name = agent.get('os', {}).get('name', 'Unknown')
            stats['agents_by_os'][os_name] = stats['agents_by_os'].get(os_name, 0) + 1
        
        return stats

class WazuhIntegration:
    """Integración completa con Wazuh."""
    
    def __init__(self, config: Dict[str, Any], database_session):
        self.config = config
        self.db_session = database_session
        
        self.api_client = WazuhAPIClient(
            host=config['host'],
            port=config['port'],
            username=config['username'],
            password=config['password'],
            verify_ssl=config.get('verify_ssl', False)
        )
        
        self.log_processor = WazuhLogProcessor(self.api_client)
        self.running = False
    
    async def start_monitoring(self, poll_interval: int = 60):
        """Iniciar monitoreo continuo de alertas."""
        print("Iniciando monitoreo de Wazuh...")
        
        if not self.api_client.authenticate():
            raise Exception("No se pudo autenticar con Wazuh API")
        
        self.running = True
        
        while self.running:
            try:
                # Procesar nuevas alertas
                alert_count = 0
                for alert in self.log_processor.process_new_alerts():
                    # Guardar alerta en base de datos
                    self._save_alert_to_db(alert)
                    alert_count += 1
                
                if alert_count > 0:
                    print(f"Procesadas {alert_count} nuevas alertas")
                
                # Esperar antes del siguiente ciclo
                await asyncio.sleep(poll_interval)
                
            except Exception as e:
                print(f"Error en monitoreo: {str(e)}")
                await asyncio.sleep(10)  # Espera corta en caso de error
    
    def _save_alert_to_db(self, alert: WazuhAlert):
        """Guardar alerta en base de datos."""
        try:
            from ..utils.database import Alert
            
            db_alert = Alert(
                source='wazuh',
                severity=alert.severity,
                title=alert.rule_description,
                description=alert.full_log,
                raw_data={
                    'rule_id': alert.rule_id,
                    'rule_level': alert.rule_level,
                    'agent_id': alert.agent_id,
                    'agent_name': alert.agent_name,
                    'location': alert.location,
                    'classification': alert.classification,
                    'decoded_fields': alert.decoded_fields
                },
                timestamp=alert.timestamp,
                detection_time=datetime.utcnow()
            )
            
            self.db_session.add(db_alert)
            self.db_session.commit()
            
        except Exception as e:
            print(f"Error guardando alerta en BD: {str(e)}")
            self.db_session.rollback()
    
    def stop_monitoring(self):
        """Detener monitoreo."""
        print("Deteniendo monitoreo de Wazuh...")
        self.running = False
    
    def get_health_status(self) -> Dict[str, Any]:
        """Obtener estado de salud de la integración."""
        try:
            # Verificar conectividad
            system_info = self.api_client.get_system_info()
            agent_stats = self.log_processor.get_agent_stats()
            
            return {
                'status': 'healthy',
                'api_connected': True,
                'wazuh_version': system_info.get('version', 'Unknown'),
                'last_processed': self.log_processor.last_processed.isoformat(),
                'agent_stats': agent_stats
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'api_connected': False,
                'error': str(e)
            }

def create_wazuh_integration(config: Dict[str, Any], database_session) -> WazuhIntegration:
    """Factory para crear integración con Wazuh."""
    return WazuhIntegration(config, database_session)