"""
Snort Integration - ThreatGuard
================================
Lee alertas de Snort y las envía a ThreatGuard API
"""

import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, List
import requests
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SnortIntegration:
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url
        self.snort_alert_file = os.getenv("SNORT_ALERT_FILE", "/var/log/snort/alert")
        self.last_position = 0
        self.api_available = False
        self.max_retries = 10
        self.retry_delay = 5  # segundos entre reintentos
        
    def wait_for_api(self):
        """Esperar a que la API esté disponible antes de procesar alertas"""
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"🔌 Intentando conectar a la API... (intento {attempt}/{self.max_retries})")
                response = requests.get(f"{self.api_url}/health", timeout=5)
                if response.status_code == 200:
                    logger.info(f"✅ Conexión exitosa con la API en {self.api_url}")
                    self.api_available = True
                    return True
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                logger.warning(f"⏳ API no disponible aún, esperando {self.retry_delay}s... ({attempt}/{self.max_retries})")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay)
            except Exception as e:
                logger.error(f"❌ Error inesperado conectando a API: {e}")
                if attempt < self.max_retries:
                    time.sleep(self.retry_delay)
        
        logger.error(f"❌ No se pudo conectar a la API después de {self.max_retries} intentos")
        return False
        
    def check_api_health(self):
        """Verificar periódicamente que la API sigue disponible"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=3)
            if response.status_code == 200:
                if not self.api_available:
                    logger.info("✅ API está disponible nuevamente")
                self.api_available = True
                return True
        except Exception:
            if self.api_available:
                logger.warning("⚠️ API no responde, intentaremos reconectar...")
            self.api_available = False
        return False
        
    def parse_snort_alert(self, alert_text: str) -> Dict:
        """Parsear alerta de Snort en formato fast (alert_fast.txt)
        Formato: 11/09-00:03:56.046650 [**] [1:1000001:1] "ICMP Ping Detected" [**] [Priority: 0] {ICMP} :: -> ff02::1:ff2e:188f
        """
        import re
        
        if not alert_text or not alert_text.strip():
            return None
        
        alert_data = {
            "source": "Snort IDS",
            "raw_alert": alert_text
        }
        
        # Parsear timestamp: 11/09-00:03:56.046650
        timestamp_match = re.search(r'^(\d{2})/(\d{2})-(\d{2}:\d{2}:\d{2}\.\d+)', alert_text)
        if timestamp_match:
            month = timestamp_match.group(1)
            day = timestamp_match.group(2)
            time_part = timestamp_match.group(3)
            current_year = datetime.now().year
            alert_data["timestamp"] = f"{current_year}-{month}-{day}T{time_part}"
        else:
            alert_data["timestamp"] = datetime.now().isoformat()
        
        # Parsear Rule ID: [1:1000001:1]
        rule_match = re.search(r'\[(\d+):(\d+):(\d+)\]', alert_text)
        if rule_match:
            gid, sid, rev = rule_match.groups()
            alert_data["rule_id"] = f"{gid}:{sid}:{rev}"
        
        # Parsear mensaje/título: "ICMP Ping Detected"
        title_match = re.search(r'"([^"]+)"', alert_text)
        if title_match:
            alert_data["title"] = title_match.group(1)
        else:
            alert_data["title"] = "Snort Alert"
        
        # Parsear prioridad: [Priority: 0]
        priority_match = re.search(r'\[Priority:\s*(\d+)\]', alert_text)
        if priority_match:
            alert_data["priority"] = priority_match.group(1)
        else:
            alert_data["priority"] = "2"
        
        # Parsear protocolo: {ICMP} o {TCP} o {UDP}
        protocol_match = re.search(r'\{(\w+)\}', alert_text)
        if protocol_match:
            alert_data["protocol"] = protocol_match.group(1)
        else:
            alert_data["protocol"] = "Unknown"
        
        # Parsear IPs: {PROTOCOL} IP1:PORT1 -> IP2:PORT2
        # Capturar desde el protocolo hasta el final de la línea
        ip_section_match = re.search(r'\}\s+(.+)$', alert_text)
        if ip_section_match:
            ip_section = ip_section_match.group(1).strip()
            # Dividir por ->
            if '->' in ip_section:
                parts = ip_section.split('->')
                if len(parts) == 2:
                    src = parts[0].strip()
                    dst = parts[1].strip()
                    
                    # Parsear origen (puede incluir puerto)
                    if ':' in src and not '::' in src:  # IPv4 con puerto
                        src_parts = src.rsplit(':', 1)
                        alert_data["source_ip"] = src_parts[0]
                        alert_data["source_port"] = src_parts[1]
                    else:  # IPv6 sin puerto o IPv4 sin puerto
                        alert_data["source_ip"] = src
                        alert_data["source_port"] = None
                    
                    # Parsear destino (puede incluir puerto)
                    if ':' in dst and not '::' in dst:  # IPv4 con puerto
                        dst_parts = dst.rsplit(':', 1)
                        alert_data["destination_ip"] = dst_parts[0]
                        alert_data["destination_port"] = dst_parts[1]
                    else:  # IPv6 sin puerto o IPv4 sin puerto
                        alert_data["destination_ip"] = dst
                        alert_data["destination_port"] = None
        
        return alert_data
    
    def map_severity(self, priority: str) -> str:
        """Mapear prioridad de Snort a severidad de ThreatGuard"""
        priority_map = {
            "0": "BAJA",      # Prioridad 0 (informacional/ICMP normal)
            "1": "ALTA",      # Ataques críticos
            "2": "MEDIA",     # Reconocimiento/escaneos
            "3": "BAJA"       # Anomalías menores
        }
        return priority_map.get(str(priority), "BAJA")  # Por defecto BAJA en lugar de MEDIA
    
    def send_to_threatguard(self, alert_data: Dict):
        """Enviar alerta a ThreatGuard API con información detallada"""
        # Verificar si la API está disponible
        if not self.api_available:
            # Intentar reconectar si no está disponible
            if not self.check_api_health():
                logger.warning("⚠️ API no disponible, alerta no enviada")
                return
        
        try:
            severity = self.map_severity(alert_data.get("priority", "2"))
            
            # Construir descripción detallada
            description_parts = []
            if alert_data.get("protocol"):
                description_parts.append(f"Protocolo: {alert_data['protocol']}")
            if alert_data.get("source_ip"):
                src = alert_data['source_ip']
                if alert_data.get("source_port"):
                    src += f":{alert_data['source_port']}"
                description_parts.append(f"Origen: {src}")
            if alert_data.get("destination_ip"):
                dst = alert_data['destination_ip']
                if alert_data.get("destination_port"):
                    dst += f":{alert_data['destination_port']}"
                description_parts.append(f"Destino: {dst}")
            if alert_data.get("rule_id"):
                description_parts.append(f"Rule ID: {alert_data['rule_id']}")
            
            description = " | ".join(description_parts) if description_parts else "Alerta detectada por Snort"
            
            payload = {
                "source": "Snort IDS",
                "severity": severity,
                "title": alert_data.get("title", "Snort Alert"),
                "description": description,
                "status": "open",
                "ai_classification": severity,
                "ai_confidence": None,
                "raw_data": alert_data,
                "timestamp": alert_data.get("timestamp")
            }
            
            # Usar endpoint optimizado para Snort
            response = requests.post(f"{self.api_url}/snort/alerts", json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info(f"✅ Alerta enviada: {alert_data.get('title')} - {alert_data.get('source_ip', 'N/A')} -> {alert_data.get('destination_ip', 'N/A')}")
                self.api_available = True  # Confirmar que la API está funcionando
            else:
                logger.error(f"❌ Error enviando alerta: {response.status_code}")
                
        except requests.exceptions.Timeout:
            logger.error(f"⏱️ Timeout enviando alerta (>30s)")
            self.api_available = False
        except requests.exceptions.ConnectionError as e:
            logger.error(f"🔌 Error de conexión con API: {e}")
            self.api_available = False
        except Exception as e:
            logger.error(f"Error enviando alerta a ThreatGuard: {e}")
    
    def read_alerts_from_file(self):
        """Leer alertas nuevas del archivo de Snort (formato fast - una línea por alerta)"""
        try:
            # Esperar a que el archivo exista (hasta 30 segundos al inicio)
            if not Path(self.snort_alert_file).exists():
                if self.last_position == 0:  # Primera vez
                    logger.warning(f"Esperando que se cree el archivo: {self.snort_alert_file}")
                    return
                else:
                    logger.warning(f"Archivo de alertas no encontrado: {self.snort_alert_file}")
                    return
            
            with open(self.snort_alert_file, 'r', errors='ignore') as f:
                f.seek(self.last_position)
                content = f.read()
                self.last_position = f.tell()
            
            if not content.strip():
                return
            
            # En formato fast, cada línea es una alerta
            lines = content.strip().split('\n')
            
            for line in lines:
                if line.strip():
                    alert_data = self.parse_snort_alert(line)
                    if alert_data:
                        self.send_to_threatguard(alert_data)
                        
        except PermissionError as e:
            logger.error(f"❌ Sin permisos para leer: {self.snort_alert_file}")
        except Exception as e:
            logger.error(f"Error leyendo alertas de Snort: {e}")
    
    def monitor(self, interval: int = 5):
        """Monitorear continuamente el archivo de alertas"""
        logger.info(f"🔍 Iniciando monitoreo de Snort...")
        
        # Esperar a que la API esté disponible antes de comenzar
        if not self.wait_for_api():
            logger.error("❌ No se pudo establecer conexión con la API. Abortando.")
            return
        
        logger.info(f"🔍 Monitoreando alertas de Snort desde: {self.snort_alert_file}")
        check_counter = 0
        
        while True:
            try:
                # Verificar salud de API cada 10 iteraciones (50 segundos con interval=5)
                check_counter += 1
                if check_counter >= 10:
                    self.check_api_health()
                    check_counter = 0
                
                self.read_alerts_from_file()
                time.sleep(interval)
            except KeyboardInterrupt:
                logger.info("Deteniendo monitoreo de Snort")
                break
            except Exception as e:
                logger.error(f"Error en monitoreo: {e}")
                time.sleep(interval)

if __name__ == "__main__":
    api_url = os.getenv("THREATGUARD_API_URL", "http://localhost:8000")
    integration = SnortIntegration(api_url=api_url)
    integration.monitor()
