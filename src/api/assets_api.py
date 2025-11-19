#!/usr/bin/env python3
"""
API para gestión de inventario de activos
Compatible con Windows, Linux y macOS
"""
import platform
import socket
import psutil
import subprocess
from fastapi import APIRouter, HTTPException
from typing import List, Dict

router = APIRouter()

def get_system_info() -> Dict:
    """Obtener información del sistema de forma multiplataforma"""
    system = platform.system()
    
    info = {
        "hostname": socket.gethostname(),
        "ip": get_local_ip(),
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "status": "Active",
        "agent_name": socket.gethostname()
    }
    
    # Información específica por SO
    if system == "Linux":
        info["os_details"] = get_linux_details()
    elif system == "Windows":
        info["os_details"] = get_windows_details()
    elif system == "Darwin":  # macOS
        info["os_details"] = get_macos_details()
    
    return info

def get_local_ip() -> str:
    """Obtener IP local del sistema"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def get_linux_details() -> Dict:
    """Obtener detalles específicos de Linux"""
    details = {}
    try:
        # Leer /etc/os-release
        with open('/etc/os-release', 'r') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    details[key.lower()] = value.strip('"')
        
        # Kernel version
        details['kernel'] = platform.release()
        
        # Uptime
        with open('/proc/uptime', 'r') as f:
            uptime_seconds = float(f.readline().split()[0])
            details['uptime_hours'] = round(uptime_seconds / 3600, 2)
    except:
        pass
    
    return details

def get_windows_details() -> Dict:
    """Obtener detalles específicos de Windows"""
    details = {}
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion")
        details['product_name'] = winreg.QueryValueEx(key, "ProductName")[0]
        details['build'] = winreg.QueryValueEx(key, "CurrentBuild")[0]
        winreg.CloseKey(key)
    except:
        pass
    
    return details

def get_macos_details() -> Dict:
    """Obtener detalles específicos de macOS"""
    details = {}
    try:
        result = subprocess.run(['sw_vers'], capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                details[key.strip().lower().replace(' ', '_')] = value.strip()
    except:
        pass
    
    return details

@router.get("/system/info")
async def get_system_information():
    """Endpoint para obtener información del sistema"""
    try:
        return get_system_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assets")
async def get_assets():
    """Endpoint para obtener lista de activos"""
    try:
        system_info = get_system_info()
        
        # En un sistema real, esto consultaría una base de datos
        # Por ahora retornamos el sistema actual
        assets = [{
            "id": 1,
            "hostname": system_info["hostname"],
            "ip": system_info["ip"],
            "os": system_info["os"],
            "status": system_info["status"],
            "agent_name": system_info["agent_name"],
            "last_seen": "2024-01-01T00:00:00Z",
            "vulnerabilities_critical": 0,
            "vulnerabilities_high": 0
        }]
        
        return {"assets": assets, "total": len(assets)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assets/{asset_id}")
async def get_asset_details(asset_id: int):
    """Endpoint para obtener detalles de un activo específico"""
    try:
        system_info = get_system_info()
        
        asset = {
            "id": asset_id,
            "hostname": system_info["hostname"],
            "ip": system_info["ip"],
            "os": system_info["os"],
            "os_version": system_info["os_version"],
            "architecture": system_info["architecture"],
            "processor": system_info["processor"],
            "status": system_info["status"],
            "os_details": system_info.get("os_details", {}),
            "memory_total": psutil.virtual_memory().total,
            "memory_available": psutil.virtual_memory().available,
            "disk_usage": psutil.disk_usage('/').percent,
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": psutil.cpu_percent(interval=1)
        }
        
        return asset
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
