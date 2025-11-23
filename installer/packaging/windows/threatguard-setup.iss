; ThreatGuard Installer Script for Inno Setup
; Creates a complete Windows installer that bundles everything

#define MyAppName "ThreatGuard"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "ThreatGuard Team"
#define MyAppURL "https://github.com/yourusername/threatguard"
#define MyAppExeName "ThreatGuard-Installer.exe"

[Setup]
; Basic Information
AppId={{8F9A2B3C-4D5E-6F7A-8B9C-0D1E2F3A4B5C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation Directories
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output
OutputDir=..\dist
OutputBaseFilename=ThreatGuard-Setup-{#MyAppVersion}
SetupIconFile=..\assets\icon.ico
Compression=lzma2/max
SolidCompression=yes

; Privileges
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; UI
WizardStyle=modern
WizardImageFile=..\assets\wizard-image.bmp
WizardSmallImageFile=..\assets\wizard-small.bmp

; Misc
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startmenuicon"; Description: "Create Start Menu icon"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Application Source Files
Source: "..\..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\main.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\PAGINA WEB\*"; DestDir: "{app}\PAGINA WEB"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs

; Installer Components
Source: "..\installer-app\*"; DestDir: "{app}\installer"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\services\windows\*"; DestDir: "{app}\installer\services\windows"; Flags: ignoreversion
Source: "..\config\*"; DestDir: "{app}\installer\config"; Flags: ignoreversion
Source: "..\scripts\windows\install.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion

; Snort Binaries (if available)
Source: "..\binaries\windows\snort-*.zip"; DestDir: "{app}\installer\binaries\windows"; Flags: ignoreversion external skipifsourcedoesntexist

; Documentation
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "..\binaries\DOWNLOAD_GUIDE.md"; DestDir: "{app}\docs"; Flags: ignoreversion

[Dirs]
Name: "{app}\logs"
Name: "{app}\data"
Name: "{app}\models"
Name: "C:\Snort\log"
Name: "C:\Snort\etc"
Name: "C:\Snort\rules"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\ThreatGuard Dashboard"; Filename: "http://localhost:3000"
Name: "{group}\ThreatGuard API Docs"; Filename: "http://localhost:8000/docs"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Run the PowerShell installation script
Filename: "powershell.exe"; \
    Parameters: "-ExecutionPolicy Bypass -File ""{app}\installer\scripts\install.ps1"" -InstallPath ""{app}"""; \
    StatusMsg: "Installing ThreatGuard components..."; \
    Flags: runhidden waituntilterminated

; Open browser after installation
Filename: "http://localhost:3000"; \
    Description: "Open ThreatGuard Dashboard"; \
    Flags: postinstall shellexec skipifsilent

[UninstallRun]
; Stop services before uninstall
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Service ThreatGuardAPI -ErrorAction SilentlyContinue"""; Flags: runhidden
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Service ThreatGuardSnort -ErrorAction SilentlyContinue"""; Flags: runhidden
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Service ThreatGuardIntegration -ErrorAction SilentlyContinue"""; Flags: runhidden
Filename: "powershell.exe"; Parameters: "-Command ""Stop-Service ThreatGuardFrontend -ErrorAction SilentlyContinue"""; Flags: runhidden

; Remove services
Filename: "{app}\installer\services\windows\nssm.exe"; Parameters: "remove ThreatGuardAPI confirm"; Flags: runhidden
Filename: "{app}\installer\services\windows\nssm.exe"; Parameters: "remove ThreatGuardSnort confirm"; Flags: runhidden
Filename: "{app}\installer\services\windows\nssm.exe"; Parameters: "remove ThreatGuardIntegration confirm"; Flags: runhidden
Filename: "{app}\installer\services\windows\nssm.exe"; Parameters: "remove ThreatGuardFrontend confirm"; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\venv"
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "C:\Snort"

[Code]
var
  RequirementsPage: TOutputMsgMemoWizardPage;
  InstallationPage: TOutputProgressWizardPage;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  RAM: Cardinal;
  DiskSpace: Cardinal;
  ErrorMsg: String;
begin
  Result := True;
  ErrorMsg := '';

  // Check Windows version
  if not IsWindows10OrLater() then
  begin
    ErrorMsg := ErrorMsg + '- Windows 10 or later is required' + #13#10;
    Result := False;
  end;

  // Check if running as admin
  if not IsAdmin() then
  begin
    ErrorMsg := ErrorMsg + '- Administrator privileges are required' + #13#10;
    Result := False;
  end;

  // Check RAM (at least 8GB recommended)
  RAM := GetTotalPhysicalMemory() div (1024 * 1024 * 1024);
  if RAM < 8 then
  begin
    if MsgBox('Your system has ' + IntToStr(RAM) + 'GB of RAM. 8GB is recommended. Continue anyway?', 
              mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;

  if not Result then
  begin
    MsgBox('Installation cannot continue:' + #13#10 + #13#10 + ErrorMsg, mbError, MB_OK);
  end;
end;

procedure InitializeWizard();
begin
  // Create requirements page
  RequirementsPage := CreateOutputMsgMemoPage(wpWelcome,
    'System Requirements', 
    'Please review the system requirements',
    'ThreatGuard requires the following:' + #13#10 + #13#10 +
    '• Windows 10/11 (64-bit)' + #13#10 +
    '• 8 GB RAM (minimum)' + #13#10 +
    '• 50 GB free disk space' + #13#10 +
    '• Administrator privileges' + #13#10 +
    '• Internet connection (for dependencies)' + #13#10 + #13#10 +
    'The installer will automatically download and install:' + #13#10 +
    '• Python 3.11' + #13#10 +
    '• Node.js 20' + #13#10 +
    '• PostgreSQL 15' + #13#10 +
    '• Redis' + #13#10 +
    '• Snort 3 IDS' + #13#10 +
    '• All required dependencies',
    '');
end;

function GetTotalPhysicalMemory(): Cardinal;
var
  MemoryStatus: TMemoryStatusEx;
begin
  MemoryStatus.dwLength := SizeOf(MemoryStatus);
  if GlobalMemoryStatusEx(MemoryStatus) then
    Result := MemoryStatus.ullTotalPhys
  else
    Result := 0;
end;

function IsWindows10OrLater(): Boolean;
var
  Version: TWindowsVersion;
begin
  GetWindowsVersionEx(Version);
  Result := (Version.Major >= 10);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Installation completed
    Log('ThreatGuard installation completed successfully');
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  
  if CurPageID = wpSelectDir then
  begin
    // Validate installation directory
    if Length(WizardDirValue()) > 100 then
    begin
      MsgBox('Installation path is too long. Please choose a shorter path.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

[Messages]
WelcomeLabel2=This will install [name/ver] on your computer.%n%nThreatGuard is an advanced threat detection system that combines Machine Learning with Snort IDS for real-time network security monitoring.%n%nThe installation will take approximately 15-30 minutes depending on your internet connection.
FinishedLabel=ThreatGuard has been successfully installed!%n%nYou can now access the dashboard at http://localhost:3000%n%nDefault credentials will be displayed in the installation log.
