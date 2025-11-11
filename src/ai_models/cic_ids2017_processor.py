"""
Procesador del Dataset CIC-IDS2017 para ThreatGuard
==================================================

Módulo especializado para procesar y integrar el dataset CIC-IDS2017:
- Carga de archivos CSV del dataset
- Preprocesamiento especializado para features de red
- Mapeo de etiquetas de ataques
- Integración con el pipeline de ML de ThreatGuard
- Balanceo y optimización de memoria
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from dataclasses import dataclass
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.decomposition import IncrementalPCA
import warnings
warnings.filterwarnings('ignore')

@dataclass
class CICDatasetConfig:
    """Configuración para el procesamiento del dataset CIC-IDS2017."""
    
    data_path: str = "./data/datasets/CIC-IDS2017/"
    sample_ratio: float = 0.2  # Usar 20% del dataset por memoria
    remove_duplicates: bool = True
    handle_infinity: bool = True
    apply_pca: bool = True
    pca_components: int = 50
    balance_classes: bool = True
    memory_optimize: bool = True

class CICDatasetProcessor:
    """Procesador principal del dataset CIC-IDS2017."""
    
    def __init__(self, config: CICDatasetConfig = None):
        self.config = config or CICDatasetConfig()
        
        # Mapeo de archivos del dataset CIC-IDS2017
        self.dataset_files = {
            'Monday-WorkingHours.pcap_ISCX.csv': 'Monday (Benign)',
            'Tuesday-WorkingHours.pcap_ISCX.csv': 'Tuesday (Brute Force)',
            'Wednesday-workingHours.pcap_ISCX.csv': 'Wednesday (DoS/DDoS)',
            'Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv': 'Thursday AM (Web Attacks)',
            'Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv': 'Thursday PM (Infiltration)',
            'Friday-WorkingHours-Morning.pcap_ISCX.csv': 'Friday AM (Botnet)',
            'Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv': 'Friday PM (Port Scan)',
            'Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv': 'Friday PM (DDoS)'
        }
        
        # Mapeo de etiquetas a categorías de severidad
        self.attack_severity_mapping = {
            'BENIGN': 'benign',
            
            # High Severity
            'DDoS': 'high',
            'DoS Hulk': 'high', 
            'DoS GoldenEye': 'high',
            'DoS slowloris': 'high',
            'DoS Slowhttptest': 'high',
            'Heartbleed': 'critical',
            'Infiltration': 'critical',
            
            # Medium Severity
            'FTP-Patator': 'medium',
            'SSH-Patator': 'medium',
            'Brute Force': 'medium',
            'Bot': 'medium',
            'PortScan': 'medium',
            
            # Web Attacks - Medium to High
            'Web Attack � Brute Force': 'medium',
            'Web Attack � XSS': 'high',
            'Web Attack � Sql Injection': 'high'
        }
        
        # Features importantes identificadas en análisis
        self.important_features = [
            'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
            'Total Length of Fwd Packets', 'Total Length of Bwd Packets',
            'Fwd Packet Length Max', 'Fwd Packet Length Min', 'Fwd Packet Length Mean',
            'Bwd Packet Length Max', 'Bwd Packet Length Min', 'Bwd Packet Length Mean',
            'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std',
            'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max', 'Fwd IAT Min',
            'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min',
            'Fwd PSH Flags', 'Bwd PSH Flags', 'Fwd URG Flags', 'Bwd URG Flags',
            'Fwd Header Length', 'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s',
            'Min Packet Length', 'Max Packet Length', 'Packet Length Mean', 'Packet Length Std',
            'Packet Length Variance', 'FIN Flag Count', 'SYN Flag Count', 'RST Flag Count',
            'PSH Flag Count', 'ACK Flag Count', 'URG Flag Count', 'CWE Flag Count',
            'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size', 'Avg Fwd Segment Size',
            'Avg Bwd Segment Size', 'Fwd Header Length.1', 'Fwd Avg Bytes/Bulk',
            'Fwd Avg Packets/Bulk', 'Fwd Avg Bulk Rate', 'Bwd Avg Bytes/Bulk',
            'Bwd Avg Packets/Bulk', 'Bwd Avg Bulk Rate', 'Subflow Fwd Packets',
            'Subflow Fwd Bytes', 'Subflow Bwd Packets', 'Subflow Bwd Bytes',
            'Init_Win_bytes_forward', 'Init_Win_bytes_backward', 'act_data_pkt_fwd',
            'min_seg_size_forward', 'Active Mean', 'Active Std', 'Active Max', 'Active Min',
            'Idle Mean', 'Idle Std', 'Idle Max', 'Idle Min'
        ]
    
    def load_dataset(self, file_path: Optional[str] = None) -> pd.DataFrame:
        """Cargar dataset CIC-IDS2017 completo o archivo específico."""
        if file_path:
            # Cargar archivo específico
            print(f"📂 Cargando archivo: {file_path}")
            return pd.read_csv(file_path)
        
        # Cargar dataset completo
        print("📂 Cargando dataset CIC-IDS2017 completo...")
        data_path = Path(self.config.data_path)
        
        all_data = []
        loaded_files = []
        
        for filename, description in self.dataset_files.items():
            file_path = data_path / filename
            
            if file_path.exists():
                try:
                    print(f"   Cargando: {description}")
                    df = pd.read_csv(file_path)
                    df['source_file'] = filename
                    all_data.append(df)
                    loaded_files.append(filename)
                    print(f"   ✅ {len(df)} registros cargados")
                    
                except Exception as e:
                    print(f"   ❌ Error cargando {filename}: {str(e)}")
            else:
                print(f"   ⚠️ Archivo no encontrado: {filename}")
        
        if not all_data:
            raise FileNotFoundError(f"No se encontraron archivos del dataset en {data_path}")
        
        # Combinar todos los datos
        combined_data = pd.concat(all_data, ignore_index=True)
        print(f"✅ Dataset combinado: {len(combined_data)} registros, {len(combined_data.columns)} columnas")
        print(f"   Archivos cargados: {len(loaded_files)}")
        
        return combined_data
    
    def preprocess_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preprocesar datos del dataset CIC-IDS2017."""
        print("🔄 Preprocesando dataset CIC-IDS2017...")
        
        # Información inicial
        print(f"   Dataset inicial: {df.shape}")
        print(f"   Uso de memoria: {df.memory_usage(deep=True).sum() / 1024**2:.1f} MB")
        
        # 1. Limpiar nombres de columnas
        df.columns = df.columns.str.strip().str.replace(' ', '_')
        
        # 2. Muestreo si es necesario
        if self.config.sample_ratio < 1.0:
            original_size = len(df)
            df = df.sample(frac=self.config.sample_ratio, random_state=42)
            print(f"   📊 Muestreado: {len(df)} de {original_size} registros ({self.config.sample_ratio*100:.1f}%)")
        
        # 3. Remover duplicados
        if self.config.remove_duplicates:
            duplicates = df.duplicated().sum()
            if duplicates > 0:
                df = df.drop_duplicates()
                print(f"   🔄 Removidos {duplicates} duplicados")
        
        # 4. Manejar valores infinitos
        if self.config.handle_infinity:
            # Reemplazar infinitos con NaN
            df = df.replace([np.inf, -np.inf], np.nan)
            
            # Contar valores faltantes
            missing_values = df.isnull().sum()
            columns_with_missing = missing_values[missing_values > 0]
            
            if len(columns_with_missing) > 0:
                print(f"   🔄 Manejando {missing_values.sum()} valores faltantes en {len(columns_with_missing)} columnas")
                
                # Rellenar con mediana para columnas numéricas
                numeric_columns = df.select_dtypes(include=[np.number]).columns
                for col in numeric_columns:
                    if df[col].isnull().any():
                        median_value = df[col].median()
                        df[col].fillna(median_value, inplace=True)
        
        # 5. Optimizar memoria si es necesario
        if self.config.memory_optimize:
            df = self._optimize_memory_usage(df)
        
        # 6. Mapear etiquetas a severidad
        if 'Label' in df.columns:
            df['severity'] = df['Label'].map(self.attack_severity_mapping)
            df['severity'] = df['severity'].fillna('unknown')
            
            # Estadísticas de etiquetas
            label_counts = df['Label'].value_counts()
            severity_counts = df['severity'].value_counts()
            
            print(f"   📊 Distribución de ataques:")
            for label, count in label_counts.head(10).items():
                percentage = (count / len(df)) * 100
                severity = self.attack_severity_mapping.get(label, 'unknown')
                print(f"      {label}: {count} ({percentage:.2f}%) -> {severity}")
        
        print(f"✅ Preprocesamiento completado: {df.shape}")
        return df
    
    def _optimize_memory_usage(self, df: pd.DataFrame) -> pd.DataFrame:
        """Optimizar uso de memoria del DataFrame."""
        print("   🔧 Optimizando uso de memoria...")
        
        start_memory = df.memory_usage(deep=True).sum() / 1024**2
        
        for col in df.columns:
            col_type = df[col].dtype
            
            if col_type != 'object':
                c_min = df[col].min()
                c_max = df[col].max()
                
                if str(col_type)[:3] == 'int':
                    if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                        df[col] = df[col].astype(np.int8)
                    elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                        df[col] = df[col].astype(np.int16)
                    elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                        df[col] = df[col].astype(np.int32)
                    elif c_min > np.iinfo(np.int64).min and c_max < np.iinfo(np.int64).max:
                        df[col] = df[col].astype(np.int64)
                else:
                    if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                        df[col] = df[col].astype(np.float32)  # float16 puede ser impreciso
                    elif c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                        df[col] = df[col].astype(np.float32)
        
        end_memory = df.memory_usage(deep=True).sum() / 1024**2
        reduction = (start_memory - end_memory) / start_memory * 100
        
        print(f"   💾 Memoria reducida: {start_memory:.1f}MB -> {end_memory:.1f}MB ({reduction:.1f}% reducción)")
        
        return df
    
    def create_balanced_dataset(self, df: pd.DataFrame, max_samples_per_class: int = 10000) -> pd.DataFrame:
        """Crear dataset balanceado para entrenamiento."""
        print("⚖️ Creando dataset balanceado...")
        
        if 'severity' not in df.columns:
            print("   ❌ Columna 'severity' no encontrada")
            return df
        
        balanced_data = []
        
        for severity in df['severity'].unique():
            severity_data = df[df['severity'] == severity]
            sample_size = min(len(severity_data), max_samples_per_class)
            
            if len(severity_data) > sample_size:
                sampled_data = severity_data.sample(n=sample_size, random_state=42)
            else:
                sampled_data = severity_data
            
            balanced_data.append(sampled_data)
            print(f"   {severity}: {len(sampled_data)} muestras")
        
        balanced_df = pd.concat(balanced_data, ignore_index=True)
        
        # Mezclar el dataset
        balanced_df = balanced_df.sample(frac=1.0, random_state=42).reset_index(drop=True)
        
        print(f"✅ Dataset balanceado creado: {len(balanced_df)} registros")
        return balanced_df
    
    def extract_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Extraer features y targets para entrenamiento."""
        print("🔍 Extrayendo features para ML...")
        
        # Seleccionar features numéricas
        feature_columns = []
        for col in df.columns:
            if col not in ['Label', 'severity', 'source_file'] and df[col].dtype in [np.number]:
                feature_columns.append(col)
        
        # Priorizar features importantes si están disponibles
        available_important = [f for f in self.important_features if f.replace(' ', '_') in feature_columns]
        if available_important:
            # Usar features importantes + algunas adicionales
            feature_columns = available_important + [f for f in feature_columns if f not in available_important][:20]
        
        feature_columns = feature_columns[:60]  # Limitar a 60 features para memoria
        
        X = df[feature_columns].values
        y = df['severity'].values
        
        # Verificar y limpiar datos
        X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
        
        print(f"   Features extraídas: {X.shape}")
        print(f"   Features principales: {feature_columns[:10]}")
        
        return X, y, feature_columns
    
    def apply_dimensionality_reduction(self, X_train: np.ndarray, X_test: np.ndarray, 
                                     n_components: int = None) -> Tuple[np.ndarray, np.ndarray, IncrementalPCA]:
        """Aplicar PCA para reducir dimensionalidad."""
        if not self.config.apply_pca:
            return X_train, X_test, None
        
        n_components = n_components or self.config.pca_components
        print(f"🔍 Aplicando PCA con {n_components} componentes...")
        
        # Escalar datos primero
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Aplicar PCA incremental para datasets grandes
        pca = IncrementalPCA(n_components=n_components, batch_size=1000)
        
        # Ajustar PCA por lotes
        batch_size = 1000
        for i in range(0, len(X_train_scaled), batch_size):
            batch = X_train_scaled[i:i+batch_size]
            pca.partial_fit(batch)
        
        # Transformar datos
        X_train_pca = pca.transform(X_train_scaled)
        X_test_pca = pca.transform(X_test_scaled)
        
        # Información de varianza explicada
        explained_variance = np.sum(pca.explained_variance_ratio_)
        print(f"   ✅ PCA aplicado: {X_train_pca.shape[1]} componentes")
        print(f"   📊 Varianza explicada: {explained_variance:.3f} ({explained_variance*100:.1f}%)")
        
        return X_train_pca, X_test_pca, pca
    
    def create_training_dataset(self, data_path: str = None, 
                              test_size: float = 0.2) -> Dict[str, Any]:
        """Crear dataset completo para entrenamiento."""
        print("🎯 Creando dataset de entrenamiento CIC-IDS2017...")
        
        # 1. Cargar datos
        if data_path:
            df = self.load_dataset(data_path)
        else:
            df = self.load_dataset()
        
        # 2. Preprocesar
        df = self.preprocess_data(df)
        
        # 3. Balancear si es necesario
        if self.config.balance_classes:
            df = self.create_balanced_dataset(df)
        
        # 4. Extraer features
        X, y, feature_names = self.extract_features(df)
        
        # 5. División train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # 6. Codificar etiquetas
        label_encoder = LabelEncoder()
        y_train_encoded = label_encoder.fit_transform(y_train)
        y_test_encoded = label_encoder.transform(y_test)
        
        # 7. Aplicar PCA si está configurado
        X_train_final, X_test_final, pca = self.apply_dimensionality_reduction(X_train, X_test)
        
        # 8. Preparar resultado
        dataset = {
            'X_train': X_train_final,
            'X_test': X_test_final,
            'y_train': y_train_encoded,
            'y_test': y_test_encoded,
            'feature_names': feature_names,
            'label_encoder': label_encoder,
            'pca': pca,
            'class_names': list(label_encoder.classes_),
            'metadata': {
                'total_samples': len(df),
                'n_features_original': len(feature_names),
                'n_features_final': X_train_final.shape[1],
                'n_classes': len(label_encoder.classes_),
                'train_samples': len(X_train_final),
                'test_samples': len(X_test_final),
                'dataset': 'CIC-IDS2017',
                'attack_types': df['Label'].unique().tolist() if 'Label' in df.columns else [],
                'severity_distribution': df['severity'].value_counts().to_dict() if 'severity' in df.columns else {}
            }
        }
        
        print(f"🎉 Dataset CIC-IDS2017 preparado:")
        print(f"   Total muestras: {dataset['metadata']['total_samples']}")
        print(f"   Features: {dataset['metadata']['n_features_original']} -> {dataset['metadata']['n_features_final']}")
        print(f"   Clases: {dataset['metadata']['n_classes']} {dataset['class_names']}")
        print(f"   Train/Test: {dataset['metadata']['train_samples']}/{dataset['metadata']['test_samples']}")
        
        return dataset

def download_cic_ids2017_info():
    """Información sobre cómo descargar el dataset CIC-IDS2017."""
    info = """
    📥 **Cómo descargar el dataset CIC-IDS2017:**
    
    1. **Enlace directo de descarga:** 
       http://cicresearch.ca/CICDataset/CIC-IDS-2017/Dataset/CIC-IDS-2017/
    
    2. **Sitio oficial:** https://www.unb.ca/cic/datasets/ids-2017.html
    
    3. **Archivos necesarios:**
       - Monday-WorkingHours.pcap_ISCX.csv
       - Tuesday-WorkingHours.pcap_ISCX.csv  
       - Wednesday-workingHours.pcap_ISCX.csv
       - Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv
       - Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv
       - Friday-WorkingHours-Morning.pcap_ISCX.csv
       - Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv
       - Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv
    
    3. **Ubicación sugerida:** ./data/datasets/CIC-IDS2017/
    
    4. **Tamaño total:** ~7GB
    
    5. **Tipos de ataques incluidos:**
       - Benign (Normal Traffic)
       - Brute Force (SSH/FTP Patator)
       - DoS/DDoS Attacks
       - Web Attacks (SQL Injection, XSS, Brute Force)
       - Infiltration
       - Heartbleed
       - Botnet
       - Port Scan
    """
    
    print(info)
    return info