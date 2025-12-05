const { app, Tray, Menu } = require('electron');
const path = require('path');

let tray = null;

app.on('ready', () => {
    tray = new Tray(path.join(__dirname, '../../assets/icon.ico'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Abrir Dashboard', click: () => {
            require('electron').shell.openExternal('http://localhost:3000');
        }},
        { type: 'separator' },
        { label: 'Salir', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('ThreatGuard - Protegiendo tu sistema');
    tray.setContextMenu(contextMenu);
});

// Mantener la app viva en la bandeja
app.on('window-all-closed', () => {});
