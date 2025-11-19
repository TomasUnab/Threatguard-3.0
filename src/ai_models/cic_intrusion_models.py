"""
Modelos de Machine Learning para Dataset CIC-IDS2017
====================================================

Implementación de modelos especializados para detección de intrusiones
usando el dataset CIC-IDS2017 integrado con ThreatGuard.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
import joblib
import json
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime

# Sklearn imports
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_recall_fscore_support, roc_auc_score
)
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, GridSearchCV

# XGBoost y LightGBM
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️ XGBoost no disponible. Instalar con: pip install xgboost")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    print("⚠️ LightGBM no disponible. Instalar con: pip install lightgbm")

from .cic_ids2017_processor import CICDatasetProcessor

@dataclass
class ModelMetrics:
    """Métricas de evaluación del modelo."""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float = None
    confusion_matrix: List[List[int]] = None
    classification_report: str = None
    training_time: float = None
    inference_time: float = None

@dataclass
class ModelConfig:
    """Configuración para entrenamiento de modelos."""
    model_type: str = "random_forest"
    use_cross_validation: bool = True
    cv_folds: int = 5
    hyperparameter_tuning: bool = False
    save_model: bool = True
    model_save_path: str = "./models/cic_ids2017/"

class CICIntrusionDetector:
    """Detector de intrusiones usando modelos ML entrenados con CIC-IDS2017."""
    
    def __init__(self, config: ModelConfig = None):
        self.config = config or ModelConfig()
        self.models = {}
        self.scalers = {}
        self.label_encoders = {}
        self.feature_names = {}
        self.training_metadata = {}
        
        # Asegurar que existe directorio de modelos
        Path(self.config.model_save_path).mkdir(parents=True, exist_ok=True)
    
    def get_model_by_type(self, model_type: str, **kwargs) -> Any:
        """Obtener modelo por tipo."""
        models = {
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
                **kwargs
            ),
            'logistic_regression': LogisticRegression(
                max_iter=1000,
                random_state=42,
                **kwargs
            )
        }
        
        # XGBoost
        if XGBOOST_AVAILABLE and model_type == 'xgboost':
            models['xgboost'] = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                **kwargs
            )
        
        # LightGBM
        if LIGHTGBM_AVAILABLE and model_type == 'lightgbm':
            models['lightgbm'] = lgb.LGBMClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbose=-1,
                **kwargs
            )
        
        if model_type not in models:
            available = list(models.keys())
            raise ValueError(f"Modelo {model_type} no disponible. Opciones: {available}")
        
        return models[model_type]
    
    def hyperparameter_tuning(self, model_type: str, X_train: np.ndarray, 
                            y_train: np.ndarray) -> Dict[str, Any]:
        """Búsqueda de hiperparámetros óptimos."""
        print(f"🎯 Optimizando hiperparámetros para {model_type}...")
        
        param_grids = {
            'random_forest': {
                'n_estimators': [50, 100, 200],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            },
            'xgboost': {
                'n_estimators': [50, 100, 200],
                'max_depth': [3, 6, 10],
                'learning_rate': [0.01, 0.1, 0.2],
                'subsample': [0.8, 0.9, 1.0]
            },
            'lightgbm': {
                'n_estimators': [50, 100, 200],
                'max_depth': [3, 6, 10],
                'learning_rate': [0.01, 0.1, 0.2],
                'subsample': [0.8, 0.9, 1.0]
            }
        }
        
        if model_type not in param_grids:
            print(f"   ⚠️ Grid search no configurado para {model_type}")
            return {}
        
        base_model = self.get_model_by_type(model_type)
        
        grid_search = GridSearchCV(
            base_model,
            param_grids[model_type],
            cv=3,  # CV reducido para velocidad
            scoring='f1_macro',
            n_jobs=-1,
            verbose=1
        )
        
        # Usar subset para tuning si dataset es muy grande
        if len(X_train) > 10000:
            indices = np.random.choice(len(X_train), 10000, replace=False)
            X_tune = X_train[indices]
            y_tune = y_train[indices]
        else:
            X_tune = X_train
            y_tune = y_train
        
        grid_search.fit(X_tune, y_tune)
        
        print(f"   ✅ Mejores parámetros: {grid_search.best_params_}")
        print(f"   📊 Mejor score: {grid_search.best_score_:.4f}")
        
        return grid_search.best_params_
    
    def train_model(self, dataset: Dict[str, Any], model_type: str = None) -> ModelMetrics:
        """Entrenar modelo específico."""
        model_type = model_type or self.config.model_type
        print(f"🎯 Entrenando modelo {model_type} con dataset CIC-IDS2017...")
        
        start_time = datetime.now()
        
        # Extraer datos
        X_train = dataset['X_train']
        X_test = dataset['X_test'] 
        y_train = dataset['y_train']
        y_test = dataset['y_test']
        
        # Escalado para algunos modelos
        if model_type in ['logistic_regression', 'svm']:
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X_train)
            X_test = scaler.transform(X_test)
            self.scalers[model_type] = scaler
        
        # Optimización de hiperparámetros si está habilitada
        best_params = {}
        if self.config.hyperparameter_tuning:
            best_params = self.hyperparameter_tuning(model_type, X_train, y_train)
        
        # Crear y entrenar modelo
        model = self.get_model_by_type(model_type, **best_params)
        
        print(f"   🔄 Entrenando {model_type}...")
        model.fit(X_train, y_train)
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        # Validación cruzada si está habilitada
        cv_scores = None
        if self.config.use_cross_validation:
            print(f"   🔍 Validación cruzada ({self.config.cv_folds} folds)...")
            cv_scores = cross_val_score(
                model, X_train, y_train, 
                cv=self.config.cv_folds, 
                scoring='f1_macro'
            )
            print(f"   📊 CV F1-Score: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        # Evaluación en test set
        start_inference = datetime.now()
        y_pred = model.predict(X_test)
        inference_time = (datetime.now() - start_inference).total_seconds()
        
        # Calcular métricas
        metrics = self._calculate_metrics(y_test, y_pred, dataset['class_names'])
        metrics.training_time = training_time
        metrics.inference_time = inference_time
        
        # Guardar modelo y metadatos
        self.models[model_type] = model
        self.label_encoders[model_type] = dataset['label_encoder']
        self.feature_names[model_type] = dataset['feature_names']
        
        self.training_metadata[model_type] = {
            'model_type': model_type,
            'dataset_metadata': dataset['metadata'],
            'best_params': best_params,
            'cv_scores': cv_scores.tolist() if cv_scores is not None else None,
            'metrics': asdict(metrics),
            'training_date': datetime.now().isoformat(),
            'feature_importance': self._get_feature_importance(model, dataset['feature_names'])
        }
        
        # Guardar modelo si está configurado
        if self.config.save_model:
            self.save_model(model_type)
        
        print(f"✅ Modelo {model_type} entrenado:")
        print(f"   Accuracy: {metrics.accuracy:.4f}")
        print(f"   F1-Score: {metrics.f1_score:.4f}")
        print(f"   Tiempo entrenamiento: {training_time:.2f}s")
        
        return metrics
    
    def train_multiple_models(self, dataset: Dict[str, Any], 
                            model_types: List[str] = None) -> Dict[str, ModelMetrics]:
        """Entrenar múltiples modelos y comparar."""
        if model_types is None:
            model_types = ['random_forest', 'logistic_regression']
            if XGBOOST_AVAILABLE:
                model_types.append('xgboost')
            if LIGHTGBM_AVAILABLE:
                model_types.append('lightgbm')
        
        print(f"🎯 Entrenando {len(model_types)} modelos: {model_types}")
        
        results = {}
        
        for model_type in model_types:
            try:
                print(f"\n{'='*50}")
                metrics = self.train_model(dataset, model_type)
                results[model_type] = metrics
            except Exception as e:
                print(f"❌ Error entrenando {model_type}: {str(e)}")
                continue
        
        # Comparar resultados
        print(f"\n{'='*50}")
        print("📊 COMPARACIÓN DE MODELOS:")
        print(f"{'='*50}")
        
        comparison_df = pd.DataFrame({
            model: {
                'Accuracy': metrics.accuracy,
                'Precision': metrics.precision,
                'Recall': metrics.recall,
                'F1-Score': metrics.f1_score,
                'Training Time (s)': metrics.training_time or 0
            }
            for model, metrics in results.items()
        }).T
        
        print(comparison_df.round(4))
        
        # Encontrar mejor modelo
        best_model = comparison_df['F1-Score'].idxmax()
        print(f"\n🏆 Mejor modelo: {best_model} (F1-Score: {comparison_df.loc[best_model, 'F1-Score']:.4f})")
        
        return results
    
    def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray, 
                          class_names: List[str]) -> ModelMetrics:
        """Calcular métricas de evaluación."""
        accuracy = accuracy_score(y_true, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average='weighted'
        )
        
        # Matriz de confusión
        cm = confusion_matrix(y_true, y_pred)
        
        # Reporte de clasificación
        report = classification_report(
            y_true, y_pred, target_names=class_names, zero_division=0
        )
        
        # ROC AUC para clasificación multiclase
        roc_auc = None
        try:
            if len(np.unique(y_true)) > 2:
                roc_auc = roc_auc_score(y_true, y_pred, multi_class='ovr', average='weighted')
            else:
                roc_auc = roc_auc_score(y_true, y_pred)
        except:
            pass
        
        return ModelMetrics(
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1,
            roc_auc=roc_auc,
            confusion_matrix=cm.tolist(),
            classification_report=report
        )
    
    def _get_feature_importance(self, model: Any, feature_names: List[str]) -> Dict[str, float]:
        """Obtener importancia de features del modelo."""
        try:
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                
                # Crear diccionario ordenado por importancia
                feature_importance = dict(zip(feature_names, importance))
                feature_importance = dict(
                    sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
                )
                
                return feature_importance
        except:
            pass
        
        return {}
    
    def predict(self, X: np.ndarray, model_type: str = 'random_forest') -> Dict[str, Any]:
        """Realizar predicción con modelo entrenado."""
        if model_type not in self.models:
            raise ValueError(f"Modelo {model_type} no entrenado")
        
        model = self.models[model_type]
        
        # Aplicar escalado si es necesario
        if model_type in self.scalers:
            X = self.scalers[model_type].transform(X)
        
        # Predicción
        predictions = model.predict(X)
        probabilities = None
        
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(X)
        
        # Decodificar etiquetas
        label_encoder = self.label_encoders[model_type]
        predicted_labels = label_encoder.inverse_transform(predictions)
        
        return {
            'predictions': predictions.tolist(),
            'predicted_labels': predicted_labels.tolist(),
            'probabilities': probabilities.tolist() if probabilities is not None else None,
            'class_names': label_encoder.classes_.tolist()
        }
    
    def save_model(self, model_type: str):
        """Guardar modelo entrenado."""
        if model_type not in self.models:
            raise ValueError(f"Modelo {model_type} no encontrado")
        
        model_path = Path(self.config.model_save_path)
        
        # Guardar modelo
        model_file = model_path / f"cic_ids2017_{model_type}.joblib"
        joblib.dump(self.models[model_type], model_file)
        
        # Guardar scaler si existe
        if model_type in self.scalers:
            scaler_file = model_path / f"cic_ids2017_{model_type}_scaler.joblib"
            joblib.dump(self.scalers[model_type], scaler_file)
        
        # Guardar label encoder
        encoder_file = model_path / f"cic_ids2017_{model_type}_encoder.joblib"
        joblib.dump(self.label_encoders[model_type], encoder_file)
        
        # Guardar metadatos
        metadata_file = model_path / f"cic_ids2017_{model_type}_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(self.training_metadata[model_type], f, indent=2)
        
        print(f"💾 Modelo {model_type} guardado en {model_path}")
    
    def load_model(self, model_type: str):
        """Cargar modelo pre-entrenado."""
        model_path = Path(self.config.model_save_path)
        
        # Cargar modelo
        model_file = model_path / f"cic_ids2017_{model_type}.joblib"
        if not model_file.exists():
            raise FileNotFoundError(f"Modelo no encontrado: {model_file}")
        
        self.models[model_type] = joblib.load(model_file)
        
        # Cargar scaler si existe
        scaler_file = model_path / f"cic_ids2017_{model_type}_scaler.joblib"
        if scaler_file.exists():
            self.scalers[model_type] = joblib.load(scaler_file)
        
        # Cargar label encoder
        encoder_file = model_path / f"cic_ids2017_{model_type}_encoder.joblib"
        if encoder_file.exists():
            self.label_encoders[model_type] = joblib.load(encoder_file)
        
        # Cargar metadatos
        metadata_file = model_path / f"cic_ids2017_{model_type}_metadata.json"
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                self.training_metadata[model_type] = json.load(f)
        
        print(f"📂 Modelo {model_type} cargado desde {model_path}")
    
    def evaluate_on_new_data(self, X: np.ndarray, y: np.ndarray, 
                           model_type: str = 'random_forest') -> ModelMetrics:
        """Evaluar modelo en datos nuevos."""
        if model_type not in self.models:
            raise ValueError(f"Modelo {model_type} no entrenado")
        
        # Realizar predicción
        results = self.predict(X, model_type)
        y_pred = results['predictions']
        
        # Calcular métricas
        class_names = results['class_names']
        return self._calculate_metrics(y, y_pred, class_names)

class CICIntrusionPipeline:
    """Pipeline completo para detección de intrusiones con CIC-IDS2017."""
    
    def __init__(self, data_path: str = None):
        self.data_path = data_path
        self.processor = CICDatasetProcessor()
        self.detector = CICIntrusionDetector()
        self.dataset = None
    
    def run_full_pipeline(self, model_types: List[str] = None) -> Dict[str, Any]:
        """Ejecutar pipeline completo de entrenamiento."""
        print("🚀 Iniciando pipeline completo CIC-IDS2017...")
        
        # 1. Crear dataset
        print("\n" + "="*50)
        print("PASO 1: PREPARACIÓN DE DATOS")
        print("="*50)
        
        self.dataset = self.processor.create_training_dataset(self.data_path)
        
        # 2. Entrenar modelos
        print("\n" + "="*50)
        print("PASO 2: ENTRENAMIENTO DE MODELOS")
        print("="*50)
        
        results = self.detector.train_multiple_models(self.dataset, model_types)
        
        # 3. Resumen final
        print("\n" + "="*50)
        print("RESUMEN FINAL DEL PIPELINE")
        print("="*50)
        
        summary = {
            'dataset_info': self.dataset['metadata'],
            'model_results': {
                model: asdict(metrics) for model, metrics in results.items()
            },
            'pipeline_completed': True,
            'timestamp': datetime.now().isoformat()
        }
        
        print("✅ Pipeline completado exitosamente!")
        print(f"   Dataset: {summary['dataset_info']['total_samples']} muestras")
        print(f"   Modelos entrenados: {len(results)}")
        print(f"   Mejor modelo: {max(results.keys(), key=lambda k: results[k].f1_score)}")
        
        return summary
    
    def predict_threat(self, network_features: np.ndarray, 
                      model_type: str = 'random_forest') -> Dict[str, Any]:
        """Predecir amenaza en datos de red nuevos."""
        if not self.dataset or model_type not in self.detector.models:
            raise ValueError("Pipeline no ejecutado o modelo no entrenado")
        
        return self.detector.predict(network_features, model_type)