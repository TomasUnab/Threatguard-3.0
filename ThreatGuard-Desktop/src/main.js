const { app, BrowserWindow, Menu, Tray, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let splashWindow;
let tray = null;
let isQuitting = false;
let frontendProcess = null; // Process for frontend server

// Configuration
const config = {
    frontendUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:8000',
    installPath: 'C:\\ThreatGuard',
    webPath: 'C:\\ThreatGuard\\PAGINA WEB',
    checkInterval: 5000,
    startupTimeout: 30000
};

// Load config from .env if exists
function loadConfig() {
    const envPaths = [
        path.join(app.getPath('userData'), '.env'),
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '..', '.env'),
        'C:\\ThreatGuard\\.env'
    ];

    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const lines = envContent.split('\n');
                
                for (const line of lines) {
                    const match = line.match(/^([^=]+)=(.*)$/);
                    if (match) {
                        const [, key, value] = match;
                        const k = key.trim();
                        const v = value.trim();
                        
                        if (k === 'FRONTEND_PORT' && v) {
                            config.frontendUrl = `http://localhost:${v}`;
                        }
                        if (k === 'API_PORT' && v) {
                            config.apiUrl = `http://localhost:${v}`;
                        }
                        if (k === 'INSTALL_PATH' && v) {
                            config.installPath = v;
                            config.webPath = path.join(v, 'PAGINA WEB');
                        }
                    }
                }
                console.log(`Loaded config from ${envPath}`);
                break;
            } catch (e) {
                console.error(`Error loading config from ${envPath}:`, e);
            }
        }
    }
}

// Start frontend server if not running
function startFrontendServer() {
    return new Promise((resolve) => {
        const webDir = config.webPath;
        
        if (!fs.existsSync(webDir)) {
            console.error(`Web directory not found: ${webDir}`);
            resolve(false);
            return;
        }

        // Extract port from frontendUrl
        const portMatch = config.frontendUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '3000';

        console.log(`Starting frontend server from: ${webDir} on port ${port}`);
        
        // Create a simple HTTP server using Node.js
        const httpServer = require('http');
        const fsModule = require('fs');
        const pathModule = require('path');
        
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf'
        };
        
        frontendProcess = httpServer.createServer((req, res) => {
            let filePath = pathModule.join(webDir, req.url === '/' ? 'index.html' : req.url);
            
            // Remove query string
            filePath = filePath.split('?')[0];
            
            // Security: prevent directory traversal
            if (!filePath.startsWith(webDir)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            const extname = pathModule.extname(filePath).toLowerCase();
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            
            fsModule.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        // Try with .html extension
                        fsModule.readFile(filePath + '.html', (err2, content2) => {
                            if (err2) {
                                res.writeHead(404);
                                res.end('File not found');
                            } else {
                                res.writeHead(200, { 
                                    'Content-Type': 'text/html',
                                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                                    'Pragma': 'no-cache',
                                    'Expires': '0'
                                });
                                res.end(content2, 'utf-8');
                            }
                        });
                    } else {
                        res.writeHead(500);
                        res.end('Server error: ' + error.code);
                    }
                } else {
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    });
                    res.end(content, 'utf-8');
                }
            });
        });
        
        frontendProcess.listen(parseInt(port), '0.0.0.0', () => {
            console.log(`Frontend server running at http://localhost:${port}`);
            resolve(true);
        });
        
        frontendProcess.on('error', (err) => {
            console.error('Failed to start frontend server:', err);
            resolve(false);
        });
    });
}

// Stop frontend server
function stopFrontendServer() {
    if (frontendProcess) {
        console.log('Stopping frontend server...');
        if (frontendProcess.close) {
            frontendProcess.close();
        } else if (frontendProcess.kill) {
            frontendProcess.kill('SIGTERM');
        }
        frontendProcess = null;
    }
}

