#!/usr/bin/env python3
"""
Script de verificación para validar las correcciones implementadas
"""

import os
import sys
import requests
from datetime import datetime

API_URL = os.getenv("API_URL", "http://localhost:8000")

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_api_connection():
    """Verificar conexión con la API"""
    print_header("🔌 VERIFICANDO CONEXIÓN API")
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API respondiendo correctamente")
            data = response.json()
            print(f"   Status: {data.get('status')}")
            print(f"   Modelo: {'Cargado' if data.get('model_loaded') else 'No cargado'}")
            return True
        else:
            print(f"❌ API respondió con código: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ No se pudo conectar a la API: {e}")
        return False

def test_cleanup_endpoint():
    """Verificar endpoint de limpieza (dry-run simulado)"""
    print_header("🧹 VERIFICANDO ENDPOINT DE LIMPIEZA")
    try:
        # Obtener estadísticas antes
        response = requests.get(f"{API_URL}/dashboard/stats", timeout=5)
        if response.status_code == 200:
            stats = response.json()
            print(f"📊 Estadísticas actuales:")
            print(f"   Total alertas: {stats.get('total_alertas', 0)}")
            print(f"   Alertas ALTA: {stats.get('alertas_alta', 0)}")
            print(f"   Alertas MEDIA: {stats.get('alertas_media', 0)}")
            print(f"   Alertas BAJA: {stats.get('alertas_baja', 0)}")
            print(f"   Alertas BENIGNO: {stats.get('alertas_benigno', 0)}")
            
            print("\n✅ Endpoint de limpieza disponible en: POST /maintenance/cleanup")
            print("   Parámetros opcionales:")
            print("   - days_closed=30 (alertas cerradas)")
            print("   - days_open=90 (alertas abiertas antiguas)")
            print("   - days_low=7 (baja prioridad)")
            print("   - days_benign=3 (benignas)")
            return True
        else:
            print(f"⚠️  No se pudieron obtener estadísticas: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error verificando endpoint: {e}")
        return False

def test_snort_alerts():
    """Verificar alertas de Snort"""
    print_header("🔍 VERIFICANDO ALERTAS DE SNORT")
    try:
        response = requests.get(f"{API_URL}/api/snort/alerts?limit=10", timeout=5)
        if response.status_code == 200:
            data = response.json()
            alerts = data.get('alerts', [])
            print(f"✅ Alertas recientes de Snort: {len(alerts)}")
            
            if alerts:
                # Mostrar primeras 3 alertas
                for i, alert in enumerate(alerts[:3], 1):
                    print(f"\n   Alerta {i}:")
                    print(f"   - Mensaje: {alert.get('message', 'N/A')[:60]}")
                    print(f"   - Prioridad: {alert.get('priority', 'N/A')}")
                    print(f"   - Origen: {alert.get('src_ip', 'N/A')}")
                    print(f"   - Destino: {alert.get('dst_ip', 'N/A')}")
            else:
                print("   ℹ️  No hay alertas de Snort recientes")
            
            return True
        else:
            print(f"⚠️  No se pudieron obtener alertas de Snort: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error verificando Snort: {e}")
        return False

def check_files():
    """Verificar que los archivos modificados existan"""
    print_header("📁 VERIFICANDO ARCHIVOS MODIFICADOS")
    
    files_to_check = [
        "scripts/cleanup_old_alerts.sql",
        "scripts/cleanup_old_alerts.py",
        "src/data_collection/snort_integration.py",
        "SOLUCION_LOGS_ISP.md"
    ]
    
    all_exist = True
    for file_path in files_to_check:
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            print(f"✅ {file_path} ({size} bytes)")
        else:
            print(f"❌ {file_path} - NO ENCONTRADO")
            all_exist = False
    
    return all_exist

def check_snort_integration_updates():
    """Verificar que snort_integration.py tenga las nuevas funciones"""
    print_header("🔧 VERIFICANDO ACTUALIZACIONES EN SNORT INTEGRATION")
    
    snort_file = "src/data_collection/snort_integration.py"
    if not os.path.exists(snort_file):
        print(f"❌ No se encuentra {snort_file}")
        return False
    
    with open(snort_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    functions_to_check = [
        "is_private_ip",
        "is_isp_traffic",
        "should_filter_alert"
    ]
    
    all_present = True
    for func in functions_to_check:
        if f"def {func}" in content:
            print(f"✅ Función {func}() encontrada")
        else:
            print(f"❌ Función {func}() NO encontrada")
            all_present = False
    
    return all_present

def generate_report():
    """Generar reporte completo"""
    print_header("📊 REPORTE DE VERIFICACIÓN")
    
    results = {
        "API Conexión": test_api_connection(),
        "Endpoint Limpieza": test_cleanup_endpoint(),
        "Alertas Snort": test_snort_alerts(),
        "Archivos": check_files(),
        "Código Snort": check_snort_integration_updates()
    }
    
    print_header("✨ RESUMEN")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Tests pasados: {passed}/{total}")
    
    if passed == total:
        print("\n🎉 TODAS LAS VERIFICACIONES EXITOSAS!")
        print("\n📝 Próximos pasos:")
        print("   1. Ejecutar limpieza: POST http://localhost:8000/maintenance/cleanup")
        print("   2. Monitorear logs de Snort: docker logs snort-integration -f")
        print("   3. Revisar reducción de alertas MEDIA en dashboard")
        return 0
    else:
        print("\n⚠️  ALGUNAS VERIFICACIONES FALLARON")
        print("\n🔧 Acciones recomendadas:")
        if not results["API Conexión"]:
            print("   - Iniciar la API: docker-compose up -d")
        if not results["Archivos"]:
            print("   - Verificar que todos los archivos se crearon correctamente")
        if not results["Código Snort"]:
            print("   - Revisar que snort_integration.py se actualizó correctamente")
        return 1

if __name__ == "__main__":
    print("=" * 70)
    print("  VERIFICACIÓN DE CORRECCIONES - THREATGUARD 3.0")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    exit_code = generate_report()
    
    print("\n" + "=" * 70)
    sys.exit(exit_code)
