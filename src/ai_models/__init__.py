"""
Módulo de Modelos de Inteligencia Artificial de ThreatGuard
==========================================================

Sistema de IA para clasificación y priorización de amenazas:
- Preprocesamiento de datos de seguridad
- Generación de datos sintéticos
- Modelos de clasificación (Random Forest, XGBoost, LightGBM)
- Evaluación y métricas de rendimiento
- Predicción en tiempo real
"""

from .data_preprocessing import (
    AlertDataProcessor, 
    VulnerabilityDataProcessor, 
    DataQualityValidator,
    DataPreprocessor,
    ProcessedDataset,
    load_data_from_database
)

from .synthetic_data_generator import (
    SyntheticAlertGenerator,
    SyntheticVulnerabilityGenerator, 
    SyntheticDatasetGenerator,
    SyntheticDataConfig
)

__all__ = [
    # Data Preprocessing
    "AlertDataProcessor",
    "VulnerabilityDataProcessor", 
    "DataQualityValidator",
    "DataPreprocessor",
    "ProcessedDataset",
    "load_data_from_database",
    
    # Synthetic Data Generation
    "SyntheticAlertGenerator",
    "SyntheticVulnerabilityGenerator",
    "SyntheticDatasetGenerator", 
    "SyntheticDataConfig"
]