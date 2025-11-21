param (
    [string]$InstallPath = "C:\ThreatGuard"
)

Write-Host "Installing ThreatGuard services..."

# Ensure nssm is in path or use full path if known. Choco installs it to path.
$NSSM = "nssm"

# 1. ThreatGuard API
Write-Host "Installing ThreatGuardAPI..."
& $NSSM install ThreatGuardAPI "$InstallPath\venv\Scripts\python.exe"
& $NSSM set ThreatGuardAPI AppParameters "-m uvicorn main:app --host 0.0.0.0 --port 8000"
& $NSSM set ThreatGuardAPI AppDirectory "$InstallPath"
& $NSSM set ThreatGuardAPI DisplayName "ThreatGuard API Service"
& $NSSM set ThreatGuardAPI Description "API Backend for ThreatGuard IDS"
& $NSSM set ThreatGuardAPI Start SERVICE_AUTO_START
& $NSSM set ThreatGuardAPI AppStdout "$InstallPath\logs\api.log"
& $NSSM set ThreatGuardAPI AppStderr "$InstallPath\logs\api.err"

# 2. ThreatGuard Frontend (Simple Python Web Server)
Write-Host "Installing ThreatGuardFrontend..."
& $NSSM install ThreatGuardFrontend "$InstallPath\venv\Scripts\python.exe"
# Fix: Set AppDirectory to the web folder and run http.server without --directory arg to avoid space issues
& $NSSM set ThreatGuardFrontend AppDirectory "$InstallPath\PAGINA WEB"
& $NSSM set ThreatGuardFrontend AppParameters "-m http.server 3000"
& $NSSM set ThreatGuardFrontend DisplayName "ThreatGuard Frontend"
& $NSSM set ThreatGuardFrontend Description "Web Interface for ThreatGuard"
& $NSSM set ThreatGuardFrontend Start SERVICE_AUTO_START
& $NSSM set ThreatGuardFrontend AppStdout "$InstallPath\logs\frontend.log"
& $NSSM set ThreatGuardFrontend AppStderr "$InstallPath\logs\frontend.err"

# 3. ThreatGuard Snort (IDS)
# Note: Interface index might need adjustment. Defaulting to 1.
Write-Host "Installing ThreatGuardSnort..."
& $NSSM install ThreatGuardSnort "C:\Snort\bin\snort.exe"
& $NSSM set ThreatGuardSnort AppParameters "-c C:\Snort\etc\snort.lua -i 1 -A alert_fast -l C:\Snort\log -k none"
& $NSSM set ThreatGuardSnort AppDirectory "C:\Snort"
& $NSSM set ThreatGuardSnort DisplayName "ThreatGuard Snort IDS"
& $NSSM set ThreatGuardSnort Description "Snort Intrusion Detection System"
& $NSSM set ThreatGuardSnort Start SERVICE_AUTO_START
& $NSSM set ThreatGuardSnort AppStdout "$InstallPath\logs\snort_service.log"
& $NSSM set ThreatGuardSnort AppStderr "$InstallPath\logs\snort_service.err"

Write-Host "Services installed successfully."
