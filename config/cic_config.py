"""
Configuración Rápida - Dataset CIC-IDS2017
==========================================

Archivo de configuración para facilitar el uso del dataset CIC-IDS2017 con ThreatGuard.
"""

import os
from pathlib import Path

# ============================================================================
# CONFIGURACIÓN DEL DATASET CIC-IDS2017
# ============================================================================

class CICConfig:
    """Configuración centralizada para CIC-IDS2017."""
    
    # URLs oficiales
    DOWNLOAD_URL = "http://cicresearch.ca/CICDataset/CIC-IDS-2017/Dataset/CIC-IDS-2017/"
    OFFICIAL_SITE = "https://www.unb.ca/cic/datasets/ids-2017.html"
    
    # Estructura de directorios
    PROJECT_ROOT = Path(__file__).parent.parent
    DATA_DIR = PROJECT_ROOT / "TrafficLabelling"  # Usar carpeta local con CSVs
    MODELS_DIR = PROJECT_ROOT / "models" / "cic_ids2017"
    REPORTS_DIR = PROJECT_ROOT / "reports" / "cic_ids2017"
    
    # Archivos del dataset
    DATASET_FILES = [
        "Monday-WorkingHours.pcap_ISCX.csv",
        "Tuesday-WorkingHours.pcap_ISCX.csv", 
        "Wednesday-workingHours.pcap_ISCX.csv",
        "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
        "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
        "Friday-WorkingHours-Morning.pcap_ISCX.csv",
        "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
        "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv"
    ]
    
    # Mapeo de archivos a tipos de ataque
    FILE_ATTACK_MAPPING = {
        "Monday-WorkingHours.pcap_ISCX.csv": ["BENIGN"],
        "Tuesday-WorkingHours.pcap_ISCX.csv": ["BENIGN", "FTP-Patator", "SSH-Patator"],
        "Wednesday-workingHours.pcap_ISCX.csv": ["BENIGN", "DoS Hulk", "DoS GoldenEye", "DoS slowloris", "DoS Slowhttptest", "Heartbleed"],
        "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv": ["BENIGN", "Web Attack � Brute Force", "Web Attack � XSS", "Web Attack � Sql Injection"],
        "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv": ["BENIGN", "Infiltration"],
        "Friday-WorkingHours-Morning.pcap_ISCX.csv": ["BENIGN", "Bot"],
        "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv": ["BENIGN", "PortScan"],
        "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv": ["BENIGN", "DDoS"]
    }
    
    # Configuraciones por defecto
    DEFAULT_CONFIG = {
        # Procesamiento
        "sample_ratio": 0.2,           # Usar 20% del dataset por defecto
        "remove_duplicates": True,
        "handle_infinity": True,
        "apply_pca": True,
        "pca_components": 50,
        "balance_classes": True,
        "memory_optimize": True,
        
        # Modelos
        "default_models": ["random_forest", "logistic_regression"],
        "use_cross_validation": True,
        "cv_folds": 3,
        "hyperparameter_tuning": False,  # Deshabilitado por defecto para velocidad
        
        # Integración
        "confidence_threshold": 0.75,
        "detection_interval_seconds": 300,
        "max_alerts_per_minute": 50,
        
        # Monitoreo
        "enable_realtime_detection": True,
        "save_detection_logs": True,
        "generate_reports": True
    }
    
    @classmethod
    def setup_directories(cls):
        """Crear directorios necesarios."""
        directories = [cls.DATA_DIR, cls.MODELS_DIR, cls.REPORTS_DIR]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"📁 Directorio creado/verificado: {directory}")
    
    @classmethod
    def check_dataset_availability(cls):
        """Verificar disponibilidad del dataset."""
        available_files = []
        missing_files = []
        
        for filename in cls.DATASET_FILES:
            file_path = cls.DATA_DIR / filename
            if file_path.exists():
                size_mb = file_path.stat().st_size / (1024 * 1024)
                available_files.append((filename, size_mb))
            else:
                missing_files.append(filename)
        
        return available_files, missing_files
    
    @classmethod
    def get_quick_start_info(cls):
        """Obtener información de inicio rápido."""
        available_files, missing_files = cls.check_dataset_availability()
        
        info = f"""
🛡️ THREATGUARD CIC-IDS2017 - CONFIGURACIÓN RÁPIDA
{'='*60}

📊 ESTADO DEL DATASET:
   Archivos disponibles: {len(available_files)}/{len(cls.DATASET_FILES)}
   Archivos faltantes: {len(missing_files)}

📁 DIRECTORIOS:
   Dataset: {cls.DATA_DIR}
   Modelos: {cls.MODELS_DIR}
   Reportes: {cls.REPORTS_DIR}

🔗 ENLACES:
   Descarga: {cls.DOWNLOAD_URL}
   Sitio oficial: {cls.OFFICIAL_SITE}
"""

        if missing_files:
            info += f"""
❌ ARCHIVOS FALTANTES:
"""
            for filename in missing_files:
                info += f"   - {filename}\n"
            
            info += f"""
📥 PARA DESCARGAR:
   python scripts/download_cic_dataset.py

📝 O DESCARGA MANUAL:
   1. Visita: {cls.DOWNLOAD_URL}
   2. Descarga los {len(missing_files)} archivos faltantes
   3. Colócalos en: {cls.DATA_DIR}
"""
        
        else:
            info += f"""
✅ DATASET COMPLETO DISPONIBLE!

🚀 COMANDOS RÁPIDOS:
   # Entrenar modelos:
   python scripts/main_threatguard_cic.py --dataset-path {cls.DATA_DIR} --train
   
   # Ejecutar demo:
   python scripts/main_threatguard_cic.py --demo
   
   # Monitoreo en tiempo real:
   python scripts/main_threatguard_cic.py --monitor
"""
        
        return info
    
    @classmethod
    def get_dataset_statistics(cls):
        """Obtener estadísticas del dataset."""
        available_files, missing_files = cls.check_dataset_availability()
        
        if not available_files:
            return "❌ No hay archivos de dataset disponibles"
        
        stats = f"""
📊 ESTADÍSTICAS DEL DATASET CIC-IDS2017:
{'='*50}

📁 Archivos disponibles: {len(available_files)}
"""
        
        total_size = 0
        for filename, size_mb in available_files:
            total_size += size_mb
            attacks = cls.FILE_ATTACK_MAPPING.get(filename, ["Unknown"])
            stats += f"   {filename}: {size_mb:.1f} MB\n"
            stats += f"      Ataques: {', '.join(attacks[:3])}{'...' if len(attacks) > 3 else ''}\n"
        
        stats += f"""
💾 Tamaño total: {total_size:.1f} MB
🎯 Tipos de ataque únicos: {len(set(attack for attacks in cls.FILE_ATTACK_MAPPING.values() for attack in attacks))}
📝 Archivos por procesar: {len(available_files)}
"""
        
        return stats

