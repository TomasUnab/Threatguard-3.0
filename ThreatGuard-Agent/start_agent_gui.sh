#!/bin/bash
# Launcher para ThreatGuard Agent GUI en Linux

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements-agent.txt
else
    source venv/bin/activate
fi

# Ejecutar la interfaz gráfica
python3 agent_ui_linux.py