// Check if a service is running
function checkService(url) {
    return new Promise((resolve) => {
        const req = http.get(url, { timeout: 3000 }, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Wait for services to be ready
async function waitForServices(timeout = config.startupTimeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const frontendReady = await checkService(config.frontendUrl);
        const apiReady = await checkService(`${config.apiUrl}/health`);
        
        if (frontendReady) {
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
}

// Create splash screen window
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        icon: path.join(__dirname, '../assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.center();
    
    return splashWindow;
}

// Update splash screen progress
function updateSplashProgress(progress, message) {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('progress-update', { progress, message });
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'ThreatGuard - Security Operations Center',
        icon: path.join(__dirname, '../assets/icon.ico'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        backgroundColor: '#111621'
    });

    // Show loading screen first
    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            
            // Show notification that app is still running
            if (tray) {
                tray.displayBalloon({
                    title: 'ThreatGuard',
                    content: 'La aplicación sigue ejecutándose en segundo plano.',
                    iconType: 'info'
                });
            }
        }
    });

    // Start checking services and load main app when ready
    startServiceCheck();
}

async function startServiceCheck() {
    const isReady = await waitForServices();
    
    if (isReady) {
        mainWindow.loadURL(config.frontendUrl);
    } else {
        // Show error page with retry option
        mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
}

function createTray() {
    const iconPath = path.join(__dirname, '../assets/icon.ico');
    
    // Use a default icon if the custom one doesn't exist
    if (!fs.existsSync(iconPath)) {
        tray = new Tray(path.join(__dirname, '../assets/tray-icon.ico'));
    } else {
        tray = new Tray(iconPath);
    }

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Abrir ThreatGuard',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        {
            label: 'Estado de Servicios',
            click: async () => {
                const frontendOk = await checkService(config.frontendUrl);
                const apiOk = await checkService(`${config.apiUrl}/health`);
                
                dialog.showMessageBox({
                    type: 'info',
                    title: 'Estado de Servicios',
                    message: 'Estado de los servicios de ThreatGuard',
                    detail: `Frontend: ${frontendOk ? '✅ Activo' : '❌ Inactivo'}\nAPI Backend: ${apiOk ? '✅ Activo' : '❌ Inactivo'}`,
                    buttons: ['OK']
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Abrir en Navegador',
            click: () => {
                shell.openExternal(config.frontendUrl);
            }
        },
        {
            label: 'Abrir Carpeta de Instalación',
            click: () => {
                shell.openPath('C:\\ThreatGuard');
            }
        },
        { type: 'separator' },
        {
            label: 'Reiniciar Servicios',
            click: async () => {
                const result = await dialog.showMessageBox({
                    type: 'question',
                    title: 'Reiniciar Servicios',
                    message: '¿Desea reiniciar los servicios de ThreatGuard?',
                    buttons: ['Sí', 'No']
                });
                
                if (result.response === 0) {
                    restartServices();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Salir',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('ThreatGuard - Security Operations Center');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

async function restartServices() {
    // Reiniciar servicios de Windows
    exec('net stop ThreatGuardFrontend & net start ThreatGuardFrontend', (error) => {
        if (error) {
            console.log('Could not restart ThreatGuardFrontend service');
        }
    });

    // Reload the window after a delay
    setTimeout(() => {
        startServiceCheck();
    }, 5000);
}

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'ThreatGuard',
            submenu: [
                {
                    label: 'Acerca de ThreatGuard',
                    click: () => {
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'Acerca de ThreatGuard',
                            message: 'ThreatGuard v1.0.0',
                            detail: 'Security Operations Center\n\nPlataforma de ciberseguridad empresarial con detección de amenazas en tiempo real, análisis ML y automatización SOAR.',
                            buttons: ['OK']
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Preferencias',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.loadURL(`${config.frontendUrl}/settings/code.html`);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        isQuitting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload', label: 'Recargar' },
                { role: 'forceReload', label: 'Forzar Recarga' },
                { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Restablecer Zoom' },
                { role: 'zoomIn', label: 'Acercar' },
                { role: 'zoomOut', label: 'Alejar' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Pantalla Completa' }
            ]
        },
        {
            label: 'Navegación',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/executive_summary/code.html`)
                },
                {
                    label: 'Alertas',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/alerts/code.html`)
                },
                {
                    label: 'Activos',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/assets/code.html`)
                },
                {
                    label: 'Vulnerabilidades',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/vulnerability_management/code.html`)
                },
                {
                    label: 'SOAR',
                    accelerator: 'CmdOrCtrl+5',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/soar/code.html`)
                },
                {
                    label: 'Reportes',
                    accelerator: 'CmdOrCtrl+6',
                    click: () => mainWindow.loadURL(`${config.frontendUrl}/reports/code.html`)
                }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Documentación',
                    click: () => shell.openExternal('https://github.com/TomasUnab/Threatguard-3.0/wiki')
                },
                {
                    label: 'Reportar Problema',
                    click: () => shell.openExternal('https://github.com/TomasUnab/Threatguard-3.0/issues')
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('check-services', async () => {
    const frontendOk = await checkService(config.frontendUrl);
    const apiOk = await checkService(`${config.apiUrl}/health`);
    return { frontend: frontendOk, api: apiOk };
});

ipcMain.handle('retry-connection', async () => {
    const isReady = await waitForServices(15000);
    if (isReady) {
        mainWindow.loadURL(config.frontendUrl);
        return true;
    }
    return false;
});

ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('get-service-status', async () => {
    const frontendOk = await checkService(config.frontendUrl);
    const apiOk = await checkService(`${config.apiUrl}/health`);
    return {
        frontend: { running: frontendOk, status: frontendOk ? 'running' : 'stopped' },
        api: { running: apiOk, status: apiOk ? 'running' : 'stopped' }
    };
});

// App lifecycle
app.whenReady().then(async () => {
    loadConfig();
    
    // Show splash screen first
    createSplashWindow();
    
    // Simulate loading progress
    updateSplashProgress(10, 'Cargando configuración...');
    await new Promise(r => setTimeout(r, 400));
    
    updateSplashProgress(30, 'Verificando servicios...');
    await new Promise(r => setTimeout(r, 400));
    
    // Check if frontend is running, if not start it
    let frontendOk = await checkService(config.frontendUrl);
    
    if (!frontendOk) {
        updateSplashProgress(40, 'Iniciando servidor web...');
        await startFrontendServer();
        await new Promise(r => setTimeout(r, 1500));
        frontendOk = await checkService(config.frontendUrl);
    }
    
    const apiOk = await checkService(`${config.apiUrl}/health`);
    
    updateSplashProgress(60, frontendOk ? 'Frontend conectado' : 'Esperando frontend...');
    await new Promise(r => setTimeout(r, 300));
    
    updateSplashProgress(80, 'Preparando interfaz...');
    await new Promise(r => setTimeout(r, 400));
    
    // Create main window
    createWindow();
    createTray();
    createMenu();
    
    updateSplashProgress(100, 'Lanzando aplicación...');
    await new Promise(r => setTimeout(r, 300));
    
    // Close splash and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
    }
    
    mainWindow.show();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    // Don't quit on window close - keep in tray
});

app.on('before-quit', async () => {
    isQuitting = true;
    stopFrontendServer();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    dialog.showErrorBox('Error', `Ha ocurrido un error inesperado: ${error.message}`);
});
