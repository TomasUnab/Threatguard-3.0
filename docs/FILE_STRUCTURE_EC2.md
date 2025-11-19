# 📂 ThreatGuard - Estructura de Archivos para EC2

## 🎯 Resumen Ejecutivo

**Archivos a transferir:** ~50-70 MB (sin datasets)  
**Archivos críticos:** 15 archivos + 5 directorios  
**Tiempo de transferencia:** 2-5 minutos (dependiendo de conexión)  
**Tiempo de instalación en EC2:** 10-15 minutos

---

## 📊 Diagrama de Estructura Completa

```
ThreatGuard/                                 [TRANSFERIR]
│
├── 🔴 ARCHIVOS RAÍZ CRÍTICOS
│   ├── docker-compose.yml                   [252 líneas] ✅ CRÍTICO
│   ├── Dockerfile                           [~50 líneas] ✅ CRÍTICO
│   ├── Dockerfile.snort                     [~80 líneas] ✅ CRÍTICO
│   ├── threatguard_api.py                   [~800 líneas] ✅ CRÍTICO
│   ├── openvas_auto_scan.py                 [~400 líneas] ✅ CRÍTICO
│   ├── requirements.txt                     [~40 paquetes] ✅ CRÍTICO
│   ├── requirements-snort.txt               [~15 paquetes] ✅ CRÍTICO
│   └── nginx.conf                           [~50 líneas] ✅ CRÍTICO
│
├── 📁 config/                               ✅ CRÍTICO (TODO)
│   ├── config.ini                           Configuración general
│   ├── master.ini                           Config del servidor maestro
│   ├── cic_config.py                        Config de datasets
│   ├── training_config.py                   Config de entrenamiento
│   ├── snort.lua                            Configuración de Snort
│   └── local.rules                          Reglas personalizadas Snort
│
├── 📁 scripts/                              ✅ CRÍTICO (PARCIAL)
│   ├── init_db.sql/                         ✅ CRÍTICO - Scripts SQL
│   │   ├── 001_schema.sql
│   │   ├── 002_alerts.sql
│   │   ├── 003_assets.sql
│   │   ├── 004_vulnerabilities.sql
│   │   ├── 005_users.sql
│   │   ├── 006_tags.sql
│   │   └── ...
│   ├── ec2_setup.sh                         ✅ CRÍTICO - Instalador
│   ├── init_database.py                     🟡 Opcional (hace lo mismo que SQL)
│   ├── setup_openvas.py                     🟡 Opcional (auto en Docker)
│   ├── download_cic_dataset.py              ⚪ No necesario (datasets)
│   └── pcap_to_features.py                  ⚪ No necesario (preprocessing)
│
├── 📁 PAGINA WEB/                           ✅ CRÍTICO (TODO)
│   ├── Dockerfile                           Build del frontend
│   ├── nginx.conf                           Config Nginx frontend
│   ├── index.html                           Página principal
│   ├── common-header.html                   Header compartido
│   ├── settings-v2.js                       Configuración JS
│   ├── header-utils.js                      Utilidades JS
│   │
│   ├── executive_summary/                   Dashboard ejecutivo
│   │   ├── dashboard.html
│   │   └── code.html
│   │
│   ├── alerts_(triage_center)/              Centro de alertas
│   │   ├── alerts.html
│   │   └── code.html
│   │
│   ├── vulnerability_management/            Gestión de vulnerabilidades
│   │   ├── Dockerfile                       ✅ Backend OpenVAS API
│   │   ├── openvas-server.js                ✅ Servidor Node.js
│   │   ├── openvas-integration.js           ✅ Integración
│   │   ├── package.json                     ✅ Dependencias Node
│   │   ├── code.html
│   │   └── README.md
│   │
│   ├── soar_(automation_&_orchestration)/   SOAR
│   │   ├── code.html
│   │   └── soar-workflow.js
│   │
│   ├── reports/                             Reportes
│   │   ├── reports.html
│   │   ├── code.html
│   │   └── reports.js
│   │
│   ├── assets_(asset_&_asrm_mgmt.)/        Gestión de activos
│   │   └── code.html
│   │
│   ├── settings/                            Configuración
│   │   ├── settings.html
│   │   ├── code.html
│   │   ├── settings-v2.js
│   │   └── settings.js
│   │
│   └── ai_assistant_chat_modal/            Asistente IA
│       └── code.html
│
├── 📁 src/                                  ✅ CRÍTICO (TODO)
│   ├── __init__.py
│   │
│   ├── ai_models/                           Modelos de ML
│   │   ├── __init__.py
│   │   ├── cic_ids2017_processor.py         Procesador del dataset
│   │   ├── cic_intrusion_models.py          Modelos de detección
│   │   └── data_preprocessing.py            Preprocesamiento
│   │
│   ├── api/                                 APIs adicionales
│   │   ├── __init__.py
│   │   └── assets_api.py                    API de gestión de activos
│   │
│   ├── data_collection/                     Integraciones
│   │   ├── __init__.py
│   │   ├── openvas_integration.py           Integración OpenVAS
│   │   ├── snort_integration.py             Integración Snort
│   │   └── wazuh_integration.py             Integración Wazuh
│   │
│   └── utils/                               Utilidades
│       ├── __init__.py
│       ├── config.py                        Gestión de config
│       └── database.py                      Gestión de DB
│
├── 📁 docs/                                 🟡 OPCIONAL (recomendado)
│   ├── AWS_EC2_DEPLOYMENT.md                ✅ Guía completa EC2
│   ├── EC2_QUICK_REFERENCE.md               ✅ Referencia rápida
│   ├── DEPLOYMENT.md                        Despliegue general
│   ├── SNORT_INTEGRATION.md                 Integración Snort
│   ├── SOAR_INTEGRATIONS.md                 Integraciones SOAR
│   └── SQL_REFERENCE.md                     Referencia SQL
│
├── 📁 models/                               🟡 OPCIONAL
│   └── trained/                             Modelos pre-entrenados (.pkl)
│       └── *.pkl                            (~100-500 MB cada uno)
│
├── 📁 data/                                 ⚪ NO NECESARIO
│   └── CIC-IDS2017/                         Dataset (varios GB)
│       └── ...                              Se puede descargar después
│
└── 📁 ARCHIVOS A EXCLUIR                    ❌ NO TRANSFERIR
    ├── .venv/                               Entorno virtual local
    ├── .git/                                Repositorio Git
    ├── __pycache__/                         Cache Python
    ├── *.pyc, *.pyo                         Bytecode compilado
    ├── agent.py                             Solo para agentes
    ├── agent_ui.py                          UI de agente
    ├── build_agent.spec                     Build de agente
    ├── start_agent.bat                      Script Windows agente
    ├── *.bat                                Scripts Windows
    └── installer/                           Instalador Windows
```

