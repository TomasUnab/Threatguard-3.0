const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('threatguard', {
    checkServices: () => ipcRenderer.invoke('check-services'),
    retryConnection: () => ipcRenderer.invoke('retry-connection'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Progress updates for splash screen
    onProgress: (callback) => {
        ipcRenderer.on('progress-update', (event, data) => {
            callback(data);
        });
    }
});
