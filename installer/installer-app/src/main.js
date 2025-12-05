const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Import installers
const { LinuxInstaller } = require('./backend/linux-installer');
const { WindowsInstaller } = require('./backend/windows-installer');

let mainWindow;
let installer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    resizable: true,
    frame: true,
    title: 'ThreatGuard Installer'
    // No icon - will use Electron default
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Open DevTools always for debugging (guardado por si mainWindow no existe)
  if (mainWindow && mainWindow.webContents && typeof mainWindow.webContents.openDevTools === 'function') {
    mainWindow.webContents.openDevTools();
  }

  // Detect OS and create appropriate installer
  if (process.platform === 'win32') {
    installer = new WindowsInstaller();
  } else if (process.platform === 'linux') {
    installer = new LinuxInstaller();
  } else {
    console.error('Unsupported platform:', process.platform);
    app.quit();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function isRepairMode() {
  return process.argv && process.argv.includes('--repair');
}

// IPC Handlers

// Check system requirements
ipcMain.handle('check-requirements', async (event, config) => {
  try {
    const requirements = await installer.checkRequirements(config);
    return { success: true, requirements };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get available network interfaces
ipcMain.handle('get-network-interfaces', async () => {
  try {
    const interfaces = await installer.getNetworkInterfaces();
    return { success: true, interfaces };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Validate configuration
ipcMain.handle('validate-config', async (event, config) => {
  try {
    const validation = await installer.validateConfig(config);
    return { success: true, validation };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Start installation
ipcMain.handle('install', async (event, config) => {
  try {
    const result = await installer.install(config, (progress) => {
      // Send progress updates to renderer (si está disponible)
      try {
        if (mainWindow && mainWindow.webContents && mainWindow.webContents.send) {
          mainWindow.webContents.send('install-progress', progress);
        }
      } catch (e) {
        console.warn('Failed to send install-progress to renderer:', e && e.message);
      }
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get installation logs
ipcMain.handle('get-logs', async () => {
  try {
    const logs = await installer.getLogs();
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get install path
ipcMain.handle('get-install-path', async () => {
  try {
    const path = installer.getInstallPath();
    return { success: true, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Finish installation
ipcMain.on('finish-installation', async (event, url) => {
  if (url) {
    const { shell } = require('electron');
    const { exec } = require('child_process');

    // Use a Windows command to open the browser after a delay
    // This runs independently of the Electron app
    const command = `powershell -Command "Start-Sleep -Seconds 5; Start-Process '${url}'"`;
    exec(command);
  }

  // Close the installer immediately
  app.quit();
});

// App lifecycle
app.whenReady().then(() => {
  // Create installer instance based on platform
  if (process.platform === 'win32') {
    installer = new WindowsInstaller();
  } else if (process.platform === 'linux') {
    installer = new LinuxInstaller();
  } else {
    console.error('Unsupported platform:', process.platform);
    app.quit();
    return;
  }

  if (isRepairMode()) {
    // Run repair flow headless and then quit
    (async () => {
      try {
        const result = await installer.repair((progress) => {
          // Optionally log progress
          console.log('Repair progress:', progress);
        });
        const { dialog } = require('electron');
        if (result && result.success) {
          await dialog.showMessageBox({ type: 'info', message: 'Repair completed successfully.' });
        } else {
          await dialog.showMessageBox({ type: 'error', message: 'Repair failed: ' + (result.error || 'unknown error') });
        }
      } catch (err) {
        const { dialog } = require('electron');
        await dialog.showMessageBox({ type: 'error', message: 'Repair encountered an error: ' + err.message });
      } finally {
        app.quit();
      }
    })();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (mainWindow && mainWindow.webContents && mainWindow.webContents.send) {
    try {
      mainWindow.webContents.send('error', {
        message: 'An unexpected error occurred',
        details: error.message
      });
    } catch (e) {
      console.error('Failed to notify renderer about uncaughtException:', e && e.message);
    }
  }
});

// Mover handlers IPC personalizados dentro de app.whenReady()
app.whenReady().then(() => {
  // Handlers IPC personalizados
  ipcMain.handle('remove-threatguard', async (event, installPath) => {
    const { execFile } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    // Primary: try PowerShell uninstall script (more comprehensive cleanup)
    const candidatePaths = [
      path.resolve(__dirname, '..', '..', 'build', 'uninstall.ps1'),
      path.resolve(__dirname, '..', 'build', 'uninstall.ps1'),
      path.resolve(process.resourcesPath, 'uninstall.ps1')
    ];

    let ps1path = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        ps1path = p;
        break;
      }
    }

    if (ps1path) {
      // Execute PowerShell script using execFile to avoid quoting
      // Pass -InstallPath if provided
      const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1path];
      if (installPath) {
        args.push('-InstallPath');
        args.push(installPath);
      }

      await new Promise((resolve, reject) => {
        execFile('powershell.exe', args, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`PowerShell uninstaller failed: ${error.message}\n${stderr || ''}`));
          } else {
            resolve({ stdout });
          }
        });
      });
      return true;
    }

    throw new Error(`Uninstaller not found. Expected uninstall.ps1 in build folders.`);
  });

  ipcMain.handle('repair-threatguard', async () => {
    const { exec } = require('child_process');
    await new Promise(resolve => exec('sc start ThreatGuard', resolve));
    return true;
  });

  // Cancel / rollback an in-progress installation (best-effort)
  ipcMain.handle('cancel-install', async () => {
    try {
      if (!installer || typeof installer.cancelInstall !== 'function') {
        return { success: false, error: 'Cancel not supported on this platform' };
      }

      // Provide a progress callback that forwards messages to renderer if available
      const progressCb = (progress) => {
        try {
          if (mainWindow && mainWindow.webContents && mainWindow.webContents.send) {
            mainWindow.webContents.send('cancel-progress', progress);
          }
        } catch (e) {
          console.warn('Failed to forward cancel-progress to renderer:', e && e.message);
        }
      };

      // Call cancelInstall which should attempt to stop services and remove files
      const result = await installer.cancelInstall(progressCb);
      return { success: true, details: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('check-threatguard-service', async () => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      // Use -Name to avoid pipeline/Where-Object quoting issues and suppress errors
      const cmd = 'powershell -NoProfile -Command "Get-Service -Name \'*ThreatGuard*\' -ErrorAction SilentlyContinue"';
      exec(cmd, (err, stdout) => {
        if (stdout && stdout.match(/ThreatGuard/)) {
          resolve({ installed: true });
        } else {
          resolve({ installed: false });
        }
      });
    });
  });

  // Check for installed marker file placed by the installer
  ipcMain.handle('check-installed-marker', async () => {
    try {
      // Check standard install path first (C:\ThreatGuard or /opt/threatguard)
      const standardPath = process.platform === 'win32' ? 'C:\\ThreatGuard' : '/opt/threatguard';
      const standardMarker = path.join(standardPath, '.threatguard_installed');
      if (fs.existsSync(standardMarker)) {
        return { installed: true, markerPath: standardMarker };
      }

      // Check installer's notion of install path (which might be wrong if not updated)
      const markerPath = path.join(installer.getInstallPath(), '.threatguard_installed');
      if (fs.existsSync(markerPath)) {
        return { installed: true, markerPath };
      }

      // Also check resourcesPath for a marker (edge cases)
      const resourceMarker = path.join(process.resourcesPath, '.threatguard_installed');
      if (fs.existsSync(resourceMarker)) {
        return { installed: true, markerPath: resourceMarker };
      }
      return { installed: false };
    } catch (e) {
      return { installed: false, error: e && e.message };
    }
  });
});
