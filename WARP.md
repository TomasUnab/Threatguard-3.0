# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Comandos frecuentes (Windows PowerShell)

- Crear venv e instalar dependencias core (usar las de `config/requirements.txt`):
  ```powershell
  python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r config/requirements.txt
  ```
- Ejecutar la API (FastAPI/Uvicorn) en desarrollo (lee puertos desde `config/config.ini` y `src/utils/config.py`; por defecto 8000):
  ```powershell
  $env:PYTHONPATH = (Get-Location).Path; uvicorn threatguard_api:app --host 0.0.0.0 --port 8000 --reload
  ```
- Cargar modelo más reciente (la API lo hace en arranque; dejar modelos en `models/threatguard_model_*.pkl`).
- Servicios locales con Docker (API + Postgres + Redis + OpenVAS + Frontend):
  ```powershell
  docker compose -f config/docker-compose.yml up -d
  docker compose -f config/docker-compose.yml logs -f threatguard-api
  ```
- Verificar puertos abiertos (útil para el instalador/EXE):
  ```powershell
  Test-NetConnection localhost -Port 8000; Test-NetConnection localhost -Port 8002; Test-NetConnection localhost -Port 8080
  Test-NetConnection localhost -Port 5432; Test-NetConnection localhost -Port 6379; Test-NetConnection localhost -Port 9201
  ```
- Scripts útiles (directorio `scripts/`):
  - Inicializar BD: `python scripts/init_database.py`
  - Descargar dataset CIC: `python scripts/download_cic_dataset.py`
  - Convertir PCAP a features: `python scripts/pcap_to_features.py`
  - Monitoreo Snort simple: `python scripts/snort_monitor_simple.py`

Notas:
- No hay suite de tests incluida en el repositorio al momento de esta versión. Si se agregan, documentar cómo ejecutar un test único aquí.

## Estructura y arquitectura (alto nivel)

- Entrada principal de API: `threatguard_api.py` (FastAPI)
  - Endpoints de alertas, estado, integración inicial con Redis y SQLAlchemy.
  - Usa `src/utils/config.py` para leer configuración (variables de entorno y `config/config.ini`).
- Capa de utilidades (`src/utils/`):
  - `database.py`: modelos SQLAlchemy (Alert, Vulnerability, ScanJob, User, SystemMetric) y helpers (URL DB vía `get_database_url`).
  - `elasticsearch_client.py`: cliente ES, índice `threatguard-alerts` y búsquedas/estadísticas.
  - `config.py`: clases Settings (DB/Redis/OpenVAS/API/Logging/ML/etc.). La API escucha en `API_PORT` (por defecto 8000).
- Integraciones de recolección (`src/data_collection/`):
  - `snort_integration.py`: lee `SNORT_ALERT_FILE`, normaliza y envía a API. Incluye lógica para severidad y tráfico ISP.
  - `wazuh_integration.py`: cliente REST de Wazuh (auth, obtención de agentes/alertas/reglas) y normalización de alertas.
  - `openvas_integration.py`: cliente GVM/OpenVAS (crear targets/tareas, iniciar escaneos, parsear resultados).
- Modelos de IA (`src/ai_models/`):
  - `cic_intrusion_models.py`: entrenamiento/evaluación para CIC-IDS2017 con RandomForest/LogReg y opcional XGBoost/LightGBM; guarda artefactos en `models/`.
- API adicional de inventario (`src/api/assets_api.py`):
  - Router FastAPI para info de sistema/activos, usado por el dashboard.
- Configuración del sistema (`config/`):
  - `config.ini`: puertos y credenciales (Postgres 5432, Redis 6379, API 8000, OpenVAS 9390/9392, etc.).
  - `docker-compose.yml`: orquesta todos los servicios. Nota: ES se publica en 9201.
  - `requirements.txt`: dependencias Python (pandas, sklearn, FastAPI, SQLAlchemy, Redis, Elasticsearch, etc.).
- Instalador de escritorio (Electron): `installer/installer-app/`
  - Ejecutables generados en `installer/installer-app/dist/`:
    - Instalador: `ThreatGuard Installer Setup 1.0.0.exe` (recomendado para instalación).
    - Ejecutable portable/desempaquetado: `dist/win-unpacked/ThreatGuard Installer.exe`.
  - Backend Node embebido: `resources/app/src/backend/app.js` escucha en `PORT` (por defecto 8002). Úsalo como puente local del UI hacia servicios (FastAPI 8000, etc.).

## Convenciones y decisiones clave

- Persistencia: PostgreSQL por defecto (puede cambiarse a MySQL desde el instalador, pero el código base está optimizado para Postgres).
- Mensajería/colas y cache: Redis.
- Búsqueda/agregaciones de alertas: Elasticsearch opcional (`elasticsearch_client.py`).
- Modelos: guardados como `pickle` con metadatos/accuracy en `models/` y cargados al iniciar la API.
- Seguridad: habilitar CORS desde orígenes de dashboard (`settings.api.cors_origins`).

## Puertos por defecto y cómo ajustarlos

- FastAPI: 8000 (`config/config.ini` sección `[api]` o variable `API_PORT`).
- Backend Electron: 8002 (`installer/.../src/backend/app.js`, var `PORT`).
- Dashboard (Nginx en Docker): 8080 -> contenedor 80 (`config/docker-compose.yml`).
- Postgres: 5432, Redis: 6379, OpenVAS: 9390/9392, Elasticsearch: 9201.

Cambios recomendados
- Si hay conflicto de puertos en Windows, modificar `config/config.ini` y reiniciar servicios. Para el backend Electron, crear variable de entorno `PORT` antes de lanzar el EXE.

## Flujos típicos

- Desarrollo local sin Docker:
  1) Activar venv y `pip install -r config/requirements.txt`.
  2) Levantar dependencias (Postgres/Redis) locales o via Docker.
  3) `uvicorn threatguard_api:app --reload` y consumir desde dashboard o scripts.

- Con Docker end-to-end:
  1) `docker compose -f config/docker-compose.yml up -d`.
  2) API en http://localhost:8000, dashboard en http://localhost:8080.

## Integraciones del instalador (Windows)

- EXE recomendado: `installer/installer-app/dist/ThreatGuard Installer Setup 1.0.0.exe`.
- Si el backend no responde, comprobar 8002 y abrir firewall para 8000/8002/8080/5432/6379/9201/9390/9392.
- Variables de entorno útiles antes de lanzar el EXE:
  ```powershell
  $env:PORT=8002; $env:API_PORT=8000; $env:DB_HOST='localhost'; $env:REDIS_HOST='localhost'
  ```
