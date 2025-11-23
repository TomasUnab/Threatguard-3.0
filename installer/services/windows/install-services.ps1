# ThreatGuard Windows Services Installation Script
# Requires NSSM (Non-Sucking Service Manager)

param(
    [string]$InstallPath = "C:\ThreatGuard",
    [string]$PythonPath = "C:\Python310\python.exe",
    [string]$NodePath = "C:\Program Files\nodejs\node.exe"
)

$ErrorActionPreference = "Stop"

Write-Host "Installing ThreatGuard Windows Services..." -ForegroundColor Cyan

# Download NSSM if not present
$nssmPath = "$PSScriptRoot\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM..." -ForegroundColor Yellow
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip = "$env:TEMP\nssm.zip"
    Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
    Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" -Destination $nssmPath
    Remove-Item $nssmZip, "$env:TEMP\nssm" -Recurse -Force
}

# Function to create service
function Install-ThreatGuardService {
    param(
        [string]$ServiceName,
        [string]$DisplayName,
        [string]$Description,
        [string]$ExePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )
    
    Write-Host "Installing service: $DisplayName" -ForegroundColor Green
    
    # Remove service if exists
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "  Removing existing service..." -ForegroundColor Yellow
        & $nssmPath stop $ServiceName
        & $nssmPath remove $ServiceName confirm
    }
    
    # Install service
    & $nssmPath install $ServiceName $ExePath
    
    # Set arguments
    if ($Arguments) {
        & $nssmPath set $ServiceName AppParameters ($Arguments -join " ")
    }
    
    # Set working directory
    if ($WorkingDirectory) {
        & $nssmPath set $ServiceName AppDirectory $WorkingDirectory
    }
    
    # Set display name and description
    & $nssmPath set $ServiceName DisplayName $DisplayName
    & $nssmPath set $ServiceName Description $Description
    
    # Set environment variables
    foreach ($key in $Environment.Keys) {
        & $nssmPath set $ServiceName AppEnvironmentExtra "$key=$($Environment[$key])"
    }
    
    # Set service to start automatically
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    
    # Set restart policy
    & $nssmPath set $ServiceName AppExit Default Restart
    & $nssmPath set $ServiceName AppRestartDelay 10000
    
    Write-Host "  Service installed successfully" -ForegroundColor Green
}

# Install ThreatGuard API Service
Install-ThreatGuardService `
    -ServiceName "ThreatGuardAPI" `
    -DisplayName "ThreatGuard API" `
    -Description "ThreatGuard Machine Learning API Service" `
    -ExePath "$PythonPath" `
    -Arguments @("-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000") `
    -WorkingDirectory "$InstallPath" `
    -Environment @{
        "DATABASE_URL" = "postgresql+psycopg2://threatguard_user:secure_password_2024!@localhost:5432/threatguard_db"
        "REDIS_HOST" = "localhost"
        "REDIS_PORT" = "6379"
    }

# Install Snort Service
Install-ThreatGuardService `
    -ServiceName "ThreatGuardSnort" `
    -DisplayName "ThreatGuard Snort IDS" `
    -Description "Snort 3 Intrusion Detection System" `
    -ExePath "C:\Snort\bin\snort.exe" `
    -Arguments @("-c", "C:\Snort\etc\snort.lua", "-i", "1", "-A", "alert_fast", "-l", "C:\Snort\log", "-q") `
    -WorkingDirectory "C:\Snort"

# Install Snort Integration Service
Install-ThreatGuardService `
    -ServiceName "ThreatGuardIntegration" `
    -DisplayName "ThreatGuard Snort Integration" `
    -Description "ThreatGuard Snort Alert Integration Service" `
    -ExePath "$PythonPath" `
    -Arguments @("-m", "src.data_collection.snort_integration") `
    -WorkingDirectory "$InstallPath" `
    -Environment @{
        "THREATGUARD_API_URL" = "http://localhost:8000"
        "SNORT_ALERT_FILE" = "C:\Snort\log\alert"
    }

# Install Frontend Service
Install-ThreatGuardService `
    -ServiceName "ThreatGuardFrontend" `
    -DisplayName "ThreatGuard Frontend" `
    -Description "ThreatGuard Web Frontend Service" `
    -ExePath "$NodePath" `
    -Arguments @("node_modules\.bin\next", "start") `
    -WorkingDirectory "$InstallPath\PAGINA WEB" `
    -Environment @{
        "NODE_ENV" = "production"
        "NEXT_PUBLIC_API_URL" = "http://localhost:8000"
    }

Write-Host "`nAll services installed successfully!" -ForegroundColor Green
Write-Host "`nTo start services, run:" -ForegroundColor Cyan
Write-Host "  Start-Service ThreatGuardAPI" -ForegroundColor White
Write-Host "  Start-Service ThreatGuardSnort" -ForegroundColor White
Write-Host "  Start-Service ThreatGuardIntegration" -ForegroundColor White
Write-Host "  Start-Service ThreatGuardFrontend" -ForegroundColor White
