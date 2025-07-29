const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');

let mainWindow;
let installationState = {
  mode: 'easy',
  hardware: null,
  recommendations: null,
  progress: 0,
  status: 'idle',
  error: null
};

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    resizable: false,
    center: true,
    title: 'DinoAir Installer'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('detect-hardware', async () => {
  try {
    console.log('Detecting hardware...');
    const hardwareInfo = await detectHardware();
    installationState.hardware = hardwareInfo;
    return { success: true, data: hardwareInfo };
  } catch (error) {
    console.error('Hardware detection failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-recommendations', async (event, hardware) => {
  try {
    console.log('Getting recommendations for hardware:', hardware);
    const recommendations = await getModelRecommendations(hardware);
    installationState.recommendations = recommendations;
    return { success: true, data: recommendations };
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-installation-mode', (event, mode) => {
  installationState.mode = mode;
  return { success: true };
});

ipcMain.handle('select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Installation Directory'
    });
    
    if (result.canceled) {
      return { canceled: true };
    }
    
    return { path: result.filePaths[0] };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('check-disk-space', async (event, path) => {
  try {
    const diskusage = require('diskusage');
    const info = await diskusage.check(path);
    
    return {
      available: Math.round(info.available / (1024 * 1024)), // MB
      total: Math.round(info.total / (1024 * 1024)) // MB
    };
  } catch (error) {
    // Fallback for when diskusage is not available
    const stats = await fsPromises.statfs(path).catch(() => null);
    if (stats) {
      return {
        available: Math.round((stats.bavail * stats.bsize) / (1024 * 1024)),
        total: Math.round((stats.blocks * stats.bsize) / (1024 * 1024))
      };
    }
    
    // Ultimate fallback - assume enough space
    return {
      available: 10000, // 10GB
      total: 50000 // 50GB
    };
  }
});

ipcMain.handle('start-installation', async (event, config) => {
  try {
    installationState.status = 'installing';
    installationState.progress = 0;
    installationState.installPath = config.installPath;
    
    // Real installation steps
    const steps = [
      { name: 'Checking prerequisites', weight: 10, handler: checkPrerequisites },
      { name: 'Creating directories', weight: 5, handler: createDirectories },
      { name: 'Copying core files', weight: 15, handler: copyCoreFiles },
      { name: 'Downloading models', weight: 40, handler: downloadModels },
      { name: 'Installing dependencies', weight: 20, handler: installDependencies },
      { name: 'Configuring DinoAir', weight: 8, handler: configureDinoAir },
      { name: 'Creating shortcuts', weight: 2, handler: createShortcuts }
    ];

    let currentProgress = 0;
    
    for (const step of steps) {
      mainWindow.webContents.send('installation-progress', {
        step: step.name,
        progress: currentProgress
      });
      
      // Execute step
      if (step.handler) {
        await step.handler(config);
      } else {
        await simulateInstallationStep(step);
      }
      
      currentProgress += step.weight;
      installationState.progress = currentProgress;
    }

    installationState.status = 'complete';
    return { success: true };
  } catch (error) {
    installationState.status = 'error';
    installationState.error = error.message;
    return { success: false, error: error.message };
  }
});

// Installation step handlers
async function checkPrerequisites(config) {
  // Check Python installation
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  try {
    const { stdout } = await require('util').promisify(require('child_process').exec)(`${pythonPath} --version`);
    console.log('Python found:', stdout.trim());
  } catch (error) {
    throw new Error('Python is not installed or not in PATH');
  }
  
  // Check disk space
  const spaceInfo = await ipcMain.handle('check-disk-space', null, config.installPath);
  const requiredSpace = 3000; // 3GB minimum
  if (spaceInfo.available < requiredSpace) {
    throw new Error(`Insufficient disk space. Required: ${requiredSpace}MB, Available: ${spaceInfo.available}MB`);
  }
}

async function createDirectories(config) {
  const dirs = [
    config.installPath,
    path.join(config.installPath, 'lib'),
    path.join(config.installPath, 'models'),
    path.join(config.installPath, 'config'),
    path.join(config.installPath, 'logs'),
    path.join(config.installPath, 'ComfyUI')
  ];
  
  for (const dir of dirs) {
    await fsPromises.mkdir(dir, { recursive: true });
  }
}

async function copyCoreFiles(config) {
  // In production, copy from app resources
  // For now, simulate
  await new Promise(resolve => setTimeout(resolve, 1500));
}

async function downloadModels(config) {
  // In production, download the selected model
  // For now, simulate longer duration
  await new Promise(resolve => setTimeout(resolve, 3000));
}

async function installDependencies(config) {
  // In production, run pip install
  // For now, simulate
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function configureDinoAir(config) {
  // Write configuration files
  const configData = {
    mode: config.mode,
    model: config.model,
    hardware: config.hardware,
    installPath: config.installPath,
    installedAt: new Date().toISOString()
  };
  
  await fsPromises.writeFile(
    path.join(config.installPath, 'config', 'installation.json'),
    JSON.stringify(configData, null, 2)
  );
}

async function createShortcuts(config) {
  // Platform-specific shortcut creation
  // For now, simulate
  await new Promise(resolve => setTimeout(resolve, 500));
}

ipcMain.handle('get-installation-state', () => {
  return installationState;
});

ipcMain.handle('open-dinoair', async () => {
  try {
    // Launch DinoAir based on the platform
    const platform = process.platform;
    let command, args;
    
    if (platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', 'python', path.join(getInstallPath(), 'start.py')];
    } else if (platform === 'darwin') {
      command = 'open';
      args = ['-a', 'Terminal', path.join(getInstallPath(), 'start.py')];
    } else {
      command = 'xterm';
      args = ['-e', 'python3', path.join(getInstallPath(), 'start.py')];
    }
    
    spawn(command, args, { detached: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Hardware detection function
async function detectHardware() {
  return new Promise((resolve, reject) => {
    // Determine Python executable
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    
    // Script path - try multiple locations
    let scriptPath;
    const possiblePaths = [
      path.join(__dirname, 'scripts', 'hardware_detector_wrapper.py'),
      path.join(process.resourcesPath, 'scripts', 'hardware_detector_wrapper.py'),
      path.join(__dirname, '..', 'scripts', 'hardware_detector_wrapper.py')
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        scriptPath = p;
        break;
      }
    }
    
    if (!scriptPath) {
      console.error('Hardware detector script not found');
      // Fall back to basic detection
      return resolve(getFallbackHardware());
    }
    
    console.log('Running hardware detection script:', scriptPath);
    
    // Execute the Python script
    const child = spawn(pythonPath, [scriptPath], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      resolve(getFallbackHardware());
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Hardware detection failed with code:', code);
        console.error('stderr:', stderr);
        return resolve(getFallbackHardware());
      }
      
      try {
        const result = JSON.parse(stdout);
        if (result.success) {
          resolve(result.data);
        } else {
          console.error('Hardware detection error:', result.error);
          resolve(result.data || getFallbackHardware());
        }
      } catch (error) {
        console.error('Failed to parse hardware detection output:', error);
        console.error('stdout:', stdout);
        resolve(getFallbackHardware());
      }
    });
  });
}

// Fallback hardware detection using Node.js APIs
function getFallbackHardware() {
  return {
    cpu: {
      name: os.cpus()[0]?.model || 'Unknown CPU',
      cores: os.cpus().length,
      threads: os.cpus().length
    },
    ram: {
      total_gb: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
      available_gb: Math.round(os.freemem() / (1024 * 1024 * 1024))
    },
    gpu: {
      devices: [],
      cuda_available: false,
      total_vram_gb: 0
    },
    system: {
      platform: os.platform(),
      os: os.type(),
      tier: 'low'
    }
  };
}

// Model recommendation function
async function getModelRecommendations(hardware) {
  // Simplified recommendation logic for the installer
  const totalRam = hardware.ram.total_gb;
  const hasGpu = hardware.gpu.devices.length > 0;
  
  let tier, recommendedModel, mode;
  
  if (hasGpu && hardware.gpu.total_vram_gb >= 8) {
    tier = 'premium';
    recommendedModel = 'sdxl-turbo';
    mode = 'pro';
  } else if (hasGpu && hardware.gpu.total_vram_gb >= 4) {
    tier = 'standard';
    recommendedModel = 'sd-1.5';
    mode = 'standard';
  } else if (totalRam >= 16) {
    tier = 'basic';
    recommendedModel = 'sd-1.5-cpu';
    mode = 'easy';
  } else {
    tier = 'minimal';
    recommendedModel = 'sd-1.5-mini';
    mode = 'easy';
  }
  
  return {
    tier,
    recommendedModel,
    recommendedMode: mode,
    capabilities: {
      maxResolution: tier === 'premium' ? '1024x1024' : '512x512',
      estimatedSpeed: tier === 'premium' ? 'Fast' : tier === 'standard' ? 'Medium' : 'Slow',
      features: tier === 'premium' ? ['Real-time generation', 'High quality', 'All models'] :
                tier === 'standard' ? ['Good quality', 'Most models'] : 
                ['Basic quality', 'Limited models']
    }
  };
}

// Simulate installation step
async function simulateInstallationStep(step) {
  // In production, this would perform actual installation tasks
  return new Promise((resolve) => {
    const duration = step.name === 'Downloading models' ? 3000 : 1000;
    setTimeout(resolve, duration);
  });
}

// Get installation path
function getInstallPath() {
  // Return the path from installation state if available
  if (installationState.installPath) {
    return installationState.installPath;
  }
  
  // Default installation paths
  if (process.platform === 'win32') {
    return path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'DinoAir');
  } else if (process.platform === 'darwin') {
    return '/Applications/DinoAir';
  } else {
    return '/usr/local/dinoair';
  }
}