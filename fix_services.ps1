$InstallPath = "C:\ThreatGuard"
$NSSM = "nssm"

Write-Host "Fixing ThreatGuard services..."

# Stop existing services if any
nssm stop ThreatGuardAPI
nssm remove ThreatGuardAPI confirm
nssm stop ThreatGuardFrontend
nssm remove ThreatGuardFrontend confirm
nssm stop ThreatGuardSnort
nssm remove ThreatGuardSnort confirm

# 1. ThreatGuard API
Write-Host "Installing ThreatGuardAPI..."
& $NSSM install ThreatGuardAPI "$InstallPath\venv\Scripts\python.exe"
& $NSSM set ThreatGuardAPI AppParameters "-m uvicorn main:app --host 0.0.0.0 --port 8000"
& $NSSM set ThreatGuardAPI AppDirectory "$InstallPath"
& $NSSM set ThreatGuardAPI DisplayName "ThreatGuard API Service"
& $NSSM set ThreatGuardAPI Start SERVICE_AUTO_START
& $NSSM set ThreatGuardAPI AppStdout "$InstallPath\logs\api.log"
& $NSSM set ThreatGuardAPI AppStderr "$InstallPath\logs\api.err"

# 2. ThreatGuard Frontend
Write-Host "Installing ThreatGuardFrontend..."
& $NSSM install ThreatGuardFrontend "$InstallPath\venv\Scripts\python.exe"
& $NSSM set ThreatGuardFrontend AppParameters "-m http.server 3000 --directory `"$InstallPath\PAGINA WEB`""
& $NSSM set ThreatGuardFrontend AppDirectory "$InstallPath"
& $NSSM set ThreatGuardFrontend DisplayName "ThreatGuard Frontend"
& $NSSM set ThreatGuardFrontend Start SERVICE_AUTO_START
& $NSSM set ThreatGuardFrontend AppStdout "$InstallPath\logs\frontend.log"
& $NSSM set ThreatGuardFrontend AppStderr "$InstallPath\logs\frontend.err"

# 3. ThreatGuard Snort
Write-Host "Installing ThreatGuardSnort..."
& $NSSM install ThreatGuardSnort "C:\Snort\bin\snort.exe"
& $NSSM set ThreatGuardSnort AppParameters "-c C:\Snort\etc\snort.lua -i 1 -A alert_fast -l C:\Snort\log -k none"
& $NSSM set ThreatGuardSnort AppDirectory "C:\Snort"
& $NSSM set ThreatGuardSnort DisplayName "ThreatGuard Snort IDS"
& $NSSM set ThreatGuardSnort Start SERVICE_AUTO_START
& $NSSM set ThreatGuardSnort AppStdout "$InstallPath\logs\snort_service.log"
& $NSSM set ThreatGuardSnort AppStderr "$InstallPath\logs\snort_service.err"

# Start services
Write-Host "Starting services..."
sc start ThreatGuardAPI
sc start ThreatGuardFrontend
sc start ThreatGuardSnort

Write-Host "Services fixed and started!"
