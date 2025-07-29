const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  detectHardware: () => ipcRenderer.invoke('detect-hardware'),
  getRecommendations: (hardware) => ipcRenderer.invoke('get-recommendations', hardware),
  setInstallationMode: (mode) => ipcRenderer.invoke('set-installation-mode', mode),
  startInstallation: (config) => ipcRenderer.invoke('start-installation', config),
  getInstallationState: () => ipcRenderer.invoke('get-installation-state'),
  openDinoAir: () => ipcRenderer.invoke('open-dinoair'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  checkDiskSpace: (path) => ipcRenderer.invoke('check-disk-space', path),
  
  // Listen for progress updates
  onInstallationProgress: (callback) => {
    ipcRenderer.on('installation-progress', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('installation-progress');
  }
});