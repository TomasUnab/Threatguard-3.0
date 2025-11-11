#!/bin/bash
# Script para desplegar el agente en múltiples servidores Linux remotos

echo "========================================"
echo "  ThreatGuard - Despliegue Masivo"
echo "========================================"
echo ""

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo "Uso: $0 <archivo_con_ips>"
    echo ""
    echo "Ejemplo de archivo de IPs (servers.txt):"
    echo "  192.168.1.10 usuario"
    echo "  192.168.1.11 root"
    echo "  192.168.1.12 admin"
    echo ""
    exit 1
fi

SERVERS_FILE=$1

if [ ! -f "$SERVERS_FILE" ]; then
    echo "ERROR: Archivo $SERVERS_FILE no encontrado"
    exit 1
fi

# Archivos a copiar
FILES=(
    "agent.py"
    "requirements-agent.txt"
    "install_agent_linux.sh"
)

# Verificar que todos los archivos existan
for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "ERROR: Falta el archivo $file"
        exit 1
    fi
done

# Verificar directorio src
if [ ! -d "src" ]; then
    echo "ERROR: Falta el directorio src/"
    exit 1
fi

echo "Archivos verificados. Iniciando despliegue..."
echo ""

# Leer servidores y desplegar
while IFS=' ' read -r ip user; do
    # Ignorar líneas vacías o comentarios
    [[ -z "$ip" || "$ip" =~ ^# ]] && continue
    
    echo "========================================"
    echo "Desplegando en: $user@$ip"
    echo "========================================"
    
    # Crear directorio temporal en servidor remoto
    ssh "$user@$ip" "mkdir -p /tmp/threatguard-install" 2>/dev/null
    
    # Copiar archivos
    echo "Copiando archivos..."
    scp -r agent.py requirements-agent.txt install_agent_linux.sh src/ "$user@$ip":/tmp/threatguard-install/
    
    if [ $? -eq 0 ]; then
        echo "✓ Archivos copiados"
        
        # Ejecutar instalador
        echo "Ejecutando instalador..."
        ssh "$user@$ip" "cd /tmp/threatguard-install && sudo bash install_agent_linux.sh"
        
        if [ $? -eq 0 ]; then
            echo "✓ Instalación completada en $ip"
        else
            echo "✗ Error en la instalación en $ip"
        fi
    else
        echo "✗ Error copiando archivos a $ip"
    fi
    
    echo ""
done < "$SERVERS_FILE"

echo "========================================"
echo "  Despliegue completado"
echo "========================================"
echo ""
echo "Siguiente paso: Configurar cada agente"
echo ""
echo "Para cada servidor, editar:"
echo "  ssh usuario@IP"
echo "  sudo nano /opt/threatguard-agent/config/agent.ini"
echo ""
echo "Luego iniciar el servicio:"
echo "  sudo systemctl start threatguard-agent"
echo "  sudo systemctl enable threatguard-agent"
echo ""
