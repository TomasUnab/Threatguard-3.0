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
    """Endpoint para obtener lista de activos desde la base de datos"""
    import os
    from sqlalchemy import create_engine, text
    from datetime import datetime, timezone
    
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            # Fallback al sistema local si no hay BD
            system_info = get_system_info()
            return {"assets": [{
                "id": 1,
                "hostname": system_info["hostname"],
                "ip": system_info["ip"],
                "os": system_info["os"],
                "status": system_info["status"],
                "agent_name": system_info["agent_name"],
                "last_seen": datetime.now().isoformat(),
                "vulnerabilities_critical": 0,
                "vulnerabilities_high": 0
            }], "total": 1}
        
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, hostname, ip_address, os_type, os_version,
                       antivirus_active, telemetry_enabled, status, risk_score, 
                       last_seen, created_at
                FROM assets
                ORDER BY last_seen DESC NULLS LAST
            """))
            
            assets = []
            for row in result:
                asset_id = str(row[0])
                db_status = row[7]
                last_seen_db = row[9]
                
                # Calcular estado real - timeout de 120 segundos para considerar offline
                if db_status == 'inactive':
                    actual_status = "Offline"
                elif last_seen_db:
                    # Usar hora local sin timezone para comparar correctamente
                    if last_seen_db.tzinfo is not None:
                        last_seen_db = last_seen_db.replace(tzinfo=None)
                    now = datetime.now()
                    seconds_since_last_seen = (now - last_seen_db).total_seconds()
                    actual_status = "Active" if seconds_since_last_seen <= 120 else "Offline"
                else:
                    actual_status = "Offline"
                
                # Construir display de OS
                os_type = row[3] or "Unknown"
                os_version = row[4] or ""
                os_display = f"{os_type.capitalize()} {os_version}".strip()
                
                assets.append({
                    "id": asset_id,
                    "hostname": row[1],
                    "ip": row[2],
                    "os": os_display,
                    "status": actual_status,
                    "agent_name": row[1],  # hostname as agent_name
                    "last_seen": str(row[9]) if row[9] else None,
                    "vulnerabilities_critical": 0,  # TODO: Calcular desde vulnerabilities table
                    "vulnerabilities_high": 0
                })
            
            return {"assets": assets, "total": len(assets)}
            
    except Exception as e:
        print(f"Error getting assets: {e}")
        # Fallback al sistema local
        system_info = get_system_info()
        return {"assets": [{
            "id": 1,
            "hostname": system_info["hostname"],
            "ip": system_info["ip"],
            "os": system_info["os"],
            "status": system_info["status"],
            "agent_name": system_info["agent_name"],
            "last_seen": datetime.now().isoformat() if 'datetime' in dir() else "2024-01-01T00:00:00Z",
            "vulnerabilities_critical": 0,
            "vulnerabilities_high": 0
        }], "total": 1}

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
