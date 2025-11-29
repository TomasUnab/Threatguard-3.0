"""
ThreatGuard Log Agent Service - Servicio de comunicación con el servidor
"""
import requests
import platform
import socket
import psutil
import uuid
from datetime import datetime

class LogAgentService:
    def __init__(self, master_ip: str, master_port: str, agent_name: str):
        self.master_ip = master_ip
        self.master_port = master_port
        self.agent_name = agent_name
        self.master_url = f"http://{master_ip}:{master_port}"
        self.agent_id = None
        self.registered = False
        
    def get_mac_address(self):
        """Obtiene la dirección MAC del equipo"""
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                            for elements in range(0,2*6,2)][::-1])
            return mac
        except:
            return "00:00:00:00:00:00"
    
    def get_local_ip(self):
        """Obtiene la IP local del equipo"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def check_antivirus(self):
        """Verifica si hay antivirus activo"""
        try:
            system = platform.system()
            
            if system == "Windows":
                import subprocess
                result = subprocess.run(
                    ['powershell', '-Command', 'Get-MpComputerStatus | Select-Object -ExpandProperty AntivirusEnabled'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                return "True" in result.stdout
            elif system == "Linux":
                import subprocess
                result = subprocess.run(['which', 'clamav'], capture_output=True)
                return result.returncode == 0
            return False
        except:
            return False
    
    def get_system_info(self):
        """Obtiene información completa del sistema"""
        try:
            system = platform.system()
            hostname = socket.gethostname()
            
            # Normalizar tipo de SO
            os_display = system
            if system == "Windows":
                os_display = f"Windows {platform.release()}"
            elif system == "Linux":
                try:
                    import distro
                    os_display = f"{distro.name()} {distro.version()}"
                except:
                    os_display = f"Linux {platform.release()}"
            elif system == "Darwin":
                os_display = f"macOS {platform.mac_ver()[0]}"
            
            info = {
                "hostname": hostname,
                "agent_name": self.agent_name or hostname,
                "ip": self.get_local_ip(),
                "mac": self.get_mac_address(),
                "os": os_display,
                "os_info": {
                    "os": system,
                    "version": platform.version(),
                    "release": platform.release(),
                    "architecture": platform.machine(),
                    "processor": platform.processor()
                },
                "cpu": f"{psutil.cpu_count()} cores",
                "cpu_usage": psutil.cpu_percent(interval=0.1),
                "ram_total": psutil.virtual_memory().total // (1024 ** 3),
                "ram_used_percent": psutil.virtual_memory().percent,
                "disk_total": psutil.disk_usage('/').total // (1024 ** 3) if platform.system() != "Windows" else psutil.disk_usage('C:').total // (1024 ** 3),
                "disk_used_percent": psutil.disk_usage('/').percent if platform.system() != "Windows" else psutil.disk_usage('C:').percent,
                "antivirus_active": self.check_antivirus(),
                "telemetry_enabled": True,
                "status": "Active",
                "timestamp": datetime.now().isoformat()
            }
            
            return info
        except Exception as e:
            print(f"Error obteniendo info del sistema: {e}")
            return {
                "hostname": socket.gethostname(),
                "agent_name": self.agent_name,
                "ip": self.get_local_ip(),
                "mac": self.get_mac_address(),
                "os": platform.system(),
                "status": "Active",
                "antivirus_active": False,
                "telemetry_enabled": True,
                "timestamp": datetime.now().isoformat()
            }
    
    def register(self):
        """Registra el agente con el servidor maestro"""
        try:
            system_info = self.get_system_info()
            
            print(f"Registrando agente: {system_info['hostname']}")
            print(f"IP: {system_info['ip']}")
            print(f"OS: {system_info['os']}")
            
            response = requests.post(
                f"{self.master_url}/agent/register",
                json=system_info,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.agent_id = data.get('agent_id')
                self.registered = True
                print(f"✅ Agente registrado exitosamente - ID: {self.agent_id}")
                return True
            else:
                print(f"❌ Error registrando agente: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"❌ No se pudo conectar al servidor en {self.master_url}")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def send_heartbeat(self):
        """Envía heartbeat al servidor"""
        try:
            system_info = self.get_system_info()
            
            response = requests.post(
                f"{self.master_url}/agent/heartbeat",
                json={
                    "agent_id": self.agent_id,
                    "hostname": system_info['hostname'],
                    "ip": system_info['ip'],
                    "status": "Active",
                    "cpu_usage": system_info.get('cpu_usage', 0),
                    "ram_used_percent": system_info.get('ram_used_percent', 0),
                    "timestamp": datetime.now().isoformat()
                },
                timeout=10
            )
            
            return response.status_code == 200
        except:
            return False
    
    def send_disconnect_notification(self):
        """Notifica al servidor que el agente se está desconectando"""
        try:
            response = requests.post(
                f"{self.master_url}/agent/disconnect",
                json={
                    "agent_id": self.agent_id,
                    "hostname": socket.gethostname(),
                    "timestamp": datetime.now().isoformat()
                },
                timeout=5
            )
            return response.status_code == 200
        except:
            return False
    
    def run_cycle(self):
        """Ejecuta un ciclo de comunicación con el servidor"""
        if not self.registered:
            self.register()
            
        if self.registered:
            self.send_heartbeat()
        
        # Retorna el número de logs enviados (0 por ahora)
        return 0


# Para testing
if __name__ == "__main__":
    service = LogAgentService(
        master_ip="localhost",
        master_port="8000",
        agent_name="test-agent"
    )
    
    print("Sistema info:")
    info = service.get_system_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    print("\nRegistrando agente...")
    service.register()
