"""
Pipeline de Procesamiento de Datos para ThreatGuard
===================================================

Sistema para procesar y preparar datos de seguridad para modelos de ML:
- Limpieza y normalización de datos
- Extracción de características (features)
- Transformación de datos categóricos
- Balanceo de clases
- Validación y calidad de datos
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import re
import json
import hashlib

@dataclass
class ProcessedDataset:
    """Estructura para datos procesados."""
    
    X_train: np.ndarray
    X_test: np.ndarray
    y_train: np.ndarray
    y_test: np.ndarray
    feature_names: List[str]
    label_encoder: LabelEncoder
    preprocessor: ColumnTransformer
    metadata: Dict[str, Any]

class AlertDataProcessor:
    """Procesador de datos de alertas."""
    
    def __init__(self):
        self.text_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        
    def extract_features_from_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extraer características de una alerta individual."""
        features = {}
        
        # Características temporales
        if 'timestamp' in alert_data:
            timestamp = pd.to_datetime(alert_data['timestamp'])
            features['hour_of_day'] = timestamp.hour
            features['day_of_week'] = timestamp.weekday()
            features['is_weekend'] = timestamp.weekday() >= 5
            features['is_night'] = timestamp.hour < 6 or timestamp.hour > 22
        
        # Características de severidad
        features['severity'] = alert_data.get('severity', 'unknown')
        features['rule_level'] = alert_data.get('raw_data', {}).get('rule_level', 0)
        
        # Características de fuente
        features['source'] = alert_data.get('source', 'unknown')
        features['agent_name'] = alert_data.get('raw_data', {}).get('agent_name', 'unknown')
        
        # Análisis de texto de la descripción
        description = alert_data.get('description', '') or alert_data.get('title', '')
        features['description_length'] = len(description)
        features['has_keywords'] = self._contains_security_keywords(description)
        features['urgency_words'] = self._count_urgency_words(description)
        
        # Características de clasificación básica
        classification = alert_data.get('raw_data', {}).get('classification', 'other')
        features['classification'] = classification
        
        # Métricas de frecuencia (si están disponibles)
        features['similar_alerts_count'] = self._get_similar_alerts_count(alert_data)
        
        return features
    
    def _contains_security_keywords(self, text: str) -> int:
        """Verificar si contiene palabras clave de seguridad."""
        keywords = [
            'attack', 'malware', 'virus', 'trojan', 'exploit', 'vulnerability',
            'intrusion', 'breach', 'suspicious', 'malicious', 'threat',
            'unauthorized', 'failed login', 'brute force', 'injection'
        ]
        
        text_lower = text.lower()
        return sum(1 for keyword in keywords if keyword in text_lower)
    
    def _count_urgency_words(self, text: str) -> int:
        """Contar palabras que indican urgencia."""
        urgency_words = [
            'critical', 'urgent', 'immediate', 'emergency', 'severe',
            'high priority', 'escalate', 'alert', 'warning'
        ]
        
        text_lower = text.lower()
        return sum(1 for word in urgency_words if word in text_lower)
    
    def _get_similar_alerts_count(self, alert_data: Dict[str, Any]) -> int:
        """Calcular número de alertas similares (placeholder)."""
        # En implementación real, consultar BD por alertas similares
        return 1
    
    def process_alerts_batch(self, alerts: List[Dict[str, Any]]) -> pd.DataFrame:
        """Procesar lote de alertas."""
        processed_data = []
        
        for alert in alerts:
            try:
                features = self.extract_features_from_alert(alert)
                # Agregar ID y etiqueta target
                features['alert_id'] = alert.get('id', '')
                features['target_severity'] = self._determine_target_severity(alert)
                
                processed_data.append(features)
                
            except Exception as e:
                print(f"Error procesando alerta {alert.get('id', 'unknown')}: {str(e)}")
                continue
        
        return pd.DataFrame(processed_data)
    
    def _determine_target_severity(self, alert: Dict[str, Any]) -> str:
        """Determinar etiqueta objetivo basada en reglas de negocio."""
        rule_level = alert.get('raw_data', {}).get('rule_level', 0)
        
        # Mapear niveles de Wazuh a severidad objetivo
        if rule_level >= 12:
            return 'high'
        elif rule_level >= 7:
            return 'medium'
        else:
            return 'low'

