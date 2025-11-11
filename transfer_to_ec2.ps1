# ==============================================================================
# ThreatGuard - Script de Transferencia a EC2 (PowerShell)
# ==============================================================================
# Este script transfiere los archivos necesarios desde Windows a EC2
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$EC2_IP,
    
    [Parameter(Mandatory=$true)]
    [string]$KeyFile,
    
    [string]$EC2_User = "ec2-user",
    [string]$RemotePath = "/opt/threatguard"
)

# Colores para output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[✓] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[⚠] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[✗] $args" -ForegroundColor Red }

Write-Host "========================================================================"
Write-Host "       ThreatGuard - Transferencia a EC2 (PowerShell)"
Write-Host "========================================================================"
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "docker-compose.yml") -or -not (Test-Path "threatguard_api.py")) {
    Write-Error "Este script debe ejecutarse desde la raíz del proyecto ThreatGuard"
    exit 1
}

# Verificar que existe el archivo de clave
if (-not (Test-Path $KeyFile)) {
    Write-Error "No se encontró el archivo de clave: $KeyFile"
    exit 1
}

# Verificar que existe pscp (PuTTY) o ssh
$hasSSH = Get-Command ssh -ErrorAction SilentlyContinue
$hasPSCP = Get-Command pscp -ErrorAction SilentlyContinue

if (-not $hasSSH -and -not $hasPSCP) {
    Write-Error "No se encontró SSH ni PSCP. Por favor instala:"
    Write-Host "  - OpenSSH: Configuración > Aplicaciones > Características opcionales > Agregar OpenSSH Client"
    Write-Host "  - O PuTTY: https://www.putty.org/"
    exit 1
}

Write-Info "Preparando archivos para transferencia..."

# Crear directorio temporal
$TempDir = "threatguard-temp-deploy"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copiar archivos necesarios
Write-Info "Copiando archivos necesarios..."

# Archivos raíz críticos
$rootFiles = @(
    "docker-compose.yml",
    "Dockerfile",
    "Dockerfile.snort",
    "threatguard_api.py",
    "openvas_auto_scan.py",
    "requirements.txt",
    "requirements-snort.txt",
    "nginx.conf"
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Copy-Item $file $TempDir\ -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    }
}

# Directorios completos
Write-Info "Copiando directorios..."

$directories = @(
    "config",
    "src",
    "scripts",
    "PAGINA WEB",
    "docs"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Copy-Item -Recurse $dir $TempDir\ -Force
        Write-Host "  ✓ $dir/" -ForegroundColor Gray
    }
}

# Crear directorios vacíos
New-Item -ItemType Directory -Path "$TempDir\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$TempDir\logs" -Force | Out-Null
New-Item -ItemType Directory -Path "$TempDir\models\trained" -Force | Out-Null

# Limpiar archivos innecesarios
Write-Info "Limpiando archivos innecesarios..."
Get-ChildItem -Path $TempDir -Include __pycache__ -Recurse -Force | Remove-Item -Recurse -Force
Get-ChildItem -Path $TempDir -Include *.pyc,*.pyo,*.bak,.DS_Store -Recurse -Force | Remove-Item -Force

# Eliminar archivos de agente
$agentFiles = Get-ChildItem -Path $TempDir -Include "agent*.py","*.bat","start_agent*.*","build_agent.spec" -Recurse
$agentFiles | Remove-Item -Force -ErrorAction SilentlyContinue

# Crear README
$readmeContent = @"
======================================================================
    ThreatGuard - Paquete de Despliegue EC2
======================================================================

INSTRUCCIONES DE INSTALACIÓN:
-----------------------------

1. Los archivos ya están en el servidor

2. Ejecutar instalación automática:
   $ sudo bash /opt/threatguard/scripts/ec2_setup.sh

3. Verificar instalación:
   $ /opt/threatguard/check_health.sh

ACCESO AL SISTEMA:
------------------
- API:       http://$EC2_IP:8000
- Dashboard: http://$EC2_IP:8080
- OpenVAS:   http://$EC2_IP:9392