---

## 📋 Checklist de Archivos Críticos

### ✅ Nivel 1: ABSOLUTAMENTE NECESARIOS
```
☐ docker-compose.yml
☐ Dockerfile
☐ Dockerfile.snort
☐ threatguard_api.py
☐ openvas_auto_scan.py
☐ requirements.txt
☐ requirements-snort.txt
☐ nginx.conf
☐ config/ (completo)
☐ scripts/init_db.sql/ (completo)
☐ scripts/ec2_setup.sh
☐ PAGINA WEB/ (completo)
☐ src/ (completo)
```

**Sin estos archivos, el sistema NO funcionará.**

---

### 🟡 Nivel 2: ALTAMENTE RECOMENDADOS
```
☐ docs/AWS_EC2_DEPLOYMENT.md
☐ docs/EC2_QUICK_REFERENCE.md
☐ docs/DEPLOYMENT.md
☐ models/trained/*.pkl (si tienes modelos pre-entrenados)
```

**El sistema funciona sin estos, pero facilitarán la gestión.**

---

### ⚪ Nivel 3: OPCIONALES
```
☐ data/CIC-IDS2017/ (se puede descargar después)
☐ docs/SNORT_INTEGRATION.md
☐ docs/SOAR_INTEGRATIONS.md
☐ scripts/download_cic_dataset.py
☐ scripts/pcap_to_features.py
```

**No afectan el funcionamiento inicial.**

---

## 🔢 Tamaños Aproximados

