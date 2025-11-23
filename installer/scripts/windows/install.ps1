# ThreatGuard Native Installer for Windows
# Windows 10/11
#
# Usage: Run as Administrator
#   .\install.ps1
#

#Requires -RunAsAdministrator

param(
    [string]$InstallPath = "C:\ThreatGuard",
    [string]$SnortPath = "C:\Snort"
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Banner
Clear-Host
Write-Host @"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🛡️  ThreatGuard Installer                    ║
║                                                            ║
║          Advanced Threat Detection System                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""
Write-Success "Starting ThreatGuard installation for Windows..."

# Step 1: Check system requirements
Write-Info "Step 1/14: Checking system requirements..."

$OS = Get-WmiObject -Class Win32_OperatingSystem
Write-Info "OS: $($OS.Caption) $($OS.Version)"

$RAM = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
if ($RAM -lt 8) {
    Write-Warning "RAM: ${RAM}GB (8GB recommended)"
}
else {
    Write-Success "RAM: ${RAM}GB ✓"
}

$Disk = Get-PSDrive C | Select-Object -ExpandProperty Free
$DiskGB = [math]::Round($Disk / 1GB)
if ($DiskGB -lt 50) {
    Write-Warning "Disk space: ${DiskGB}GB (50GB recommended)"
}
else {
    Write-Success "Disk space: ${DiskGB}GB ✓"
}

# Step 2: Install Chocolatey
Write-Info "Step 2/14: Installing Chocolatey package manager..."

if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Success "Chocolatey installed"
}
else {
    Write-Info "Chocolatey already installed"
}

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Step 3: Install system dependencies
Write-Info "Step 3/14: Installing system dependencies..."

$packages = @(
    "python --version=3.11",
    "nodejs --version=20.10.0",
    "postgresql15",
    "redis-64",
    "git",
    "nssm"
)

foreach ($pkg in $packages) {
    Write-Info "Installing $pkg..."
    try {
        choco install $pkg -y --no-progress
    }
    catch {
        Write-Warning "Failed to install $pkg"
    }
}

# Refresh environment again
refreshenv

# Step 4: Create directories
Write-Info "Step 4/14: Creating directories..."

$directories = @(
    "$InstallPath",
    "$InstallPath\logs",
    "$InstallPath\data",
    "$InstallPath\config",
    "$InstallPath\models",
    "$SnortPath\log",
    "$SnortPath\etc",
    "$SnortPath\rules"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created: $dir"
    }
}

# Step 5: Copy application files
Write-Info "Step 5/14: Copying application files..."

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppSource = Split-Path -Parent (Split-Path -Parent $ScriptDir)

if (Test-Path "$AppSource\src") {
    Copy-Item -Path "$AppSource\src" -Destination "$InstallPath\" -Recurse -Force
    Copy-Item -Path "$AppSource\main.py" -Destination "$InstallPath\" -Force
    Copy-Item -Path "$AppSource\requirements.txt" -Destination "$InstallPath\" -Force
    Copy-Item -Path "$AppSource\PAGINA WEB" -Destination "$InstallPath\" -Recurse -Force
    Copy-Item -Path "$AppSource\config" -Destination "$InstallPath\" -Recurse -Force
    Write-Success "Application files copied"
}
else {
    Write-Error "Application source files not found"
    exit 1
}

# Step 6: Install Python dependencies
Write-Info "Step 6/14: Installing Python dependencies..."

python -m venv "$InstallPath\venv"
& "$InstallPath\venv\Scripts\pip.exe" install --upgrade pip setuptools wheel
& "$InstallPath\venv\Scripts\pip.exe" install -r "$InstallPath\requirements.txt"

# Step 7: Install Snort
Write-Info "Step 7/14: Installing Snort 3..."

$SnortBinary = "$ScriptDir\..\binaries\windows\snort-3.1.78.0-win64.zip"

if (Test-Path $SnortBinary) {
    Expand-Archive -Path $SnortBinary -DestinationPath $SnortPath -Force
    Write-Success "Snort installed from binary"
}
else {
    Write-Warning "Snort binary not found at: $SnortBinary"
    Write-Warning "Please download Snort 3 for Windows manually"
}

# Step 8: Setup PostgreSQL
Write-Info "Step 8/14: Configuring PostgreSQL..."

Start-Service postgresql-x64-15
Set-Service postgresql-x64-15 -StartupType Automatic

Start-Sleep -Seconds 3

# Generate database password
$DBPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

$SqlScript = @"
CREATE DATABASE threatguard_db;
CREATE USER threatguard_user WITH PASSWORD '$DBPassword';
GRANT ALL PRIVILEGES ON DATABASE threatguard_db TO threatguard_user;
ALTER DATABASE threatguard_db OWNER TO threatguard_user;
"@

$SqlScript | Out-File -FilePath "C:\temp_setup_db.sql" -Encoding UTF8

& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -f "C:\temp_setup_db.sql"
Remove-Item "C:\temp_setup_db.sql"

