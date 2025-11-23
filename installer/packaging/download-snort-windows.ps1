# Download Snort Binaries for Windows
param(
    [string]$Version = "3.1.78.0",
    [string]$OutputDir = "..\binaries\windows"
)

$ErrorActionPreference = "Continue"

Write-Host "Snort Binary Download Script" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$OutputFile = Join-Path $OutputDir "snort-${Version}-win64.zip"
$WindowsUrl = "https://www.snort.org/downloads/snort/snort-${Version}-win64.zip"

Write-Host "Attempting to download Snort ${Version} for Windows..." -ForegroundColor Yellow
Write-Host "URL: $WindowsUrl" -ForegroundColor Gray
Write-Host "Output: $OutputFile" -ForegroundColor Gray
Write-Host ""

try {
    Invoke-WebRequest -Uri $WindowsUrl -OutFile $OutputFile -UseBasicParsing
    
    Write-Host "SUCCESS: Download completed!" -ForegroundColor Green
    $FileSize = (Get-Item $OutputFile).Length / 1MB
    Write-Host "File size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Cyan
    
}
catch {
    Write-Host "FAILED: Automatic download failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "This is expected - Snort.org requires authentication." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "MANUAL DOWNLOAD INSTRUCTIONS:" -ForegroundColor Cyan
    Write-Host "1. Visit: https://www.snort.org/downloads" -ForegroundColor White
    Write-Host "2. Create a free account or log in" -ForegroundColor White
    Write-Host "3. Download: Snort ${Version} for Windows (x64)" -ForegroundColor White
    Write-Host "4. Save to: $OutputFile" -ForegroundColor White
    Write-Host ""
    
    $OpenBrowser = Read-Host "Open Snort download page in browser? (Y/N)"
    if ($OpenBrowser -eq "Y" -or $OpenBrowser -eq "y") {
        Start-Process "https://www.snort.org/downloads"
    }
}

Write-Host ""
Write-Host "NOTE: Installer works without binaries (uses Chocolatey)" -ForegroundColor Yellow
