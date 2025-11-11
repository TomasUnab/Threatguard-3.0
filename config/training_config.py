"""
ThreatGuard - Configuración de Entrenamiento
=============================================

Archivo de configuración centralizado para el entrenamiento de modelos.
"""

# =============================================================================
# CONFIGURACIÓN DE DATOS
# =============================================================================

# Directorio de datos limpios
DATA_DIR = 'TrafficLabelling/cleaned'

# Balanceo de datos
BALANCE_DATA = True

# Máximo de muestras por clase (None para todas)
MAX_SAMPLES_PER_CLASS = 10000

# Proporción de datos de prueba
TEST_SIZE = 0.2

# Semilla aleatoria para reproducibilidad
RANDOM_STATE = 42


# =============================================================================
# CONFIGURACIÓN DEL MODELO
# =============================================================================

# Tipo de modelo: 'mlp' o 'random_forest'
MODEL_TYPE = 'mlp'

# Configuración para MLP (Multi-Layer Perceptron)
MLP_CONFIG = {
    'hidden_layers': (128, 64, 32),  # Arquitectura de capas ocultas
    'learning_rate': 'adaptive',      # 'constant', 'adaptive', 'invscaling'
    'learning_rate_init': 0.001,      # Tasa de aprendizaje inicial
    'activation': 'relu',              # Función de activación
    'solver': 'adam',                  # Optimizador
    'alpha': 0.0001,                   # Regularización L2
    'batch_size': 'auto',              # Tamaño de batch
    'max_iter': 1,                     # Iteraciones por época (usar 1)
    'warm_start': True,                # Continuar entrenamiento
    'early_stopping': False,           # Early stopping
    'verbose': False,
    'random_state': RANDOM_STATE
}

# Configuración para Random Forest
RF_CONFIG = {
    'n_estimators': 100,
    'max_depth': 20,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'max_features': 'sqrt',
    'class_weight': 'balanced',
    'random_state': RANDOM_STATE,
    'n_jobs': -1,
    'warm_start': True
}


# =============================================================================
# CONFIGURACIÓN DE ENTRENAMIENTO
# =============================================================================

# Número de épocas por defecto
DEFAULT_EPOCHS = 20

# Guardar mejor modelo automáticamente
SAVE_BEST_MODEL = True

# Generar gráficas de progreso
PLOT_PROGRESS = True

# Mostrar reporte detallado de clasificación
SHOW_DETAILED_REPORT = True

# Intervalo para mostrar métricas (cada N épocas)
METRICS_DISPLAY_INTERVAL = 1


# =============================================================================
# CONFIGURACIÓN DE GUARDADO
# =============================================================================

# Directorio para modelos entrenados
MODEL_DIR = 'models/trained'

# Directorio para modelos archivados
ARCHIVE_DIR = 'models/archived'

# Directorio para reportes
REPORTS_DIR = 'reports'

# Directorio para gráficas
PLOTS_DIR = 'reports/plots'

# Guardar historia en JSON
SAVE_HISTORY_JSON = True

# Formato de timestamp
TIMESTAMP_FORMAT = '%Y%m%d_%H%M%S'


# =============================================================================
# CONFIGURACIÓN DE VISUALIZACIÓN
# =============================================================================

# DPI para gráficas
PLOT_DPI = 300

# Tamaño de figura por defecto
PLOT_FIGSIZE = (15, 10)

# Estilo de gráficas
PLOT_STYLE = 'seaborn-v0_8-darkgrid'  # o 'default', 'ggplot', etc.

# Colores para gráficas
PLOT_COLORS = {
    'train': 'blue',
    'validation': 'red',
    'f1': 'green',
    'precision': 'cyan',
    'recall': 'magenta'
}


# =============================================================================
# CONFIGURACIÓN DE DEMO
# =============================================================================

DEMO_CONFIG = {
    'model_type': 'mlp',
    'hidden_layers': (64, 32),
    'epochs': 5,
    'max_samples_per_class': 1000,
    'balance_data': True
}


# =============================================================================
# CONFIGURACIÓN AVANZADA
# =============================================================================

# Habilitar validación cruzada
USE_CROSS_VALIDATION = False

# Número de folds para validación cruzada
CV_FOLDS = 5

# Optimización de hiperparámetros
OPTIMIZE_HYPERPARAMS = False

# Grid de búsqueda de hiperparámetros (RandomizedSearchCV)
HYPERPARAM_GRID = {
    'mlp': {
        'hidden_layer_sizes': [(64, 32), (128, 64), (128, 64, 32), (256, 128, 64)],
        'learning_rate_init': [0.001, 0.01, 0.0001],
        'alpha': [0.0001, 0.001, 0.01]
    },
    'random_forest': {
        'n_estimators': [50, 100, 200],
        'max_depth': [10, 20, 30, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
}

# Número de iteraciones para RandomizedSearchCV
HYPERPARAM_SEARCH_ITER = 10


# =============================================================================
# CONFIGURACIÓN DE EARLY STOPPING
# =============================================================================

# Habilitar early stopping personalizado
USE_EARLY_STOPPING = False

# Paciencia (épocas sin mejora antes de detener)
EARLY_STOPPING_PATIENCE = 5

# Delta mínimo de mejora
EARLY_STOPPING_MIN_DELTA = 0.0001


# =============================================================================
# LOGGING
# =============================================================================

# Nivel de verbosidad: 0=silencioso, 1=normal, 2=detallado
VERBOSITY = 1

# Guardar logs en archivo
SAVE_LOGS = True

# Directorio de logs
LOGS_DIR = 'logs/training'


# =============================================================================
# FUNCIONES DE UTILIDAD
# =============================================================================

def get_model_config(model_type=None):
    """Obtener configuración del modelo."""
    if model_type is None:
        model_type = MODEL_TYPE
    
    if model_type == 'mlp':
        return MLP_CONFIG.copy()
    elif model_type == 'random_forest':
        return RF_CONFIG.copy()
    else:
        raise ValueError(f"Tipo de modelo no soportado: {model_type}")


def get_demo_config():
    """Obtener configuración de demo."""
    return DEMO_CONFIG.copy()


def print_config():
    """Imprimir configuración actual."""
    print("\n" + "="*70)
    print("⚙️  CONFIGURACIÓN DE ENTRENAMIENTO")
    print("="*70)
    print(f"\n📊 DATOS:")
    print(f"   Directorio: {DATA_DIR}")
    print(f"   Balanceo: {BALANCE_DATA}")
    print(f"   Muestras por clase: {MAX_SAMPLES_PER_CLASS}")
    print(f"   Test size: {TEST_SIZE}")
    
    print(f"\n🤖 MODELO:")
    print(f"   Tipo: {MODEL_TYPE}")
    if MODEL_TYPE == 'mlp':
        print(f"   Arquitectura: {MLP_CONFIG['hidden_layers']}")
        print(f"   Learning rate: {MLP_CONFIG['learning_rate']}")
    
    print(f"\n🏋️ ENTRENAMIENTO:")
    print(f"   Épocas: {DEFAULT_EPOCHS}")
    print(f"   Guardar mejor: {SAVE_BEST_MODEL}")
    print(f"   Generar gráficas: {PLOT_PROGRESS}")
    
    print(f"\n💾 GUARDADO:")
    print(f"   Directorio modelos: {MODEL_DIR}")
    print(f"   Directorio reportes: {REPORTS_DIR}")
    print("="*70 + "\n")


if __name__ == "__main__":
    # Mostrar configuración
    print_config()