# Create .env file
$SecretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$JWTSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

$EnvContent = @"
DATABASE_URL=postgresql+psycopg2://threatguard_user:$DBPassword@localhost:5432/threatguard_db
REDIS_HOST=localhost
REDIS_PORT=6379
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
NEXT_PUBLIC_API_URL=http://localhost:8000
SNORT_ALERT_FILE=C:\Snort\log\alert
THREATGUARD_API_URL=http://localhost:8000
SECRET_KEY=$SecretKey
JWT_SECRET=$JWTSecret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
"@

$EnvContent | Out-File -FilePath "$InstallPath\.env" -Encoding UTF8

Write-Success "PostgreSQL configured"

# Step 9: Setup Redis
Write-Info "Step 9/14: Configuring Redis..."

Start-Service Redis
Set-Service Redis -StartupType Automatic

# Step 10: Configure Snort
Write-Info "Step 10/14: Configuring Snort..."

# Detect primary network interface
$PrimaryInterface = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1
$InterfaceIndex = $PrimaryInterface.InterfaceIndex

Write-Info "Primary network interface: $($PrimaryInterface.Name) (Index: $InterfaceIndex)"

# Copy Snort config
if (Test-Path "$ScriptDir\..\config\snort.lua.template") {
    $SnortConfig = Get-Content "$ScriptDir\..\config\snort.lua.template" -Raw
    $SnortConfig = $SnortConfig -replace "INTERFACE", $InterfaceIndex
    $SnortConfig | Out-File -FilePath "$SnortPath\etc\snort.lua" -Encoding UTF8
}

# Copy rules
if (Test-Path "$ScriptDir\..\config\local.rules") {
    Copy-Item -Path "$ScriptDir\..\config\local.rules" -Destination "$SnortPath\rules\" -Force
}

# Step 11: Configure Windows services
Write-Info "Step 11/14: Configuring Windows services..."

$ServicesScript = "$ScriptDir\..\services\windows\install-services.ps1"

if (Test-Path $ServicesScript) {
    & $ServicesScript -InstallPath $InstallPath
    Write-Success "Services configured"
}
else {
    Write-Warning "Services script not found"
}

# Step 12: Build frontend
Write-Info "Step 12/14: Building frontend..."

Set-Location "$InstallPath\PAGINA WEB"
npm install
npm run build

# Step 13: Create admin user
Write-Info "Step 13/14: Creating admin user..."

$AdminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 12 | ForEach-Object { [char]$_ })

$CreateAdminScript = @"
import sys
sys.path.append('$($InstallPath.Replace('\', '\\'))')

from src.database import SessionLocal, engine
from src.models import User, Base
import bcrypt

Base.metadata.create_all(bind=engine)

db = SessionLocal()
hashed = bcrypt.hashpw("$AdminPassword".encode(), bcrypt.gensalt())
admin = User(
    email="admin@threatguard.local",
    password=hashed.decode(),
    is_admin=True,
    is_active=True
)
db.add(admin)
db.commit()
db.close()

print("Admin user created")
"@

$CreateAdminScript | Out-File -FilePath "C:\temp_create_admin.py" -Encoding UTF8

& "$InstallPath\venv\Scripts\python.exe" "C:\temp_create_admin.py"
Remove-Item "C:\temp_create_admin.py"

Write-Success "Admin user created"

# Step 14: Start services
Write-Info "Step 14/14: Starting services..."

$services = @(
    "ThreatGuardAPI",
    "ThreatGuardSnort",
    "ThreatGuardIntegration",
    "ThreatGuardFrontend"
)

foreach ($service in $services) {
    try {
        Start-Service $service
        Write-Success "Started: $service"
    }
    catch {
        Write-Warning "Failed to start: $service"
    }
}

# Configure firewall
Write-Info "Configuring Windows Firewall..."

netsh advfirewall firewall add rule name="ThreatGuard API" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="ThreatGuard Frontend" dir=in action=allow protocol=TCP localport=3000

# Installation complete
Write-Host @"

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ✅  Installation Completed Successfully!         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

📊 ThreatGuard Access Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 Frontend URL:    http://localhost:3000
  🔌 API URL:         http://localhost:8000
  📚 API Docs:        http://localhost:8000/docs

  👤 Admin Email:     admin@threatguard.local
  🔑 Admin Password:  $AdminPassword

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Save these credentials in a secure location!

📝 Service Management:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Check status:   Get-Service ThreatGuardAPI
  View logs:      Get-Content C:\ThreatGuard\logs\api.log -Tail 50 -Wait
  Restart:        Restart-Service ThreatGuardAPI

  Services:
    - ThreatGuardAPI
    - ThreatGuardSnort
    - ThreatGuardIntegration
    - ThreatGuardFrontend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Installation Path: $InstallPath

"@ -ForegroundColor Green

Write-Success "Installation completed successfully!"

# Open browser
Start-Process "http://localhost:3000"
