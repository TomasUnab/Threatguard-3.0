# Robust uninstall PowerShell script for ThreatGuard
# Usage: .\uninstall.ps1 -InstallPath "C:\Program Files\ThreatGuard"
param(
    [string]$InstallPath = "${env:ProgramFiles}\\ThreatGuard",
    [switch]$Force
)

$log = Join-Path $env:TEMP 'threatguard_uninstall.log'
Add-Content -Path $log -Value "==== ThreatGuard uninstall started: $(Get-Date) ===="
Add-Content -Path $log -Value "Target Install Path: $InstallPath"

function Log { param($m) Add-Content -Path $log -Value $m }

try {
    # 1. Stop and remove services
    $services = @("ThreatGuardAPI", "ThreatGuardFrontend", "ThreatGuardSnort", "ThreatGuardIntegration", "ThreatGuard")
    
    foreach ($serviceName in $services) {
        Log "Processing service: $serviceName"
        
        # Stop service
        $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if ($svc) {
            try { 
                Stop-Service -Name $serviceName -Force -ErrorAction Stop
                Log "Service $serviceName stopped." 
            } catch { 
                Log "Failed to stop service $serviceName : $_" 
            }
        } else { 
            Log "Service $serviceName not found (already stopped/removed?)" 
        }

        # Remove via NSSM
        Log "Attempting NSSM removal for $serviceName..."
        if (Get-Command nssm -ErrorAction SilentlyContinue) {
            try { 
                nssm remove $serviceName confirm:no
                Log "NSSM service $serviceName removed." 
            } catch { 
                Log "NSSM removal failed for $serviceName : $_" 
            }
        }

        # Remove via sc.exe (fallback)
        Log "Attempting sc delete for $serviceName..."
        try { 
            sc.exe delete $serviceName | Out-Null
            Log "sc delete issued for $serviceName." 
        } catch { 
            Log "sc delete failed for $serviceName : $_" 
        }
    }

    # 2. Remove Firewall Rules
    Log "Removing firewall rules..."
    $fwRules = @("ThreatGuard API", "ThreatGuard Frontend")
    foreach ($rule in $fwRules) {
        try {
            netsh advfirewall firewall delete rule name="$rule" | Out-Null
            Log "Firewall rule '$rule' removed."
        } catch {
            Log "Failed to remove firewall rule '$rule': $_"
        }
    }

    # 3. Remove Desktop Shortcut (both .url and .lnk)
    Log "Removing desktop shortcuts..."
    $desktopShortcuts = @(
        (Join-Path ([Environment]::GetFolderPath("Desktop")) "ThreatGuard Dashboard.url"),
        (Join-Path ([Environment]::GetFolderPath("Desktop")) "ThreatGuard.lnk")
    )
    foreach ($desktopShortcut in $desktopShortcuts) {
        if (Test-Path -LiteralPath $desktopShortcut) {
            try {
                Remove-Item -LiteralPath $desktopShortcut -Force
                Log "Desktop shortcut removed: $desktopShortcut"
            } catch {
                Log "Failed to remove desktop shortcut: $_"
            }
        }
    }

    # 4. Remove Installation Directory
    if (Test-Path -LiteralPath $InstallPath) {
        Log "Removing installation folder $InstallPath ..."
        try { 
            Remove-Item -LiteralPath $InstallPath -Recurse -Force -ErrorAction Stop
            Log 'Folder removed.' 
        } catch { 
            Log "Folder removal failed: $_" 
        }
    } else { 
        Log "Install folder not found at $InstallPath." 
    }

    # 5. Remove Registry Entries (Best Effort)
    try {
        $uninstallKey = 'HKLM:\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
        $child = Get-ChildItem $uninstallKey | Where-Object {
            ($_ | Get-ItemProperty -Name DisplayName -ErrorAction SilentlyContinue).DisplayName -match 'ThreatGuard'
        }
        foreach ($k in $child) {
            try { Remove-Item -LiteralPath $k.PSPath -Recurse -Force; Log "Removed registry key: $($k.PSPath)" } catch { Log "Failed removing registry key $($k.PSPath): $_" }
        }
    } catch { Log "Registry cleanup failed: $_" }

    Log "==== ThreatGuard uninstall finished: $(Get-Date) ===="
} catch {
    Log "Fatal error during uninstall: $_"
}

Write-Output "Uninstall script finished. See $log for details."
