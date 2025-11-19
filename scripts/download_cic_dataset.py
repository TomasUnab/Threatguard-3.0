"""
Script Automatizado - Descarga Dataset CIC-IDS2017
==================================================

Script para descargar automáticamente el dataset CIC-IDS2017
desde el servidor oficial de la Universidad de New Brunswick.
"""

import os
import sys
import urllib.request
import urllib.error
from pathlib import Path
import zipfile
import hashlib
from tqdm import tqdm
import time

class CICDatasetDownloader:
    """Descargador automatizado del dataset CIC-IDS2017."""
    
    def __init__(self, download_dir: str = "./data/datasets/CIC-IDS2017/"):
        self.download_dir = Path(download_dir)
        self.base_url = "http://cicresearch.ca/CICDataset/CIC-IDS-2017/Dataset/CIC-IDS-2017/"
        
        # Archivos del dataset CIC-IDS2017
        self.dataset_files = {
            'Monday-WorkingHours.pcap_ISCX.csv': {
                'description': 'Monday (Normal Traffic)',
                'size_mb': 180,
                'expected_md5': None  # Se puede agregar después
            },
            'Tuesday-WorkingHours.pcap_ISCX.csv': {
                'description': 'Tuesday (Brute Force SSH/FTP)',
                'size_mb': 165,
                'expected_md5': None
            },
            'Wednesday-workingHours.pcap_ISCX.csv': {
                'description': 'Wednesday (DoS/DDoS Attacks)',
                'size_mb': 440,
                'expected_md5': None
            },
            'Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv': {
                'description': 'Thursday AM (Web Attacks)',
                'size_mb': 170,
                'expected_md5': None
            },
            'Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv': {
                'description': 'Thursday PM (Infiltration)',
                'size_mb': 165,
                'expected_md5': None
            },
            'Friday-WorkingHours-Morning.pcap_ISCX.csv': {
                'description': 'Friday AM (Botnet ARES)',
                'size_mb': 180,
                'expected_md5': None
            },
            'Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv': {
                'description': 'Friday PM (Port Scan)',
                'size_mb': 165,
                'expected_md5': None
            },
            'Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv': {
                'description': 'Friday PM (DDoS)',
                'size_mb': 130,
                'expected_md5': None
            }
        }
        
        # Crear directorio si no existe
        self.download_dir.mkdir(parents=True, exist_ok=True)
    
    def check_existing_files(self):
        """Verificar archivos existentes."""
        existing_files = []
        missing_files = []
        
        for filename in self.dataset_files.keys():
            file_path = self.download_dir / filename
            if file_path.exists():
                size_mb = file_path.stat().st_size / (1024 * 1024)
                existing_files.append((filename, size_mb))
            else:
                missing_files.append(filename)
        
        return existing_files, missing_files
    
    def download_file(self, filename: str, force_download: bool = False):
        """Descargar archivo específico."""
        file_path = self.download_dir / filename
        
        # Verificar si ya existe
        if file_path.exists() and not force_download:
            size_mb = file_path.stat().st_size / (1024 * 1024)
            print(f"✅ {filename} ya existe ({size_mb:.1f} MB)")
            return True
        
        # URL del archivo
        file_url = f"{self.base_url}{filename}"
        file_info = self.dataset_files[filename]
        
        print(f"📥 Descargando: {file_info['description']}")
        print(f"   URL: {file_url}")
        print(f"   Tamaño esperado: ~{file_info['size_mb']} MB")
        
        try:
            # Crear hook para progreso
            def progress_hook(block_num, block_size, total_size):
                if hasattr(progress_hook, 'pbar'):
                    progress_hook.pbar.update(block_size)
                else:
                    progress_hook.pbar = tqdm(
                        total=total_size, 
                        unit='B', 
                        unit_scale=True, 
                        desc=filename[:30]
                    )
            
            # Descargar archivo
            urllib.request.urlretrieve(file_url, file_path, progress_hook)
            
            # Cerrar barra de progreso
            if hasattr(progress_hook, 'pbar'):
                progress_hook.pbar.close()
            
            # Verificar descarga
            if file_path.exists():
                size_mb = file_path.stat().st_size / (1024 * 1024)
                print(f"   ✅ Descarga completa: {size_mb:.1f} MB")
                return True
            else:
                print(f"   ❌ Error: Archivo no encontrado después de descarga")
                return False
                
        except urllib.error.HTTPError as e:
            print(f"   ❌ Error HTTP {e.code}: {e.reason}")
            return False
        except urllib.error.URLError as e:
            print(f"   ❌ Error de conexión: {e.reason}")
            return False
        except Exception as e:
            print(f"   ❌ Error inesperado: {str(e)}")
            return False
    
    def download_all_files(self, force_download: bool = False):
        """Descargar todos los archivos del dataset."""
        print("🛡️ DESCARGA DATASET CIC-IDS2017")
        print("="*50)
        
        # Verificar archivos existentes
        existing_files, missing_files = self.check_existing_files()
        
        if existing_files:
            print("📋 Archivos existentes:")
            for filename, size_mb in existing_files:
                print(f"   ✅ {filename} ({size_mb:.1f} MB)")
        
        if missing_files:
            print(f"\n📥 Archivos a descargar: {len(missing_files)}")
            total_size_mb = sum(self.dataset_files[f]['size_mb'] for f in missing_files)
            print(f"   Tamaño total estimado: ~{total_size_mb} MB")
        elif not force_download:
            print("\n✅ Todos los archivos ya están descargados!")
            return True
        
        # Confirmar descarga
        if not force_download and missing_files:
            response = input(f"\n¿Descargar {len(missing_files)} archivos (~{total_size_mb} MB)? [y/N]: ")
            if response.lower() not in ['y', 'yes', 'sí', 's']:
                print("❌ Descarga cancelada")
                return False
        
        # Descargar archivos
        successful_downloads = 0
        failed_downloads = []
        
        files_to_download = list(self.dataset_files.keys()) if force_download else missing_files
        
        for i, filename in enumerate(files_to_download, 1):
            print(f"\n[{i}/{len(files_to_download)}] {filename}")
            
            success = self.download_file(filename, force_download)
            
            if success:
                successful_downloads += 1
            else:
                failed_downloads.append(filename)
            
            # Pequeña pausa entre descargas
            if i < len(files_to_download):
                time.sleep(1)
        
        # Resumen final
        print("\n" + "="*50)
        print("📊 RESUMEN DE DESCARGA:")
        print(f"   ✅ Exitosas: {successful_downloads}")
        print(f"   ❌ Fallidas: {len(failed_downloads)}")
        
        if failed_downloads:
            print("\n❌ Archivos que fallaron:")
            for filename in failed_downloads:
                print(f"   - {filename}")
            
            print("\n💡 Soluciones:")
            print("   1. Verificar conexión a internet")
            print("   2. Intentar descargar manualmente desde:")
            print("      http://cicresearch.ca/CICDataset/CIC-IDS-2017/Dataset/CIC-IDS-2017/")
            print("   3. Usar --force para reintentar")
        else:
            print("\n🎉 ¡Descarga completa exitosa!")
            self.verify_dataset()
        
        return len(failed_downloads) == 0
    
    def verify_dataset(self):
        """Verificar integridad del dataset descargado."""
        print("\n🔍 VERIFICANDO DATASET...")
        
        existing_files, missing_files = self.check_existing_files()
        
        if missing_files:
            print(f"   ⚠️ Archivos faltantes: {len(missing_files)}")
            return False
        
        # Verificar tamaños
        total_size_mb = 0
        for filename, size_mb in existing_files:
            expected_size = self.dataset_files[filename]['size_mb']
            total_size_mb += size_mb
            
            # Tolerancia de ±10% en el tamaño
            if abs(size_mb - expected_size) / expected_size > 0.1:
                print(f"   ⚠️ {filename}: Tamaño inusual ({size_mb:.1f} MB vs {expected_size} MB esperado)")
        
        print(f"   📊 Tamaño total: {total_size_mb:.1f} MB")
        print(f"   📁 Ubicación: {self.download_dir}")
        print("   ✅ Dataset verificado")
        
        return True
    
    def get_download_instructions(self):
        """Obtener instrucciones de descarga manual."""
        instructions = f"""
🔗 DESCARGA MANUAL DEL DATASET CIC-IDS2017:

1. Visita el enlace oficial:
   {self.base_url}

2. Descarga los siguientes archivos:
"""
        for filename, info in self.dataset_files.items():
            instructions += f"   - {filename} (~{info['size_mb']} MB) - {info['description']}\n"
        
        instructions += f"""
3. Coloca todos los archivos CSV en:
   {self.download_dir}

4. Verifica que tengas todos los 8 archivos CSV antes de continuar.

📊 Tamaño total del dataset: ~{sum(f['size_mb'] for f in self.dataset_files.values())} MB
"""
        
        return instructions

