""""""

ThreatGuard - Integración con OpenVASScript de Configuración de OpenVAS

=======================================================================



Sistema completo de integración con OpenVAS para escaneo de Script para configurar y probar la integración con OpenVAS:

vulnerabilidades y evaluación de activos críticos.- Verificar conectividad con GVM

"""- Configurar targets y escaneos

- Probar funcionalidades básicas

import requests- Ejecutar escaneo de prueba

import json"""

import time

import osimport sys

import xml.etree.ElementTree as ETimport asyncio

from pathlib import Pathfrom typing import List, Dict, Any

from typing import Dict, List, Optional, Anyfrom pathlib import Path

from datetime import datetime

import urllib3# Agregar el directorio raíz al path

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)sys.path.append(str(Path(__file__).parent.parent.parent))



class OpenVASManager:from src.utils.config import settings

    """Gestor principal para OpenVAS."""from src.utils.logger import get_logger

    from src.data_collection.openvas_integration import OpenVASClient, OpenVASIntegration, ScanTarget

    def __init__(self, config_file="config/openvas_config.json"):from src.utils.database import get_db

        self.config_path = Path(config_file)

        self.config = self.load_config()logger = get_logger(__name__)

        self.session = requests.Session()

        self.session.verify = Falsedef test_openvas_connection(config: Dict[str, Any]) -> bool:

            """Probar conexión con OpenVAS."""

    def load_config(self) -> Dict[str, Any]:    print("🔍 Probando conexión con OpenVAS/GVM...")

        """Cargar configuración de OpenVAS."""    

        default_config = {    try:

            "openvas": {        with OpenVASClient(

                "host": "localhost",            host=config['host'],

                "port": 9392,            port=config['port'],

                "username": "admin",            username=config['username'],

                "password": "admin",            password=config['password']

                "protocol": "https"        ) as client:

            },            

            "greenbone": {            if client.connected:

                "host": "localhost",                print("✅ Conexión exitosa con OpenVAS/GVM")

                "port": 9390,                

                "username": "admin",                # Obtener información de versión

                "password": "admin"                version_info = client.get_version()

            },                print(f"   Versión GVM: {version_info.get('version', 'N/A')}")

            "docker": {                print(f"   Build: {version_info.get('build', 'N/A')}")

                "compose_file": "openvas-docker/docker-compose.yml",                

                "image": "greenbone/greenbone-community-container",                return True

                "data_volume": "openvas_data"            else:

            },                print("❌ No se pudo conectar con OpenVAS")

            "scan_configs": {                return False

                "quick_scan": "daba56c8-73ec-11df-a475-002264764cea",                

                "full_scan": "74db13d6-7489-11df-a475-002264764cea",    except Exception as e:

                "web_scan": "bbca7412-a950-11e3-9109-406186ea4fc5"        print(f"❌ Error conectando a OpenVAS: {str(e)}")

            },        return False

            "targets": []

        }def list_scan_configurations(config: Dict[str, Any]):

            """Listar configuraciones de escaneo disponibles."""

        if self.config_path.exists():    print("📋 Configuraciones de escaneo disponibles:")

            with open(self.config_path, 'r') as f:    

                user_config = json.load(f)    try:

                default_config.update(user_config)        with OpenVASClient(

        else:            host=config['host'],

            # Crear archivo de configuración por defecto            port=config['port'],

            self.config_path.parent.mkdir(parents=True, exist_ok=True)            username=config['username'],

            with open(self.config_path, 'w') as f:            password=config['password']

                json.dump(default_config, f, indent=4)        ) as client:

                    

        return default_config            configs = client.get_scan_configs()

                

    def setup_docker_environment(self):            if configs:

        """Configurar entorno Docker para OpenVAS."""                for i, config_item in enumerate(configs, 1):

        print("🐳 Configurando entorno Docker para OpenVAS...")                    print(f"   {i:2d}. {config_item['name']}")

                            if config_item['comment']:

        # Crear directorio docker                        print(f"       {config_item['comment']}")

        docker_dir = Path("openvas-docker")                print(f"\n✅ Total: {len(configs)} configuraciones")

        docker_dir.mkdir(exist_ok=True)            else:

                        print("   ⚠️ No se encontraron configuraciones")

        # Crear docker-compose.yml                

        self._create_docker_compose()    except Exception as e:

                print(f"❌ Error obteniendo configuraciones: {str(e)}")

        print("✅ Entorno Docker para OpenVAS configurado")

        return Truedef test_target_creation(config: Dict[str, Any]) -> bool:

        """Probar creación de targets."""

    def _create_docker_compose(self):    print("🎯 Probando creación de targets...")

        """Crear archivo docker-compose.yml para OpenVAS."""    

        docker_compose_content = """version: '3.7'    try:

        with OpenVASClient(

services:            host=config['host'],

  greenbone-community-edition:            port=config['port'],

    image: greenbone/greenbone-community-container:latest            username=config['username'],

    restart: unless-stopped            password=config['password']

    ports:        ) as client:

      - "9392:9392"  # GSA Web Interface            

      - "9390:9390"  # GMP (Greenbone Management Protocol)            # Crear target de prueba

    volumes:            test_target = ScanTarget(

      - greenbone_data:/usr/local/var/lib/gvm                name="ThreatGuard_Test_Target",

      - greenbone_log:/usr/local/var/log/gvm                hosts=["127.0.0.1", "scanme.nmap.org"],

      - greenbone_run:/usr/local/var/run                alive_test="ICMP Ping"

    environment:            )

      - PASSWORD=admin123  # Change this password!            

      - USERNAME=admin            target_id = client.create_target(test_target)

    healthcheck:            

      test: ["CMD-SHELL", "curl -f http://localhost:9392/ || exit 1"]            if target_id:

      interval: 30s                print(f"✅ Target creado exitosamente: {target_id}")

      timeout: 10s                return True

      retries: 5            else:

      start_period: 120s                print("❌ Error creando target")

                return False

  # Optional: PostgreSQL para almacenamiento de datos                

  postgresql:    except Exception as e:

    image: postgres:13        print(f"❌ Error en prueba de target: {str(e)}")

    restart: unless-stopped        return False

    environment:

      - POSTGRES_USER=gvmddef run_test_scan(config: Dict[str, Any], targets: List[str] = None) -> bool:

      - POSTGRES_PASSWORD=gvmd_password    """Ejecutar escaneo de prueba."""

      - POSTGRES_DB=gvmd    if not targets:

    volumes:        targets = ["scanme.nmap.org"]  # Host de prueba público

      - postgresql_data:/var/lib/postgresql/data    

    networks:    print(f"🚀 Ejecutando escaneo de prueba en: {', '.join(targets)}")

      - greenbone_network    print("   ⚠️ Este proceso puede tomar varios minutos...")

    

  # Optional: Redis para cache    try:

  redis:        db_session = next(get_db())

    image: redis:6        

    restart: unless-stopped        # Crear integración

    volumes:        integration = OpenVASIntegration(config, db_session)

      - redis_data:/data        

    networks:        # Verificar salud del sistema

      - greenbone_network        health = integration.health_check()

        if health['status'] != 'healthy':

volumes:            print(f"❌ Sistema no saludable: {health}")

  greenbone_data:            return False

    driver: local        

  greenbone_log:        # Iniciar escaneo

    driver: local        task_id = integration.schedule_scan(

  greenbone_run:            targets=targets,

    driver: local            scan_name="ThreatGuard_Test_Scan"

  postgresql_data:        )

    driver: local        

  redis_data:        if not task_id:

    driver: local            print("❌ No se pudo iniciar el escaneo")

            return False

networks:        

  greenbone_network:        print(f"   Task ID: {task_id}")

    driver: bridge        

"""        # Monitorear progreso (timeout reducido para prueba)

                print("   Monitoreando progreso (timeout: 10 minutos)...")

        compose_file = Path("openvas-docker/docker-compose.yml")        

        with open(compose_file, 'w') as f:        vulnerabilities = integration.scanner.monitor_and_process_scan(

            f.write(docker_compose_content)            task_id, 

                    timeout=600  # 10 minutos para prueba

        print(f"✅ Creado: {compose_file}")        )

            

    def start_openvas_stack(self):        if vulnerabilities:

        """Iniciar stack de OpenVAS con Docker."""            print(f"✅ Escaneo completado: {len(vulnerabilities)} vulnerabilidades encontradas")

        print("🚀 Iniciando stack de OpenVAS...")            

                    # Mostrar resumen

        try:            severity_counts = {}

            compose_file = Path("openvas-docker/docker-compose.yml")            for vuln in vulnerabilities:

            if not compose_file.exists():                severity = vuln.severity_level

                print("❌ Archivo docker-compose.yml no encontrado")                severity_counts[severity] = severity_counts.get(severity, 0) + 1

                return False            

                        print("   📊 Resumen por severidad:")

            import subprocess            for severity, count in severity_counts.items():

            result = subprocess.run([                print(f"      {severity.capitalize()}: {count}")

                "docker-compose", "-f", str(compose_file), "up", "-d"            

            ], cwd=compose_file.parent, capture_output=True, text=True)            return True

                    else:

            if result.returncode == 0:            print("✅ Escaneo completado sin vulnerabilidades")

                print("✅ Stack de OpenVAS iniciado correctamente")            return True

                print("📊 Servicios disponibles:")            

                print("   • GSA Web Interface: https://localhost:9392")    except Exception as e:

                print("   • GMP Protocol: localhost:9390")        print(f"❌ Error en escaneo de prueba: {str(e)}")

                print("   • Usuario: admin | Password: admin123")        return False

                print("\n⏳ Espere 2-3 minutos para la inicialización completa...")

                return Truedef check_database_integration(config: Dict[str, Any]):

            else:    """Verificar integración con base de datos."""

                print(f"❌ Error iniciando stack: {result.stderr}")    print("💾 Verificando integración con base de datos...")

                return False    

                    try:

        except Exception as e:        db_session = next(get_db())

            print(f"❌ Error: {e}")        integration = OpenVASIntegration(config, db_session)

            return False        

            # Obtener estadísticas

    def stop_openvas_stack(self):        stats = integration.get_vulnerability_stats()

        """Detener stack de OpenVAS."""        

        print("🛑 Deteniendo stack de OpenVAS...")        print("✅ Base de datos accesible")

                print(f"   Total vulnerabilidades: {stats.get('total_vulnerabilities', 0)}")

        try:        print(f"   Críticas: {stats.get('critical', 0)}")

            compose_file = Path("openvas-docker/docker-compose.yml")        print(f"   Altas: {stats.get('high', 0)}")

            if not compose_file.exists():        

                return False        return True

                    

            import subprocess    except Exception as e:

            result = subprocess.run([        print(f"❌ Error con base de datos: {str(e)}")

                "docker-compose", "-f", str(compose_file), "down"        return False

            ], cwd=compose_file.parent, capture_output=True, text=True)

            def setup_scan_profiles():

            if result.returncode == 0:    """Configurar perfiles de escaneo personalizados."""

                print("✅ Stack de OpenVAS detenido")    print("⚙️ Configurando perfiles de escaneo...")

                return True    

            else:    # Definir perfiles personalizados para ThreatGuard

                print(f"❌ Error deteniendo stack: {result.stderr}")    profiles = {

                return False        'threatguard_quick': {

                            'name': 'ThreatGuard Quick Scan',

        except Exception as e:            'description': 'Escaneo rápido para detección básica de vulnerabilidades',

            print(f"❌ Error: {e}")            'targets': ['common_ports', 'web_services'],

            return False            'timeout': '30m'

            },

    def test_openvas_connection(self) -> bool:        'threatguard_full': {

        """Probar conexión con OpenVAS."""            'name': 'ThreatGuard Full Scan', 

        print("🔍 Probando conexión con OpenVAS...")            'description': 'Escaneo completo con todas las pruebas de vulnerabilidades',

                    'targets': ['all_ports', 'all_services'],

        openvas_config = self.config['openvas']            'timeout': '4h'

        base_url = f"{openvas_config['protocol']}://{openvas_config['host']}:{openvas_config['port']}"        },

                'threatguard_web': {

        try:            'name': 'ThreatGuard Web Application Scan',

            # Test simple HTTP connection            'description': 'Especializado en vulnerabilidades de aplicaciones web',

            response = self.session.get(            'targets': ['web_ports', 'web_services'],

                base_url,            'timeout': '2h'

                timeout=10,        }

                verify=False    }

            )    

                # Guardar configuración

            if response.status_code in [200, 302, 401]:    config_file = Path("./config/openvas_scan_profiles.json")

                print("✅ Conexión exitosa con OpenVAS")    config_file.parent.mkdir(parents=True, exist_ok=True)

                print(f"   URL: {base_url}")    

                print(f"   Status: {response.status_code}")    import json

                return True    with open(config_file, 'w', encoding='utf-8') as f:

            else:        json.dump(profiles, f, indent=2, ensure_ascii=False)

                print(f"❌ Error de conexión: Status {response.status_code}")    

                return False    print(f"✅ Perfiles guardados en: {config_file}")

                    print("   Perfiles disponibles:")

        except requests.RequestException as e:    for profile_id, profile in profiles.items():

            print(f"❌ Error de conexión: {e}")        print(f"   - {profile['name']}: {profile['description']}")

            return False

    def generate_scan_schedule():

    def create_scan_target(self, name: str, hosts: str) -> Optional[str]:    """Generar programa de escaneos automáticos."""

        """Crear un target para escaneo."""    print("📅 Generando programa de escaneos...")

        print(f"🎯 Creando target de escaneo: {name}")    

            schedule_config = {

        # Para este ejemplo simplificado, almacenamos en config        'enabled': True,

        target = {        'schedules': [

            "id": f"target_{int(time.time())}",            {

            "name": name,                'name': 'Daily Quick Scan',

            "hosts": hosts,                'profile': 'threatguard_quick',

            "created": datetime.now().isoformat()                'targets': ['internal_network'],

        }                'cron': '0 2 * * *',  # Diario a las 2 AM

                        'enabled': True

        self.config['targets'].append(target)            },

        self.save_config()            {

                        'name': 'Weekly Full Scan',

        print(f"✅ Target creado: {target['id']}")                'profile': 'threatguard_full', 

        return target['id']                'targets': ['all_networks'],

                    'cron': '0 0 * * 0',  # Domingos a medianoche

    def save_config(self):                'enabled': True

        """Guardar configuración actualizada."""            },

        with open(self.config_path, 'w') as f:            {

            json.dump(self.config, f, indent=4)                'name': 'Web App Scan',

                    'profile': 'threatguard_web',

    def list_scan_targets(self) -> List[Dict]:                'targets': ['web_servers'],

        """Listar targets de escaneo."""                'cron': '0 1 * * 3',  # Miércoles a la 1 AM

        print("🎯 Targets de escaneo configurados:")                'enabled': False

                    }

        targets = self.config.get('targets', [])        ]

            }

        if not targets:    

            print("   No hay targets configurados")    schedule_file = Path("./config/scan_schedule.json")

            return []    

            import json

        for target in targets:    with open(schedule_file, 'w', encoding='utf-8') as f:

            print(f"   • {target['name']} ({target['hosts']}) - ID: {target['id']}")        json.dump(schedule_config, f, indent=2, ensure_ascii=False)

            

        return targets    print(f"✅ Programa guardado en: {schedule_file}")

    

    def simulate_vulnerability_scan(self, target_id: str, scan_type: str = "quick_scan"):def main():

        """Simular un escaneo de vulnerabilidades."""    """Función principal del script de configuración."""

        print(f"🔍 Simulando escaneo de vulnerabilidades...")    print("🛡️ ThreatGuard - Configuración de OpenVAS")

            print("=" * 50)

        # Buscar target    

        target = None    # Configuración de OpenVAS desde settings

        for t in self.config.get('targets', []):    openvas_config = {

            if t['id'] == target_id:        'host': settings.openvas.host,

                target = t        'port': settings.openvas.port,

                break        'username': settings.openvas.user,

                'password': settings.openvas.password,

        if not target:        'socket_timeout': settings.openvas.socket_timeout,

            print("❌ Target no encontrado")        'connection_timeout': settings.openvas.connection_timeout

            return None    }

            

        print(f"   Target: {target['name']} ({target['hosts']})")    print(f"Host: {openvas_config['host']}:{openvas_config['port']}")

        print(f"   Tipo: {scan_type}")    print(f"Usuario: {openvas_config['username']}")

            print("")

        # Simular progreso de escaneo    

        for progress in [10, 30, 50, 75, 90, 100]:    # Paso 1: Probar conexión

            print(f"   Progreso: {progress}%")    if not test_openvas_connection(openvas_config):

            time.sleep(0.5)        print("❌ No se pudo conectar a OpenVAS. Verificar configuración.")

                return False

        # Simular resultados    

        vulnerabilities = self._generate_sample_vulnerabilities(target['hosts'])    print("")

            

        scan_result = {    # Paso 2: Listar configuraciones

            "scan_id": f"scan_{int(time.time())}",    list_scan_configurations(openvas_config)

            "target_id": target_id,    print("")

            "target_name": target['name'],    

            "scan_type": scan_type,    # Paso 3: Probar creación de targets

            "start_time": datetime.now().isoformat(),    if test_target_creation(openvas_config):

            "status": "completed",        print("✅ Creación de targets funcionando")

            "vulnerabilities": vulnerabilities,    else:

            "summary": {        print("⚠️ Problemas con creación de targets")

                "total": len(vulnerabilities),    

                "critical": len([v for v in vulnerabilities if v['severity'] == 'Critical']),    print("")

                "high": len([v for v in vulnerabilities if v['severity'] == 'High']),    

                "medium": len([v for v in vulnerabilities if v['severity'] == 'Medium']),    # Paso 4: Verificar base de datos

                "low": len([v for v in vulnerabilities if v['severity'] == 'Low'])    if check_database_integration(openvas_config):

            }        print("✅ Integración con BD funcionando")

        }    else:

                print("⚠️ Problemas con base de datos")

        print("\n📊 RESULTADOS DEL ESCANEO:")    

        print("="*50)    print("")

        print(f"🎯 Target: {scan_result['target_name']}")    

        print(f"📅 Fecha: {scan_result['start_time']}")    # Paso 5: Configurar perfiles

        print(f"📈 Total vulnerabilidades: {scan_result['summary']['total']}")    setup_scan_profiles()

        print(f"🔴 Críticas: {scan_result['summary']['critical']}")    print("")

        print(f"🟠 Altas: {scan_result['summary']['high']}")    

        print(f"🟡 Medias: {scan_result['summary']['medium']}")    # Paso 6: Generar programa

        print(f"🟢 Bajas: {scan_result['summary']['low']}")    generate_scan_schedule()

            print("")

        if scan_result['summary']['critical'] > 0:    

            print("\n🚨 VULNERABILIDADES CRÍTICAS ENCONTRADAS:")    # Paso 7: Ofrecec escaneo de prueba

            for vuln in vulnerabilities:    run_test = input("¿Ejecutar escaneo de prueba? (y/N): ").lower().strip()

                if vuln['severity'] == 'Critical':    if run_test == 'y':

                    print(f"   🔴 {vuln['name']} (CVSS: {vuln['cvss']})")        print("")

                if run_test_scan(openvas_config):

        return scan_result            print("✅ Escaneo de prueba completado exitosamente")

            else:

    def _generate_sample_vulnerabilities(self, hosts: str) -> List[Dict]:            print("⚠️ El escaneo de prueba tuvo problemas")

        """Generar vulnerabilidades de ejemplo para demostración."""    

        import random    print("")

            print("🎉 Configuración de OpenVAS completada")

        sample_vulns = [    print("\n📋 Pasos siguientes:")

            {    print("1. Verificar que el servicio GVM esté ejecutándose")

                "name": "Apache HTTP Server Information Disclosure",    print("2. Configurar targets de red específicos")

                "severity": "Medium",    print("3. Programar escaneos automáticos")

                "cvss": 5.0,    print("4. Revisar y ajustar perfiles de escaneo")

                "description": "Apache server reveals version information",    

                "solution": "Update Apache server to latest version"    return True

            },

            {if __name__ == "__main__":

                "name": "SSL/TLS Certificate Weak Signature",    success = main()

                "severity": "High",     sys.exit(0 if success else 1)
                "cvss": 7.5,
                "description": "SSL certificate uses weak signature algorithm",
                "solution": "Replace certificate with stronger signature"
            },
            {
                "name": "SSH Weak Encryption Algorithms",
                "severity": "Medium",
                "cvss": 4.3,
                "description": "SSH server supports weak encryption",
                "solution": "Configure SSH with strong encryption only"
            },
            {
                "name": "Remote Code Execution Vulnerability",
                "severity": "Critical",
                "cvss": 9.8,
                "description": "Buffer overflow allows remote code execution",
                "solution": "Apply security patch immediately"
            },
            {
                "name": "Cross-Site Scripting (XSS)",
                "severity": "High",
                "cvss": 6.1,
                "description": "Web application vulnerable to XSS attacks",
                "solution": "Sanitize user input properly"
            }
        ]
        
        # Retornar entre 2-5 vulnerabilidades aleatorias
        num_vulns = random.randint(2, 5)
        selected_vulns = random.sample(sample_vulns, min(num_vulns, len(sample_vulns)))
        
        for vuln in selected_vulns:
            vuln['host'] = hosts.split(',')[0].strip()
            vuln['port'] = random.choice([80, 443, 22, 21, 3389])
            vuln['found_date'] = datetime.now().isoformat()
        
        return selected_vulns
    
    def export_scan_results(self, scan_result: Dict, format: str = "json") -> str:
        """Exportar resultados de escaneo."""
        exports_dir = Path("data/openvas_exports")
        exports_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scan_{scan_result['scan_id']}_{timestamp}"
        
        if format.lower() == "json":
            filepath = exports_dir / f"{filename}.json"
            with open(filepath, 'w') as f:
                json.dump(scan_result, f, indent=4)
        
        elif format.lower() == "csv":
            import csv
            filepath = exports_dir / f"{filename}.csv"
            with open(filepath, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'name', 'severity', 'cvss', 'host', 'port', 'description', 'solution'
                ])
                writer.writeheader()
                writer.writerows(scan_result['vulnerabilities'])
        
        print(f"✅ Resultados exportados: {filepath}")
        return str(filepath)
    
    def show_status(self):
        """Mostrar estado del sistema OpenVAS."""
        print("\n📊 ESTADO DEL SISTEMA OPENVAS")
        print("="*50)
        
        # Estado de configuración
        if self.config_path.exists():
            print("✅ Configuración: Cargada")
        else:
            print("❌ Configuración: No encontrada")
        
        # Estado Docker
        compose_file = Path("openvas-docker/docker-compose.yml")
        if compose_file.exists():
            print("✅ Docker Compose: Configurado")
        else:
            print("❌ Docker Compose: No configurado")
        
        # Test conexión
        if self.test_openvas_connection():
            print("✅ Conexión OpenVAS: Operacional")
        else:
            print("❌ Conexión OpenVAS: No disponible")
        
        # Targets configurados
        targets = self.config.get('targets', [])
        print(f"📊 Targets configurados: {len(targets)}")

