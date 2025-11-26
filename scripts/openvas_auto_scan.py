#!/usr/bin/env python3
"""
Script de escaneo automático de OpenVAS
Escanea automáticamente los agentes conectados cada 5 minutos
"""
import os
import time
import json
import redis
import logging
from datetime import datetime
from gvm.connections import TLSConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeTransform

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', 'redis_password_2024')
OPENVAS_HOST = os.getenv('OPENVAS_HOST', 'openvas')
OPENVAS_PORT = int(os.getenv('OPENVAS_PORT', 9390))
OPENVAS_USER = os.getenv('OPENVAS_USER', 'admin')
OPENVAS_PASSWORD = os.getenv('OPENVAS_PASSWORD', 'admin')
SCAN_INTERVAL = 60  # 1 minuto para pruebas

# Conectar a Redis
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True
)

def get_active_agents():
    """Obtener IPs de agentes activos desde Redis"""
    try:
        system_info = redis_client.get("system:info")
        if system_info:
            data = json.loads(system_info)
            ip = data.get('ip')
            if ip and ip != '127.0.0.1' and ip != '0.0.0.0':
                return [ip]
    except Exception as e:
        logger.error(f"Error obteniendo agentes: {e}")
    return []

def create_target(gmp, ip):
    """Crear o buscar target en OpenVAS"""
    try:
        # Buscar target existente
        targets = gmp.get_targets(filter_string=f"name=Agent-{ip}")
        existing = targets.xpath(f'//target[name="Agent-{ip}"]/@id')
        
        if existing:
            target_id = existing[0]
            logger.info(f"🔍 Target existente encontrado: {target_id} para {ip}")
            return target_id
        
        # Crear nuevo target
        response = gmp.create_target(
            name=f"Agent-{ip}",
            hosts=[ip],
            port_range="1-65535",
            comment=f"Auto-scan agent {datetime.now()}"
        )
        
        target_id = response.get('id')
        logger.info(f"✅ Target creado: {target_id} para {ip}")
        return target_id
    except Exception as e:
        logger.error(f"❌ Error con target: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def create_task(gmp, target_id, ip):
    """Crear tarea de escaneo"""
    try:
        # Usar el scanner por defecto
        scanners = gmp.get_scanners()
        scanner_id = scanners.xpath('//scanner/@id')[0]
        
        # Usar config rápida
        configs = gmp.get_scan_configs()
        config_id = configs.xpath('//config[name="Full and fast"]/@id')[0]
        
        response = gmp.create_task(
            name=f"Auto-Scan-{ip}-{datetime.now().strftime('%Y%m%d-%H%M')}",
            config_id=config_id,
            target_id=target_id,
            scanner_id=scanner_id
        )
        task_id = response.get('id')
        logger.info(f"✅ Tarea creada: {task_id}")
        return task_id
    except Exception as e:
        logger.error(f"Error creando tarea: {e}")
        return None

def start_task(gmp, task_id):
    """Iniciar escaneo"""
    try:
        gmp.start_task(task_id)
        logger.info(f"🚀 Escaneo iniciado: {task_id}")
        return True
    except Exception as e:
        logger.error(f"Error iniciando escaneo: {e}")
        return False

def check_scan_results(gmp, task_id):
    """Verificar resultados del escaneo"""
    try:
        task = gmp.get_task(task_id)
        status = task.xpath('//task/status/text()')[0]
        progress = task.xpath('//task/progress/text()')[0]
        
        logger.info(f"📊 Estado: {status} - Progreso: {progress}%")
        
        if status == 'Done':
            report_id = task.xpath('//task/last_report/report/@id')[0]
            report = gmp.get_report(report_id)
            
            high = len(report.xpath('//result[threat="High"]'))
            medium = len(report.xpath('//result[threat="Medium"]'))
            low = len(report.xpath('//result[threat="Low"]'))
            
            logger.info(f"🚨 Vulnerabilidades: Alta={high}, Media={medium}, Baja={low}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error verificando resultados: {e}")
        return False

def scan_agents():
    """Escanear todos los agentes activos"""
    agents = get_active_agents()
    
    if not agents:
        logger.info("No hay agentes activos para escanear")
        return
    
    logger.info(f"📡 Agentes detectados: {agents}")
    
    try:
        from gvm.transforms import EtreeTransform
        connection = TLSConnection(
            hostname=OPENVAS_HOST, 
            port=OPENVAS_PORT,
            certfile=None,
            cafile=None,
            keyfile=None
        )
        
        with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
            logger.info(f"🔐 Autenticando con usuario: {OPENVAS_USER}")
            gmp.authenticate(OPENVAS_USER, OPENVAS_PASSWORD)
            logger.info("✅ Conectado y autenticado a OpenVAS")
            
            for ip in agents:
                logger.info(f"🔍 Escaneando {ip}...")
                
                target_id = create_target(gmp, ip)
                if not target_id:
                    continue
                
                # Verificar tareas existentes para este target
                tasks = gmp.get_tasks()
                running = tasks.xpath(f'//task[target/@id="{target_id}" and (status="Running" or status="Requested")]/@id')
                
                if running:
                    task_id = running[0]
                    logger.info(f"⏳ Tarea en progreso: {task_id}")
                    check_scan_results(gmp, task_id)
                else:
                    # Verificar si hay tareas completadas recientes (últimas 24h)
                    done = tasks.xpath(f'//task[target/@id="{target_id}" and status="Done"]/@id')
                    if done:
                        task_id = done[0]
                        logger.info(f"✅ Tarea completada encontrada: {task_id}")
                        check_scan_results(gmp, task_id)
                    else:
                        # Crear nueva tarea
                        task_id = create_task(gmp, target_id, ip)
                        if task_id:
                            start_task(gmp, task_id)
                
    except Exception as e:
        logger.error(f"❌ Error en escaneo automático: {e}")
        import traceback
        logger.error(traceback.format_exc())

def main():
    """Loop principal"""
    logger.info("🛡️ ThreatGuard Auto-Scan iniciado")
    logger.info(f"⏱️ Intervalo de escaneo: {SCAN_INTERVAL} segundos")
    
    while True:
        try:
            scan_agents()
        except Exception as e:
            logger.error(f"Error en loop principal: {e}")
        
        logger.info(f"⏳ Esperando {SCAN_INTERVAL} segundos...")
        time.sleep(SCAN_INTERVAL)

if __name__ == "__main__":
    main()