def main():
    """Función principal del script de descarga."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Descargador del dataset CIC-IDS2017")
    parser.add_argument('--download-dir', default='./data/datasets/CIC-IDS2017/', 
                       help='Directorio de descarga')
    parser.add_argument('--force', action='store_true', 
                       help='Forzar descarga de archivos existentes')
    parser.add_argument('--verify-only', action='store_true', 
                       help='Solo verificar archivos existentes')
    parser.add_argument('--instructions', action='store_true', 
                       help='Mostrar instrucciones de descarga manual')
    
    args = parser.parse_args()
    
    # Crear descargador
    downloader = CICDatasetDownloader(args.download_dir)
    
    # Mostrar instrucciones si se solicita
    if args.instructions:
        print(downloader.get_download_instructions())
        return
    
    # Solo verificar si se solicita
    if args.verify_only:
        downloader.verify_dataset()
        return
    
    # Verificar dependencias
    try:
        from tqdm import tqdm
    except ImportError:
        print("⚠️ Instalando tqdm para barras de progreso...")
        os.system("pip install tqdm")
    
    # Ejecutar descarga
    success = downloader.download_all_files(args.force)
    
    if success:
        print(f"\n🎯 PRÓXIMO PASO:")
        print(f"   python scripts/main_threatguard_cic.py --dataset-path {args.download_dir} --train")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())