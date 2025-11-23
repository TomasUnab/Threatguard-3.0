const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Import installers
const { LinuxInstaller } = require('./backend/linux-installer');
const { WindowsInstaller } = require('./backend/windows-installer');
const { UnixInstaller } = require('./backend/unix-installer');

let mainWindow;
let installer;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    resizable: false,
    frame: true,
    title: 'ThreatGuard Installer',
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Detect OS and create appropriate installer
  if (process.platform === 'win32') {
    installer = new WindowsInstaller();
  } else if (process.platform === 'linux' || process.platform === 'darwin') {
    installer = new UnixInstaller();
  } else {
    console.error('Unsupported platform:', process.platform);
    app.quit();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers

// Check system requirements
ipcMain.handle('check-requirements', async () => {
  try {
    const requirements = await installer.checkRequirements();
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
      // Send progress updates to renderer
      mainWindow.webContents.send('install-progress', progress);
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

// Handle PostgreSQL installation
ipcMain.handle('install-postgresql', async () => {
  try {
    const installerPath = path.join(__dirname, '../binaries/postgresql-installer.exe');

    // Ensure the installer exists
    if (!fs.existsSync(installerPath)) {
      throw new Error('El instalador de PostgreSQL no se encuentra.');
    }

    // Execute the PostgreSQL installer in silent mode
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec(
        `\"${installerPath}\" --mode unattended --superpassword \"secure_password\"`,
        (error, stdout, stderr) => {
          if (error) {
            reject(`Error al instalar PostgreSQL: ${error.message}`);
          } else {
            resolve(stdout ? stdout : stderr);
          }
        }
      );
    });

    return { success: true, message: 'PostgreSQL instalado correctamente.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle directory selection
ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return { success: false, message: 'Selección de directorio cancelada.' };
    }

    const selectedPath = result.filePaths[0];
    return { success: true, path: selectedPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle directory creation
ipcMain.handle('create-directory', async (event, directoryPath) => {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
    return { success: true, message: 'Directorio creado correctamente.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Integrate directory selection into installation flow
ipcMain.handle('install-with-directory', async (event, { directoryPath, config }) => {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    // Pass the directory to the installer
    const result = await installer.install({ ...config, installPath: directoryPath }, (progress) => {
      mainWindow.webContents.send('install-progress', progress);
    });

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