class VulnerabilityDataProcessor:
    """Procesador de datos de vulnerabilidades."""
    
    def __init__(self):
        self.cvss_normalizer = StandardScaler()
        
    def extract_features_from_vulnerability(self, vuln_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extraer características de una vulnerabilidad."""
        features = {}
        
        # Características básicas
        features['cvss_score'] = vuln_data.get('cvss_score', 0.0)
        features['severity'] = vuln_data.get('severity', 'unknown')
        features['has_cve'] = 1 if vuln_data.get('cve_id') else 0
        
        # Características de puerto/servicio
        features['target_port'] = vuln_data.get('target_port', 0) or 0
        features['is_common_port'] = self._is_common_port(features['target_port'])
        features['service'] = vuln_data.get('service', 'unknown')
        
        # Análisis de descripción
        description = vuln_data.get('description', '')
        features['description_length'] = len(description)
        features['exploit_keywords'] = self._count_exploit_keywords(description)
        
        # Características temporales
        if 'discovered_at' in vuln_data:
            discovered = pd.to_datetime(vuln_data['discovered_at'])
            features['days_since_discovery'] = (datetime.now() - discovered).days
        else:
            features['days_since_discovery'] = 0
        
        # Target para clasificación
        features['target_priority'] = self._calculate_priority_score(vuln_data)
        
        return features
    
    def _is_common_port(self, port: int) -> int:
        """Verificar si es un puerto común."""
        common_ports = {
            20, 21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995,
            135, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017
        }
        return 1 if port in common_ports else 0
    
    def _count_exploit_keywords(self, text: str) -> int:
        """Contar palabras clave relacionadas con explotación."""
        keywords = [
            'remote', 'execute', 'overflow', 'injection', 'bypass',
            'privilege', 'escalation', 'disclosure', 'denial',
            'cross-site', 'buffer', 'command'
        ]
        
        text_lower = text.lower()
        return sum(1 for keyword in keywords if keyword in text_lower)
    
    def _calculate_priority_score(self, vuln_data: Dict[str, Any]) -> str:
        """Calcular puntuación de prioridad."""
        cvss = vuln_data.get('cvss_score', 0.0)
        
        # Factores adicionales
        has_exploit = 'exploit' in vuln_data.get('description', '').lower()
        is_remote = 'remote' in vuln_data.get('description', '').lower()
        
        # Ajustar puntuación
        adjusted_score = cvss
        if has_exploit:
            adjusted_score += 1.0
        if is_remote:
            adjusted_score += 0.5
        
        # Clasificar
        if adjusted_score >= 9.0:
            return 'critical'
        elif adjusted_score >= 7.0:
            return 'high'
        elif adjusted_score >= 4.0:
            return 'medium'
        else:
            return 'low'
    
    def process_vulnerabilities_batch(self, vulnerabilities: List[Dict[str, Any]]) -> pd.DataFrame:
        """Procesar lote de vulnerabilidades."""
        processed_data = []
        
        for vuln in vulnerabilities:
            try:
                features = self.extract_features_from_vulnerability(vuln)
                features['vulnerability_id'] = vuln.get('id', '')
                processed_data.append(features)
                
            except Exception as e:
                print(f"Error procesando vulnerabilidad {vuln.get('id', 'unknown')}: {str(e)}")
                continue
        
        return pd.DataFrame(processed_data)

class DataQualityValidator:
    """Validador de calidad de datos."""
    
    def __init__(self):
        self.quality_report = {}
    
    def validate_dataset(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validar calidad del dataset."""
        report = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'missing_values': {},
            'data_types': {},
            'duplicates': 0,
            'outliers': {},
            'quality_score': 0.0
        }
        
        # Valores faltantes
        for column in df.columns:
            missing_count = df[column].isnull().sum()
            missing_percentage = (missing_count / len(df)) * 100
            report['missing_values'][column] = {
                'count': missing_count,
                'percentage': missing_percentage
            }
        
        # Tipos de datos
        for column in df.columns:
            report['data_types'][column] = str(df[column].dtype)
        
        # Duplicados
        report['duplicates'] = df.duplicated().sum()
        
        # Outliers para columnas numéricas
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        for column in numeric_columns:
            Q1 = df[column].quantile(0.25)
            Q3 = df[column].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
            report['outliers'][column] = len(outliers)
        
        # Calcular puntuación de calidad
        quality_score = self._calculate_quality_score(df, report)
        report['quality_score'] = quality_score
        
        return report
    
    def _calculate_quality_score(self, df: pd.DataFrame, report: Dict[str, Any]) -> float:
        """Calcular puntuación de calidad (0-100)."""
        score = 100.0
        
        # Penalizar valores faltantes
        avg_missing = np.mean([v['percentage'] for v in report['missing_values'].values()])
        score -= avg_missing * 0.5
        
        # Penalizar duplicados
        duplicate_percentage = (report['duplicates'] / len(df)) * 100
        score -= duplicate_percentage * 2
        
        # Penalizar outliers excesivos
        total_outliers = sum(report['outliers'].values())
        outlier_percentage = (total_outliers / len(df)) * 100
        if outlier_percentage > 10:  # Más del 10% son outliers
            score -= (outlier_percentage - 10) * 0.1
        
        return max(0.0, min(100.0, score))

