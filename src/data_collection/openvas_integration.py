"""
Integración con OpenVAS/GVM (Greenbone Vulnerability Management)
===============================================================

Módulo para conectar con OpenVAS y realizar escaneos de vulnerabilidades:
- Conexión al servidor GVM
- Configuración de escaneos automatizados  
- Procesamiento de resultados
- Clasificación de vulnerabilidades por criticidad
- Almacenamiento y correlación de datos
"""

import uuid
import time
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from gvm.connections import UnixSocketConnection, TLSConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeTransform
import socket

@dataclass
class Vulnerability:
    """Estructura para vulnerabilidades encontradas."""
    
    id: str
    cve_id: Optional[str]
    name: str
    description: str
    severity: str
    cvss_score: float
    host: str
    port: Optional[int]
    service: Optional[str]
    solution: Optional[str]
    threat: str
    qod: Optional[int]  # Quality of Detection
    scan_id: str
    discovered_at: datetime
    
    @property
    def severity_level(self) -> str:
        """Convertir CVSS score a nivel de severidad."""
        if self.cvss_score >= 9.0:
            return "critical"
        elif self.cvss_score >= 7.0:
            return "high"
        elif self.cvss_score >= 4.0:
            return "medium"
        elif self.cvss_score > 0.0:
            return "low"
        else:
            return "info"

@dataclass
class ScanTarget:
    """Estructura para targets de escaneo."""
    
    name: str
    hosts: List[str]
    port_list: Optional[str] = None
    exclude_hosts: List[str] = None
    alive_test: str = "ICMP Ping"

