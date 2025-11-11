[Setup]
AppName=ThreatGuard Agent
AppVersion=1.0.0
AppPublisher=ThreatGuard Security
AppPublisherURL=https://threatguard.com
DefaultDirName={autopf}\ThreatGuard Agent
DefaultGroupName=ThreatGuard
OutputDir=..\dist
OutputBaseFilename=ThreatGuard-Agent-Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
SetupIconFile=..\assets\icon.ico
UninstallDisplayIcon={app}\ThreatGuard-Agent.exe
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear icono en el escritorio"; GroupDescription: "Iconos adicionales:"
Name: "startupicon"; Description: "Ejecutar al iniciar Windows"; GroupDescription: "Opciones de inicio:"

[Files]
Source: "..\dist\ThreatGuard-Agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\config\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\ThreatGuard Agent"; Filename: "{app}\ThreatGuard-Agent.exe"
Name: "{group}\Desinstalar ThreatGuard Agent"; Filename: "{uninstallexe}"
Name: "{autodesktop}\ThreatGuard Agent"; Filename: "{app}\ThreatGuard-Agent.exe"; Tasks: desktopicon
Name: "{userstartup}\ThreatGuard Agent"; Filename: "{app}\ThreatGuard-Agent.exe"; Tasks: startupicon

[Run]
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""ThreatGuard Agent"" dir=in action=allow program=""{app}\ThreatGuard-Agent.exe"" enable=yes"; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""ThreatGuard Agent"" dir=out action=allow program=""{app}\ThreatGuard-Agent.exe"" enable=yes"; Flags: runhidden
Filename: "{app}\ThreatGuard-Agent.exe"; Description: "Ejecutar ThreatGuard Agent"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""ThreatGuard Agent"""; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsAdminLoggedOn then
  begin
    MsgBox('Este instalador requiere permisos de administrador para configurar el firewall.', mbError, MB_OK);
    Result := False;
  end;
end;