def main():
    """Función principal."""
    print("🛡️ THREATGUARD - SETUP OPENVAS")
    print("="*50)
    
    manager = OpenVASManager()
    
    import argparse
    parser = argparse.ArgumentParser(description="ThreatGuard OpenVAS Setup")
    parser.add_argument("action", choices=[
        "setup", "start", "stop", "status", "test", "targets", "scan", "export"
    ], help="Acción a ejecutar")
    
    parser.add_argument("--target-name", help="Nombre del target")
    parser.add_argument("--target-hosts", help="Hosts del target (ej: 192.168.1.0/24)")
    parser.add_argument("--target-id", help="ID del target para escaneo")
    parser.add_argument("--scan-type", default="quick_scan", help="Tipo de escaneo")
    parser.add_argument("--export-format", default="json", help="Formato de exportación")
    
    args = parser.parse_args()
    
    if args.action == "setup":
        manager.setup_docker_environment()
        print("\n🎯 Setup completado. Ejecute 'start' para iniciar OpenVAS.")
        
    elif args.action == "start":
        manager.start_openvas_stack()
        
    elif args.action == "stop":
        manager.stop_openvas_stack()
        
    elif args.action == "status":
        manager.show_status()
        
    elif args.action == "test":
        manager.test_openvas_connection()
        
    elif args.action == "targets":
        if args.target_name and args.target_hosts:
            manager.create_scan_target(args.target_name, args.target_hosts)
        manager.list_scan_targets()
        
    elif args.action == "scan":
        if not args.target_id:
            print("❌ Se requiere --target-id para escaneo")
            return
        
        result = manager.simulate_vulnerability_scan(args.target_id, args.scan_type)
        if result:
            manager.export_scan_results(result, args.export_format)

if __name__ == "__main__":
    main()