class OpenVASClient:
    """Cliente para conectar con OpenVAS/GVM."""
    
    def __init__(self, host: str, port: int, username: str, password: str, 
                 socket_timeout: int = 60, connection_timeout: int = 60):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.socket_timeout = socket_timeout
        self.connection_timeout = connection_timeout
        
        self.connection = None
        self.gmp = None
        self.connected = False
    
    def connect(self) -> bool:
        """Establecer conexión con GVM."""
        try:
            # Crear conexión TLS
            self.connection = TLSConnection(
                hostname=self.host,
                port=self.port,
                timeout=self.connection_timeout
            )
            
            # Crear protocolo GMP
            transform = EtreeTransform()
            self.gmp = Gmp(connection=self.connection, transform=transform)
            
            # Autenticar
            self.gmp.authenticate(self.username, self.password)
            
            self.connected = True
            print(f"✅ Conectado a OpenVAS en {self.host}:{self.port}")
            return True
            
        except Exception as e:
            print(f"❌ Error conectando a OpenVAS: {str(e)}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Cerrar conexión con GVM."""
        if self.connection:
            self.connection.disconnect()
            self.connected = False
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
    
    def get_version(self) -> Dict[str, str]:
        """Obtener versión de GVM."""
        if not self.connected:
            return {}
        
        try:
            version_response = self.gmp.get_version()
            return {
                'version': version_response.get('version', 'Unknown'),
                'build': version_response.get('build', 'Unknown')
            }
        except Exception as e:
            print(f"Error obteniendo versión: {str(e)}")
            return {}
    
    def create_target(self, target: ScanTarget) -> Optional[str]:
        """Crear target de escaneo."""
        try:
            # Convertir lista de hosts a string
            hosts_str = ','.join(target.hosts)
            exclude_str = ','.join(target.exclude_hosts) if target.exclude_hosts else ""
            
            response = self.gmp.create_target(
                name=target.name,
                hosts=[hosts_str],
                exclude_hosts=[exclude_str] if exclude_str else None,
                port_list_id=target.port_list,
                alive_test=target.alive_test
            )
            
            target_id = response.get('id')
            print(f"✅ Target creado: {target.name} (ID: {target_id})")
            return target_id
            
        except Exception as e:
            print(f"❌ Error creando target: {str(e)}")
            return None
    
    def get_scan_configs(self) -> List[Dict[str, str]]:
        """Obtener configuraciones de escaneo disponibles."""
        try:
            configs = self.gmp.get_configs()
            config_list = []
            
            for config in configs.xpath('config'):
                config_list.append({
                    'id': config.get('id'),
                    'name': config.find('name').text,
                    'comment': config.find('comment').text if config.find('comment') is not None else ''
                })
            
            return config_list
            
        except Exception as e:
            print(f"Error obteniendo configuraciones: {str(e)}")
            return []
    
    def create_scan_task(self, name: str, target_id: str, config_id: str) -> Optional[str]:
        """Crear tarea de escaneo."""
        try:
            response = self.gmp.create_task(
                name=name,
                config_id=config_id,
                target_id=target_id,
                scanner_id="08b69003-5fc2-4037-a479-93b440211c73"  # OpenVAS Scanner
            )
            
            task_id = response.get('id')
            print(f"✅ Tarea creada: {name} (ID: {task_id})")
            return task_id
            
        except Exception as e:
            print(f"❌ Error creando tarea: {str(e)}")
            return None
    
    def start_scan(self, task_id: str) -> bool:
        """Iniciar escaneo."""
        try:
            self.gmp.start_task(task_id)
            print(f"🚀 Escaneo iniciado: {task_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error iniciando escaneo: {str(e)}")
            return False
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Obtener estado de tarea."""
        try:
            task = self.gmp.get_task(task_id)
            task_elem = task.find('task')
            
            if task_elem is not None:
                status = task_elem.find('status').text
                progress = task_elem.find('progress').text
                
                return {
                    'status': status,
                    'progress': int(progress) if progress and progress.isdigit() else 0,
                    'name': task_elem.find('name').text
                }
            
            return {'status': 'unknown', 'progress': 0}
            
        except Exception as e:
            print(f"Error obteniendo estado: {str(e)}")
            return {'status': 'error', 'progress': 0}
    
    def wait_for_scan_completion(self, task_id: str, timeout: int = 3600) -> bool:
        """Esperar a que termine el escaneo."""
        print(f"⏳ Esperando completar escaneo {task_id}...")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status_info = self.get_task_status(task_id)
            status = status_info['status']
            progress = status_info['progress']
            
            print(f"   Estado: {status} - Progreso: {progress}%")
            
            if status == 'Done':
                print("✅ Escaneo completado")
                return True
            elif status in ['Stopped', 'Interrupted']:
                print(f"❌ Escaneo terminado inesperadamente: {status}")
                return False
            
            time.sleep(30)  # Verificar cada 30 segundos
        
        print(f"⏰ Timeout esperando escaneo ({timeout}s)")
        return False
    
    def get_scan_results(self, task_id: str) -> List[Vulnerability]:
        """Obtener resultados del escaneo."""
        try:
            # Obtener reports de la tarea
            reports = self.gmp.get_reports(task_id=task_id)
            
            vulnerabilities = []
            
            for report in reports.xpath('report'):
                report_id = report.get('id')
                
                # Obtener resultados detallados del report
                detailed_report = self.gmp.get_report(
                    report_id=report_id,
                    filter_string="apply_overrides=0 levels=hmlgd rows=-1 min_qod=70"
                )
                
                # Parsear resultados
                for result in detailed_report.xpath('report/results/result'):
                    vuln = self._parse_vulnerability_result(result, task_id)
                    if vuln:
                        vulnerabilities.append(vuln)
            
            print(f"📊 Encontradas {len(vulnerabilities)} vulnerabilidades")
            return vulnerabilities
            
        except Exception as e:
            print(f"❌ Error obteniendo resultados: {str(e)}")
            return []
    
    def _parse_vulnerability_result(self, result_elem, scan_id: str) -> Optional[Vulnerability]:
        """Parsear resultado individual de vulnerabilidad."""
        try:
            # Información básica
            vuln_id = result_elem.get('id')
            name_elem = result_elem.find('name')
            name = name_elem.text if name_elem is not None else 'Unknown'
            
            # Host y puerto
            host_elem = result_elem.find('host')
            host = host_elem.text if host_elem is not None else 'Unknown'
            
            port_elem = result_elem.find('port')
            port_text = port_elem.text if port_elem is not None else None
            port = int(port_text.split('/')[0]) if port_text and '/' in port_text else None
            
            # Descripción y solución
            description_elem = result_elem.find('description')
            description = description_elem.text if description_elem is not None else ''
            
            # CVSS Score y Severidad
            severity_elem = result_elem.find('severity')
            cvss_score = float(severity_elem.text) if severity_elem is not None and severity_elem.text else 0.0
            
            threat_elem = result_elem.find('threat')
            threat = threat_elem.text if threat_elem is not None else 'Log'
            
            # QoD (Quality of Detection)
            qod_elem = result_elem.find('qod/value')
            qod = int(qod_elem.text) if qod_elem is not None else 0
            
            # CVE ID si está disponible
            cve_id = None
            nvt_elem = result_elem.find('nvt')
            if nvt_elem is not None:
                refs = nvt_elem.findall('.//ref[@type="cve"]')
                if refs:
                    cve_id = refs[0].get('id')
            
            # Crear vulnerabilidad
            vulnerability = Vulnerability(
                id=vuln_id,
                cve_id=cve_id,
                name=name,
                description=description[:1000],  # Limitar descripción
                severity=threat.lower(),
                cvss_score=cvss_score,
                host=host,
                port=port,
                service=None,  # Se puede extraer del puerto
                solution=None,  # Se puede extraer de la descripción
                threat=threat,
                qod=qod,
                scan_id=scan_id,
                discovered_at=datetime.utcnow()
            )
            
            return vulnerability
            
        except Exception as e:
            print(f"Error parseando vulnerabilidad: {str(e)}")
            return None

class OpenVASScanner:
    """Scanner de vulnerabilidades usando OpenVAS."""
    
    def __init__(self, client: OpenVASClient, database_session):
        self.client = client
        self.db_session = database_session
        
    def perform_scan(self, targets: List[str], scan_name: str = None, 
                    config_name: str = "Full and fast") -> Optional[str]:
        """Realizar escaneo completo."""
        if not scan_name:
            scan_name = f"ThreatGuard_Scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"🎯 Iniciando escaneo: {scan_name}")
        print(f"   Targets: {', '.join(targets)}")
        
        if not self.client.connected:
            if not self.client.connect():
                return None
        
        try:
            # 1. Crear target
            scan_target = ScanTarget(
                name=f"{scan_name}_target",
                hosts=targets
            )
            
            target_id = self.client.create_target(scan_target)
            if not target_id:
                return None
            
            # 2. Obtener configuración de escaneo
            configs = self.client.get_scan_configs()
            config_id = None
            
            for config in configs:
                if config_name.lower() in config['name'].lower():
                    config_id = config['id']
                    break
            
            if not config_id:
                print(f"❌ Configuración '{config_name}' no encontrada")
                return None
            
            # 3. Crear tarea
            task_id = self.client.create_scan_task(scan_name, target_id, config_id)
            if not task_id:
                return None
            
            # 4. Iniciar escaneo
            if not self.client.start_scan(task_id):
                return None
            
            print(f"✅ Escaneo iniciado exitosamente (Task ID: {task_id})")
            return task_id
            
        except Exception as e:
            print(f"❌ Error en escaneo: {str(e)}")
            return None
    
    def monitor_and_process_scan(self, task_id: str, timeout: int = 3600) -> List[Vulnerability]:
        """Monitorear escaneo y procesar resultados."""
        # Esperar completar
        if not self.client.wait_for_scan_completion(task_id, timeout):
            return []
        
        # Obtener resultados
        vulnerabilities = self.client.get_scan_results(task_id)
        
        # Guardar en base de datos
        saved_count = 0
        for vuln in vulnerabilities:
            if self._save_vulnerability_to_db(vuln):
                saved_count += 1
        
        print(f"💾 Guardadas {saved_count} vulnerabilidades en BD")
        return vulnerabilities
    
    def _save_vulnerability_to_db(self, vuln: Vulnerability) -> bool:
        """Guardar vulnerabilidad en base de datos."""
        try:
            from ..utils.database import Vulnerability as DBVulnerability
            
            db_vuln = DBVulnerability(
                scan_id=vuln.scan_id,
                target_host=vuln.host,
                target_port=vuln.port,
                cve_id=vuln.cve_id,
                cvss_score=vuln.cvss_score,
                severity=vuln.severity_level,
                vulnerability_name=vuln.name,
                description=vuln.description,
                solution=vuln.solution,
                service=vuln.service,
                raw_output=str(vuln.__dict__),
                discovered_at=vuln.discovered_at
            )
            
            self.db_session.add(db_vuln)
            self.db_session.commit()
            return True
            
        except Exception as e:
            print(f"Error guardando vulnerabilidad: {str(e)}")
            self.db_session.rollback()
            return False

class OpenVASIntegration:
    """Integración completa con OpenVAS."""
    
    def __init__(self, config: Dict[str, Any], database_session):
        self.config = config
        self.db_session = database_session
        
        self.client = OpenVASClient(
            host=config['host'],
            port=config['port'],
            username=config['username'],
            password=config['password'],
            socket_timeout=config.get('socket_timeout', 60),
            connection_timeout=config.get('connection_timeout', 60)
        )
        
        self.scanner = OpenVASScanner(self.client, database_session)
    
    def health_check(self) -> Dict[str, Any]:
        """Verificar estado de OpenVAS."""
        try:
            if self.client.connect():
                version_info = self.client.get_version()
                configs = self.client.get_scan_configs()
                
                self.client.disconnect()
                
                return {
                    'status': 'healthy',
                    'connected': True,
                    'version': version_info.get('version', 'Unknown'),
                    'available_configs': len(configs),
                    'configs': [c['name'] for c in configs[:5]]  # Primeras 5
                }
            else:
                return {
                    'status': 'unhealthy',
                    'connected': False,
                    'error': 'No se pudo conectar'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'connected': False,
                'error': str(e)
            }
    
    def schedule_scan(self, targets: List[str], scan_name: str = None) -> Optional[str]:
        """Programar escaneo."""
        return self.scanner.perform_scan(targets, scan_name)
    
    def get_vulnerability_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de vulnerabilidades."""
        try:
            from ..utils.database import Vulnerability as DBVulnerability
            
            total_vulns = self.db_session.query(DBVulnerability).count()
            critical_vulns = self.db_session.query(DBVulnerability)\
                .filter(DBVulnerability.cvss_score >= 9.0).count()
            high_vulns = self.db_session.query(DBVulnerability)\
                .filter(DBVulnerability.cvss_score >= 7.0, DBVulnerability.cvss_score < 9.0).count()
            
            return {
                'total_vulnerabilities': total_vulns,
                'critical': critical_vulns,
                'high': high_vulns,
                'medium': total_vulns - critical_vulns - high_vulns
            }
            
        except Exception as e:
            print(f"Error obteniendo estadísticas: {str(e)}")
            return {}

def create_openvas_integration(config: Dict[str, Any], database_session) -> OpenVASIntegration:
    """Factory para crear integración con OpenVAS."""
    return OpenVASIntegration(config, database_session)