!include "LogicLib.nsh"

Var TG_MODE

; Add a custom page early in the installer flow to detect existing installs
Page custom TG_CheckExistingPage

Function TG_CheckExistingPage
    StrCpy $TG_MODE ""
    ; Check if installer path selected or default Program Files contains ThreatGuard
    IfFileExists "$INSTDIR\\ThreatGuard.exe" 0 checkProgramFiles
    goto done

    checkProgramFiles:
    IfFileExists "$PROGRAMFILES\\ThreatGuard\\ThreatGuard.exe" 0 show_choice
    goto done

    show_choice:
        ; Existing installation detected — run the packaged uninstaller immediately
        StrCpy $TG_MODE "run_uninstaller"
        ; Return to let the install sections extract and execute the uninstaller
        Return

    done:
    ; Continue with installation
FunctionEnd

; Section that prepares and runs the bundled uninstaller if requested by the pre-install page
Section "PrepareAndRunBundledUninstaller"
    ; Extract helper files to a temporary plugin dir to avoid leaving files in Program Files
    SetOutPath "$PLUGINSDIR"
    ; Prefer the Inno-built uninstaller exe if available. Use BUILD_RESOURCES_DIR provided by electron-builder.
    ; Use /nonfatal so makensis does not abort if the file is missing during compile.
    File /nonfatal /oname=ThreatGuard_Uninstaller.exe "${BUILD_RESOURCES_DIR}\\Output\\ThreatGuard_Uninstaller.exe"
    ; Always include the PowerShell fallback script from the build resources
    File /oname=uninstall.ps1 "${BUILD_RESOURCES_DIR}\\uninstall.ps1"

    ; If TG_MODE == run_uninstaller then run the preferred uninstaller and exit
    StrCmp $TG_MODE "run_uninstaller" 0 +6
    ; If the bundled Inno exe exists in the plugin dir, run it silently
    IfFileExists "$PLUGINSDIR\\ThreatGuard_Uninstaller.exe" 0 +3
    ExecWait '"$PLUGINSDIR\\ThreatGuard_Uninstaller.exe" /S'
    MessageBox MB_OK "Bundled Inno uninstaller executed. The installer will now exit."
    Quit
    ; Fallback: run the PowerShell uninstaller
    ExecWait 'powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\\uninstall.ps1"'
    MessageBox MB_OK "Packaged PowerShell uninstaller executed. Check %TEMP%\\threatguard_uninstall.log for details."
    Quit
SectionEnd