Para más información, ver: docs/AWS_EC2_DEPLOYMENT.md
======================================================================
"@

$readmeContent | Out-File -FilePath "$TempDir\README_DEPLOY.txt" -Encoding UTF8

Write-Success "Archivos preparados"
Write-Host ""

# Comprimir (opcional)
Write-Info "Comprimiendo archivos..."
$zipFile = "threatguard-ec2-$Timestamp.zip"
Compress-Archive -Path "$TempDir\*" -DestinationPath $zipFile -Force
$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Success "Paquete comprimido: $zipFile ($($zipSize.ToString('0.00')) MB)"

# Transferir archivos
Write-Host ""
Write-Info "Iniciando transferencia a EC2: $EC2_User@$EC2_IP"
Write-Host ""

# Crear directorio remoto primero
Write-Info "Creando directorio remoto..."
if ($hasSSH) {
    ssh -i $KeyFile "$EC2_User@$EC2_IP" "sudo mkdir -p $RemotePath && sudo chown -R $EC2_User:$EC2_User $RemotePath"
}

# Transferir zip y extraer
Write-Info "Transfiriendo archivo comprimido..."
if ($hasSSH) {
    # Usar SCP nativo de Windows
    scp -i $KeyFile $zipFile "$EC2_User@${EC2_IP}:/home/$EC2_User/"
    
    Write-Info "Extrayendo archivos en servidor..."
    ssh -i $KeyFile "$EC2_User@$EC2_IP" @"
        cd /home/$EC2_User
        unzip -q -o $zipFile -d threatguard-extracted
        sudo mv threatguard-extracted/* $RemotePath/
        rm -rf threatguard-extracted $zipFile
        sudo chmod +x $RemotePath/scripts/*.sh
        echo 'Archivos transferidos exitosamente'
"@
} elseif ($hasPSCP) {
    # Usar PSCP de PuTTY
    pscp -i $KeyFile $zipFile "$EC2_User@${EC2_IP}:/home/$EC2_User/"
    
    Write-Info "Extrayendo archivos en servidor..."
    plink -i $KeyFile "$EC2_User@$EC2_IP" "cd /home/$EC2_User && unzip -q -o $zipFile -d threatguard-extracted && sudo mv threatguard-extracted/* $RemotePath/ && rm -rf threatguard-extracted $zipFile"
}

# Limpiar archivos temporales locales
Write-Info "Limpiando archivos temporales locales..."
Remove-Item -Recurse -Force $TempDir
Remove-Item -Force $zipFile

Write-Host ""
Write-Success "========================================================================"
Write-Success "                TRANSFERENCIA COMPLETADA EXITOSAMENTE"
Write-Success "========================================================================"
Write-Host ""
Write-Host "📦 Archivos transferidos a: $RemotePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conectar a EC2:" -ForegroundColor White
Write-Host "   ssh -i $KeyFile $EC2_User@$EC2_IP" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Ejecutar instalación automática:" -ForegroundColor White
Write-Host "   sudo bash /opt/threatguard/scripts/ec2_setup.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Verificar estado:" -ForegroundColor White
Write-Host "   /opt/threatguard/check_health.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 URLs de acceso:" -ForegroundColor Yellow
Write-Host "   - API:       http://$EC2_IP:8000" -ForegroundColor White
Write-Host "   - Dashboard: http://$EC2_IP:8080" -ForegroundColor White
Write-Host "   - OpenVAS:   http://$EC2_IP:9392" -ForegroundColor White
Write-Host ""
Write-Success "========================================================================"
Write-Host ""

# Preguntar si desea conectar ahora
$connect = Read-Host "¿Deseas conectar a EC2 ahora? (S/N)"
if ($connect -eq "S" -or $connect -eq "s") {
    if ($hasSSH) {
        ssh -i $KeyFile "$EC2_User@$EC2_IP"
    } else {
        Write-Warning "Usa PuTTY para conectar manualmente"
    }
}