class DataPreprocessor:
    """Preprocesador principal de datos."""
    
    def __init__(self):
        self.alert_processor = AlertDataProcessor()
        self.vuln_processor = VulnerabilityDataProcessor()
        self.validator = DataQualityValidator()
        
    def create_training_dataset(
        self, 
        alerts_data: List[Dict[str, Any]] = None,
        vulnerabilities_data: List[Dict[str, Any]] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> ProcessedDataset:
        """Crear dataset de entrenamiento completo."""
        
        combined_features = []
        
        # Procesar alertas
        if alerts_data:
            alerts_df = self.alert_processor.process_alerts_batch(alerts_data)
            print(f"✅ Procesadas {len(alerts_df)} alertas")
            
            # Validar calidad
            quality_report = self.validator.validate_dataset(alerts_df)
            print(f"   Calidad de datos de alertas: {quality_report['quality_score']:.1f}/100")
            
            combined_features.append(alerts_df)
        
        # Procesar vulnerabilidades  
        if vulnerabilities_data:
            vulns_df = self.vuln_processor.process_vulnerabilities_batch(vulnerabilities_data)
            print(f"✅ Procesadas {len(vulns_df)} vulnerabilidades")
            
            # Validar calidad
            quality_report = self.validator.validate_dataset(vulns_df)
            print(f"   Calidad de datos de vulnerabilidades: {quality_report['quality_score']:.1f}/100")
            
            combined_features.append(vulns_df)
        
        if not combined_features:
            raise ValueError("No hay datos para procesar")
        
        # Combinar datasets
        combined_df = pd.concat(combined_features, ignore_index=True, sort=False)
        
        # Preparar features y targets
        feature_columns = [col for col in combined_df.columns 
                          if not col.startswith('target_') and col not in ['alert_id', 'vulnerability_id']]
        
        # Determinar columna target principal
        if 'target_severity' in combined_df.columns:
            target_column = 'target_severity'
        elif 'target_priority' in combined_df.columns:
            target_column = 'target_priority'
        else:
            raise ValueError("No se encontró columna target válida")
        
        X = combined_df[feature_columns]
        y = combined_df[target_column]
        
        # Codificar etiquetas
        label_encoder = LabelEncoder()
        y_encoded = label_encoder.fit_transform(y.fillna('unknown'))
        
        # Crear pipeline de preprocesamiento
        numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_features = X.select_dtypes(include=['object']).columns.tolist()
        
        preprocessor = ColumnTransformer([
            ('num', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ]), numeric_features),
            ('cat', Pipeline([
                ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
                ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ]), categorical_features)
        ])
        
        # Ajustar y transformar
        X_processed = preprocessor.fit_transform(X)
        
        # División train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y_encoded, 
            test_size=test_size, 
            random_state=random_state,
            stratify=y_encoded
        )
        
        # Obtener nombres de features después del preprocesamiento
        feature_names = self._get_feature_names(preprocessor, numeric_features, categorical_features)
        
        # Metadatos
        metadata = {
            'total_samples': len(combined_df),
            'n_features': X_processed.shape[1],
            'n_classes': len(label_encoder.classes_),
            'class_names': label_encoder.classes_.tolist(),
            'feature_types': {
                'numeric': len(numeric_features),
                'categorical': len(categorical_features)
            },
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
        
        print(f"📊 Dataset preparado:")
        print(f"   Total muestras: {metadata['total_samples']}")
        print(f"   Features: {metadata['n_features']}")
        print(f"   Clases: {metadata['n_classes']} {metadata['class_names']}")
        print(f"   Train/Test: {metadata['train_size']}/{metadata['test_size']}")
        
        return ProcessedDataset(
            X_train=X_train,
            X_test=X_test,
            y_train=y_train,
            y_test=y_test,
            feature_names=feature_names,
            label_encoder=label_encoder,
            preprocessor=preprocessor,
            metadata=metadata
        )
    
    def _get_feature_names(self, preprocessor, numeric_features, categorical_features):
        """Obtener nombres de features después del preprocesamiento."""
        feature_names = []
        
        # Features numéricas (mantienen su nombre)
        feature_names.extend(numeric_features)
        
        # Features categóricas (se expanden con one-hot encoding)
        try:
            cat_transformer = preprocessor.named_transformers_['cat']
            onehot_encoder = cat_transformer.named_steps['onehot']
            
            for i, feature in enumerate(categorical_features):
                categories = onehot_encoder.categories_[i]
                for category in categories:
                    feature_names.append(f"{feature}_{category}")
        except:
            # Fallback si no se puede obtener los nombres
            feature_names.extend([f"cat_feature_{i}" for i in range(len(categorical_features))])
        
        return feature_names

def load_data_from_database(db_session, limit: int = None) -> Tuple[List[Dict], List[Dict]]:
    """Cargar datos desde la base de datos."""
    from ..utils.database import Alert, Vulnerability
    
    # Cargar alertas
    alerts_query = db_session.query(Alert)
    if limit:
        alerts_query = alerts_query.limit(limit)
    
    alerts = []
    for alert in alerts_query.all():
        alerts.append({
            'id': str(alert.id),
            'timestamp': alert.timestamp,
            'source': alert.source,
            'severity': alert.severity,
            'title': alert.title,
            'description': alert.description,
            'raw_data': alert.raw_data or {}
        })
    
    # Cargar vulnerabilidades
    vulns_query = db_session.query(Vulnerability)
    if limit:
        vulns_query = vulns_query.limit(limit)
    
    vulnerabilities = []
    for vuln in vulns_query.all():
        vulnerabilities.append({
            'id': str(vuln.id),
            'scan_id': vuln.scan_id,
            'target_host': vuln.target_host,
            'target_port': vuln.target_port,
            'cve_id': vuln.cve_id,
            'cvss_score': vuln.cvss_score or 0.0,
            'severity': vuln.severity,
            'vulnerability_name': vuln.vulnerability_name,
            'description': vuln.description,
            'service': vuln.service,
            'discovered_at': vuln.discovered_at
        })
    
    return alerts, vulnerabilities