# Función de utilidad para configuración rápida
def quick_setup():
    """Configuración rápida del entorno CIC-IDS2017."""
    print("🚀 CONFIGURACIÓN RÁPIDA CIC-IDS2017")
    print("="*50)
    
    # Crear directorios
    CICConfig.setup_directories()
    
    # Mostrar información
    print(CICConfig.get_quick_start_info())
    
    # Preguntar si descargar dataset
    available_files, missing_files = CICConfig.check_dataset_availability()
    
    if missing_files:
        response = input(f"\n¿Descargar {len(missing_files)} archivos faltantes? [y/N]: ")
        if response.lower() in ['y', 'yes', 'sí', 's']:
            print("\n🔄 Iniciando descarga...")
            os.system("python scripts/download_cic_dataset.py")
        else:
            print("💡 Para descargar después, ejecuta:")
            print("   python scripts/download_cic_dataset.py")
    
    print("\n✅ Configuración rápida completada!")

if __name__ == "__main__":
    # Ejecutar configuración rápida
    quick_setup()

# ============================================================================
# CONSTANTES Y CONFIGURACIONES ADICIONALES
# ============================================================================

# Colores para output de consola
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Configuraciones de severidad
SEVERITY_MAPPING = {
    'BENIGN': 'benign',
    'DDoS': 'high',
    'DoS Hulk': 'high', 
    'DoS GoldenEye': 'high',
    'DoS slowloris': 'high',
    'DoS Slowhttptest': 'high',
    'Heartbleed': 'critical',
    'Infiltration': 'critical',
    'FTP-Patator': 'medium',
    'SSH-Patator': 'medium',
    'Bot': 'medium',
    'PortScan': 'medium',
    'Web Attack � Brute Force': 'medium',
    'Web Attack � XSS': 'high',
    'Web Attack � Sql Injection': 'high'
}

# Configuraciones de modelos optimizadas
OPTIMIZED_MODEL_CONFIGS = {
    'quick_test': {
        'sample_ratio': 0.05,
        'models': ['random_forest'],
        'hyperparameter_tuning': False,
        'cv_folds': 2
    },
    'balanced': {
        'sample_ratio': 0.2,
        'models': ['random_forest', 'xgboost'],
        'hyperparameter_tuning': True,
        'cv_folds': 3
    },
    'full_accuracy': {
        'sample_ratio': 1.0,
        'models': ['random_forest', 'xgboost', 'lightgbm'],
        'hyperparameter_tuning': True,
        'cv_folds': 5
    }
}