| Categoría | Tamaño | Comentarios |
|-----------|--------|-------------|
| **Archivos raíz** | ~5 MB | Código Python, configs Docker |
| **config/** | <1 MB | Archivos de configuración |
| **scripts/** | ~2 MB | Scripts SQL e instalación |
| **PAGINA WEB/** | ~10 MB | Frontend completo con assets |
| **src/** | ~5 MB | Código fuente Python |
| **docs/** | ~1 MB | Documentación Markdown |
| **TOTAL CRÍTICO** | **~25 MB** | Sin modelos ni datasets |
| | |
| **models/trained/** | 100-500 MB | Modelos ML pre-entrenados |
| **data/CIC-IDS2017/** | 10+ GB | Dataset completo |

---

## 🚀 Métodos de Transferencia por Tamaño

### Para ~25 MB (solo críticos) - RECOMENDADO
```powershell
# Usar el script automatizado (Windows)
.\transfer_to_ec2.ps1 -EC2_IP "54.123.45.67" -KeyFile "tu-key.pem"
```

### Para 100+ MB (con modelos)
```bash
# Usar rsync con compresión
rsync -avz --progress -e "ssh -i tu-key.pem" \
  --exclude='.venv' --exclude='.git' --exclude='data/' \
  . ec2-user@TU-IP:/opt/threatguard/
```

### Para datasets grandes (varios GB)
```bash
# NO transferir, descargar directamente en EC2
ssh -i tu-key.pem ec2-user@TU-IP
cd /opt/threatguard
python scripts/download_cic_dataset.py
```

---

## 🎨 Visualización de Dependencias

```
┌──────────────────────────────────────────────┐
│         docker-compose.yml (MAESTRO)         │
└────────┬─────────────────────────────────────┘
         │
    ┌────┴────┬────────┬────────┬────────┬──────────┐
    │         │        │        │        │          │
    ▼         ▼        ▼        ▼        ▼          ▼
┌───────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌────────┐
│  API  │ │Front │ │Postgres│ │Redis│ │OpenVAS │ │ Snort  │
│       │ │ end  │ │        │ │     │ │        │ │        │
└───┬───┘ └──┬───┘ └────────┘ └─────┘ └────────┘ └────────┘
    │        │
    ▼        ▼
┌─────────────────┐  ┌──────────────────┐
│ threatguard_    │  │   PAGINA WEB/    │
│ api.py          │  │                  │
├─────────────────┤  ├──────────────────┤
│ requirements.txt│  │   Dockerfile     │
│ Dockerfile      │  │   nginx.conf     │
│                 │  │   *.html/*.js    │
├─────────────────┤  └──────────────────┘
│ src/            │
│ ├─ai_models/    │
│ ├─api/          │
│ ├─data_collect/ │
│ └─utils/        │
└─────────────────┘
```

---

## 💡 Consejos para Reducir Tamaño

### 1. Excluir archivos temporales
```bash
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete
find . -name ".DS_Store" -delete
```

### 2. Comprimir antes de transferir
```bash
tar -czf threatguard.tar.gz \
  --exclude='.venv' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='data/' \
  --exclude='models/trained/' \
  .
```

### 3. Usar .dockerignore
```bash
# Crear archivo .dockerignore
cat > .dockerignore << EOF
.git
.venv
__pycache__
*.pyc
*.pyo
data/CIC-IDS2017
models/trained/*.pkl
*.bak
*.tmp
EOF
```

---

## 🔍 Verificación de Archivos

### Script para verificar archivos críticos
```bash
#!/bin/bash
echo "Verificando archivos críticos..."

CRITICAL_FILES=(
    "docker-compose.yml"
    "Dockerfile"
    "Dockerfile.snort"
    "threatguard_api.py"
    "openvas_auto_scan.py"
    "requirements.txt"
    "requirements-snort.txt"
    "nginx.conf"
)

CRITICAL_DIRS=(
    "config"
    "scripts/init_db.sql"
    "PAGINA WEB"
    "src"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ FALTA: $file"
    fi
done

for dir in "${CRITICAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✓ $dir/"
    else
        echo "✗ FALTA: $dir/"
    fi
done
```

Guardar como `verify_files.sh` y ejecutar antes de transferir.

---

## 📞 Próximos Pasos

1. **Revisar esta estructura** para entender qué necesitas
2. **Elegir método de transferencia** según tu caso:
   - Script automatizado → `transfer_to_ec2.ps1` (Windows)
   - Paquete comprimido → `prepare_ec2_package.sh` (Linux/Mac)
   - rsync directo → Para actualizaciones rápidas
3. **Transferir archivos** a EC2
4. **Ejecutar instalación** con `scripts/ec2_setup.sh`
5. **Verificar** con `/opt/threatguard/check_health.sh`

---

**🎯 TL;DR:** Necesitas **~25 MB de archivos críticos** (sin modelos/datasets).  
Usa el script automatizado para transferir todo correctamente.

---

**Última actualización:** Noviembre 2025  
**Versión:** ThreatGuard 2.0
