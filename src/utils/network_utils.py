"""
Utilidades para detección automática de IPs y configuración de red
"""
import socket
from typing import Optional, List

def get_local_ip() -> str:
    """Detecta la IP local principal del sistema"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def get_all_ips() -> List[str]:
    """Obtiene todas las IPs del sistema"""
    import subprocess
    ips = []
    try:
        result = subprocess.run(['ipconfig'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if 'IPv4' in line:
                ip = line.split(':')[-1].strip()
                if ip:
                    ips.append(ip)
    except:
        ips.append(get_local_ip())
    return ips

def validate_master_connection(master_ip: str, master_port: int, timeout: int = 5) -> bool:
    """Valida conexión con el servidor maestro"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((master_ip, master_port))
        sock.close()
        return result == 0
    except:
        return False

def resolve_ip(ip_config: str) -> str:
    """Resuelve configuración de IP (auto o manual)"""
    if ip_config.lower() == "auto":
        return get_local_ip()
    return ip_config
