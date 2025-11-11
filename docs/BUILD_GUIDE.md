# Guía de Construcción - ThreatGuard Agent

## Requisitos Previos

### 1. Python 3.11+
```bash
python --version
```

### 2. Inno Setup (para instalador)
Descargar: https://jrsoftware.org/isdl.php

## Proceso de Build

### Paso 1: Instalar dependencias
```bash
pip install -r requirements-agent.txt
```

### Paso 2: Crear icono (opcional)
Colocar `icon.ico` en carpeta `assets/`

Si no tienes icono, el build funcionará sin él.

### Paso 3: Construir ejecutable
```bash
# Opción A: Script automático
build.bat

# Opción B: Manual
pyinstaller build_agent.spec --clean
```

Resultado: `dist/ThreatGuard-Agent.exe`

### Paso 4: Crear instalador
```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\setup.iss
```

Resultado: `dist/ThreatGuard-Agent-Setup.exe`

## Estructura de Archivos

```
ThreatGuard/
├── agent_ui.py                    # UI principal
├── log_agent_service.py           # Lógica del agente
├── build_agent.spec               # Config PyInstaller
├── build.bat                      # Script de build
├── installer/
│   └── setup.iss                  # Config Inno Setup
├── assets/
│   └── icon.ico                   # Icono (crear)
└── dist/
    ├── ThreatGuard-Agent.exe      # Ejecutable
    └── ThreatGuard-Agent-Setup.exe # Instalador
```

## Pruebas

### Probar ejecutable
```bash
cd dist
ThreatGuard-Agent.exe
```

### Probar instalador
1. Ejecutar `ThreatGuard-Agent-Setup.exe`
2. Seguir wizard de instalación
3. Verificar instalación en `C:\Program Files\ThreatGuard Agent\`

## Distribución

### Sin firma de código
- Windows SmartScreen mostrará advertencia
- Normal para software nuevo
- Usuario debe hacer clic en "Más información" → "Ejecutar de todas formas"

### Con firma de código (Recomendado para producción)
```bash
# Obtener certificado de DigiCert/Sectigo (~$200-400/año)
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist\ThreatGuard-Agent.exe
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com dist\ThreatGuard-Agent-Setup.exe
```

## Troubleshooting

### Error: "No module named customtkinter"
```bash
pip install customtkinter
```

### Error: "icon.ico not found"
Comentar línea en `build_agent.spec`:
```python
# icon='assets/icon.ico'
icon=None
```

### Instalador no se crea
Verificar ruta de Inno Setup:
```bash
dir "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
```

## Tamaño del Instalador

- Ejecutable: ~50-80 MB
- Instalador: ~50-80 MB
- Instalado: ~100-150 MB

## Optimización

Para reducir tamaño:
```python
# En build_agent.spec
upx=True  # Comprimir ejecutable
```
