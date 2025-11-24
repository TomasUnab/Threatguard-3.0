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
    await shell.openExternal(url);
  }
  app.quit();
});

// App lifecycle
app.whenReady().then(() => {
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
  if (mainWindow) {
    mainWindow.webContents.send('error', {
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});
