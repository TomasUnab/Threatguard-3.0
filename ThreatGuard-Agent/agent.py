"""
ThreatGuard Agent - Cliente que se conecta al servidor maestro con validación de cumplimiento
"""
import configparser
import requests
import time
import platform
import socket
import psutil
import uuid
from datetime import datetime
from src.utils.network_utils import get_local_ip, validate_master_connection, resolve_ip
from src.utils.logger import setup_logger

logger = setup_logger("ThreatGuard-Agent")

class ThreatGuardAgent:
    def __init__(self, config_path: str = "config/agent.ini"):
        self.config = configparser.ConfigParser()
        self.config.read(config_path)
        
        # Configuración del maestro
        self.master_ip = resolve_ip(self.config.get('master', 'MASTER_IP'))
        self.master_port = self.config.getint('master', 'MASTER_PORT')
        self.master_url = f"http://{self.master_ip}:{self.master_port}"
        
        # Configuración del agente
        self.agent_name = self.config.get('agent', 'AGENT_NAME')
        self.agent_ip = resolve_ip(self.config.get('agent', 'AGENT_IP'))
        self.agent_token = self.config.get('security', 'AGENT_TOKEN')
        
        # Estado de cumplimiento
        self.is_compliant = False
        self.compliance_message = ""
        
        logger.info(f"Agente {self.agent_name} iniciado en {self.agent_ip}")
        logger.info(f"Conectando a maestro en {self.master_url}")
    
    def get_mac_address(self):
        """Obtiene la dirección MAC del equipo"""
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                            for elements in range(0,2*6,2)][::-1])
            return mac
        except:
            return "00:00:00:00:00:00"
    
    def check_antivirus(self):
        """Verifica si hay antivirus activo"""
        try:
            system = platform.system()
            
            if system == "Windows":
                # Verificar Windows Defender
                import subprocess
                result = subprocess.run(
                    ['powershell', 'Get-MpComputerStatus | Select-Object AntivirusEnabled'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                return "True" in result.stdout
            elif system == "Linux":
                # Verificar ClamAV
                import subprocess
                result = subprocess.run(['which', 'clamav'], capture_output=True)
                return result.returncode == 0
            else:
                return False
        except:
            return False
    
    def get_system_info(self):
        """Obtiene información completa del sistema"""
        try:
            system = platform.system()
            hostname = socket.gethostname()
            
            # Información básica del SO
            os_info = {
                "os": system,
                "version": platform.version(),
                "release": platform.release(),
                "architecture": platform.machine(),
                "processor": platform.processor()
            }
            
            # Normalizar tipo de SO
            os_type = system.lower()
            if "windows" in os_type:
                os_type = "windows"
            elif "linux" in os_type:
                os_type = "linux"
            elif "darwin" in os_type:
                os_type = "macos"
            
            # Información del sistema
            info = {
                "hostname": hostname,
                "ip": self.agent_ip,
                "mac": self.get_mac_address(),
                "os_info": os_info,
                "cpu": f"{psutil.cpu_count()} cores",
                "cpu_usage": psutil.cpu_percent(interval=1),
                "ram_total": psutil.virtual_memory().total // (1024 ** 3),  # GB
                "ram_used_percent": psutil.virtual_memory().percent,
                "disk_total": psutil.disk_usage('/').total // (1024 ** 3),  # GB
                "disk_used_percent": psutil.disk_usage('/').percent,
                "antivirus_active": self.check_antivirus(),
                "telemetry_enabled": True,
                "timestamp": datetime.now().isoformat()
            }
            
            return info
        except Exception as e:
            logger.error(f"Error obteniendo info del sistema: {e}")
            return {
                "hostname": self.agent_name,
                "ip": self.agent_ip,
                "mac": self.get_mac_address(),
                "os_info": {"os": "Unknown"},
                "antivirus_active": False,
                "telemetry_enabled": True
            }
    
    def register(self):
        """Registra el agente con el servidor maestro y verifica cumplimiento"""
        try:
            system_info = self.get_system_info()
            
            logger.info(f"Registrando agente: {system_info['hostname']}")
            logger.info(f"Sistema Operativo: {system_info['os_info']['os']} {system_info['os_info'].get('release', '')}")
            logger.info(f"Antivirus: {'✅ Activo' if system_info['antivirus_active'] else '❌ Inactivo'}")
            logger.info(f"Telemetría: {'✅ Activa' if system_info['telemetry_enabled'] else '❌ Inactiva'}")
            
            response = requests.post(
                f"{self.master_url}/agent/register",
                json=system_info,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.is_compliant = data.get('compliance', {}).get('can_operate', False)
                self.compliance_message = data.get('compliance', {}).get('message', '')
                
                logger.info(f"✅ Agente {data.get('action', 'registrado')}: {data.get('hostname')}")
                logger.info(f"   ID: {data.get('agent_id')}")
                
                if self.is_compliant:
                    logger.info(f"   ✅ CUMPLIMIENTO: Agente autorizado para operar")
                else:
                    logger.warning(f"   ❌ NO CUMPLE: {self.compliance_message}")
                    missing = data.get('compliance', {}).get('missing_requirements', [])
                    if missing:
                        logger.warning(f"   Requisitos faltantes:")
                        for req in missing:
                            logger.warning(f"      - {req}")
                
                return True
            elif response.status_code == 403:
                logger.error("❌ Agente BLOQUEADO por incumplimiento")
                self.is_compliant = False
                return False
            else:
                logger.error(f"Error al registrar: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error de conexión: {e}")
            return False
    
    def send_heartbeat(self):
        """Envía heartbeat con información del sistema al maestro"""
        try:
            if not self.is_compliant:
                logger.warning("⚠️  Agente no cumple requisitos - heartbeat bloqueado")
                return False
            
            system_info = self.get_system_info()
            
            response = requests.post(
                f"{self.master_url}/agent/send-data",
                json=system_info,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.debug(f"✅ Datos enviados - Procesados: {data.get('processed', {})}")
                return True
            elif response.status_code == 403:
                logger.error("❌ Agente BLOQUEADO - No puede enviar datos")
                self.is_compliant = False
                return False
            else:
                logger.warning(f"⚠️  Error al enviar datos: {response.status_code}")
                return False
                
        except Exception as e:
            logger.debug(f"Error enviando heartbeat: {e}")
            return False
    
    def run(self):
        """Ejecuta el agente"""
        logger.info("=" * 60)
        logger.info("ThreatGuard Agent - Sistema de Protección Avanzada")
        logger.info("=" * 60)
        
        # Validar conexión al maestro
        if not validate_master_connection(self.master_ip, self.master_port):
            logger.error("❌ No se puede conectar al servidor maestro")
            logger.error(f"   Verificar que {self.master_url} esté accesible")
            return
        
        logger.info(f"✅ Conexión al maestro establecida: {self.master_url}")
        
        # Registrar agente y verificar cumplimiento
        if not self.register():
            logger.error("❌ No se pudo registrar el agente")
            return
        
        if not self.is_compliant:
            logger.error("=" * 60)
            logger.error("❌ AGENTE BLOQUEADO - NO CUMPLE REQUISITOS")
            logger.error("=" * 60)
            logger.error(f"Motivo: {self.compliance_message}")
            logger.error("")
            logger.error("Para operar, el agente debe cumplir con:")
            logger.error("  1. Tag de Sistema Operativo correcto")
            logger.error("  2. Antivirus activo (Windows Defender/ClamAV)")
            logger.error("  3. Telemetría habilitada")
            logger.error("")
            logger.error("Corrija estos problemas e intente nuevamente.")
            logger.error("=" * 60)
            return
        
        logger.info("=" * 60)
        logger.info("✅ AGENTE OPERACIONAL - Cumplimiento verificado")
        logger.info("=" * 60)
        
        # Intervalo de heartbeat desde config
        heartbeat_interval = self.config.getint('monitoring', 'HEARTBEAT_INTERVAL', fallback=30)
        logger.info(f"📡 Enviando datos cada {heartbeat_interval} segundos...")
        
        # Loop principal
        consecutive_failures = 0
        max_failures = 5
        
        while True:
            try:
                if self.send_heartbeat():
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    
                    if consecutive_failures >= max_failures:
                        logger.error(f"❌ {max_failures} fallos consecutivos - Re-registrando...")
                        if not self.register():
                            logger.error("❌ No se pudo re-registrar - Deteniendo agente")
                            break
                        consecutive_failures = 0
                
                time.sleep(heartbeat_interval)
                
            except KeyboardInterrupt:
                logger.info("\n👋 Agente detenido por el usuario")
                break
            except Exception as e:
                logger.error(f"Error en loop principal: {e}")
                time.sleep(heartbeat_interval)

if __name__ == "__main__":
    agent = ThreatGuardAgent()
    agent.run()

if __name__ == "__main__":
    agent = ThreatGuardAgent()
    agent.run()
