; Script generado con Inno Setup Script Wizard
; Para más información sobre Inno Setup: https://jrsoftware.org/isinfo.php

#define MyAppName "ThreatGuard Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "ThreatGuard"
#define MyAppURL "https://github.com/TomasUnab/ThreatGuard-3.0"
#define MyAppExeName "ThreatGuard-Agent.exe"

[Setup]
; NOTA: El valor de AppId identifica únicamente esta aplicación.
; No uses el mismo valor de AppId en otros instaladores.
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\ThreatGuard Agent
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
; Descomenta la siguiente línea para ejecutar en modo administrativo (recomendado)
PrivilegesRequired=admin
OutputDir=..\installer_output
OutputBaseFilename=ThreatGuard-Agent-Setup
SetupIconFile=..\assets\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autostart"; Description: "Iniciar ThreatGuard Agent al arrancar Windows"; GroupDescription: "Opciones adicionales:"; Flags: checkedonce

[Files]
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "AGENT_BUILD.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "AGENT_SETUP.md"; DestDir: "{app}"; Flags: ignoreversion
; NOTA: No uses "Flags: ignoreversion" en ningún archivo de sistema compartido

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--minimized"; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Aquí puedes agregar código personalizado después de la instalación
    // Por ejemplo, crear archivos de configuración, registrar servicios, etc.
  end;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Verificar si ya hay una versión instalada
  Result := True;
  
  // Verificar requisitos del sistema
  if not IsAdminLoggedOn() then
  begin
    MsgBox('Este instalador requiere privilegios de administrador.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Limpiar archivos de configuración si el usuario lo desea
    if MsgBox('¿Desea eliminar también los archivos de configuración y logs?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      DelTree(ExpandConstant('{userappdata}\ThreatGuard'), True, True, True);
    end;
  end;
end;
