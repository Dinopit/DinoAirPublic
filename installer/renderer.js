// State management
let currentScreen = 'welcome';
let selectedMode = null;
let hardwareInfo = null;
let recommendations = null;

// Screen elements
const screens = {
    welcome: document.getElementById('welcome-screen'),
    hardware: document.getElementById('hardware-screen'),
    mode: document.getElementById('mode-screen'),
    path: document.getElementById('path-screen'),
    progress: document.getElementById('progress-screen'),
    success: document.getElementById('success-screen'),
    error: document.getElementById('error-screen')
};

// Navigation functions
function showScreen(screenName) {
    Object.keys(screens).forEach(name => {
        screens[name].classList.remove('active');
    });
    screens[screenName].classList.add('active');
    currentScreen = screenName;
}

function navigateBack() {
    const navigation = {
        hardware: 'welcome',
        mode: 'hardware',
        path: 'mode',
        progress: 'path'
    };
    if (navigation[currentScreen]) {
        showScreen(navigation[currentScreen]);
    }
}

// Welcome screen
document.getElementById('start-btn').addEventListener('click', async () => {
    showScreen('hardware');
    await detectHardware();
});

// Hardware detection
async function detectHardware() {
    const loadingEl = document.getElementById('hardware-loading');
    const resultsEl = document.getElementById('hardware-results');
    const continueBtn = document.getElementById('continue-hardware-btn');
    
    loadingEl.style.display = 'block';
    resultsEl.style.display = 'none';
    continueBtn.disabled = true;
    
    try {
        // Detect hardware
        const hwResult = await window.electronAPI.detectHardware();
        if (!hwResult.success) {
            throw new Error(hwResult.error);
        }
        hardwareInfo = hwResult.data;
        
        // Get recommendations
        const recResult = await window.electronAPI.getRecommendations(hardwareInfo);
        if (!recResult.success) {
            throw new Error(recResult.error);
        }
        recommendations = recResult.data;
        
        // Update UI
        displayHardwareInfo();
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
        continueBtn.disabled = false;
        
    } catch (error) {
        console.error('Hardware detection failed:', error);
        showError('Failed to detect hardware: ' + error.message);
    }
}

function displayHardwareInfo() {
    // CPU info
    document.getElementById('cpu-info').textContent = 
        `${hardwareInfo.cpu.name} (${hardwareInfo.cpu.cores} cores)`;
    
    // RAM info
    document.getElementById('ram-info').textContent = 
        `${hardwareInfo.ram.total_gb} GB (${hardwareInfo.ram.available_gb} GB available)`;
    
    // GPU info
    const gpuText = hardwareInfo.gpu.devices.length > 0 
        ? `${hardwareInfo.gpu.devices[0]} (${hardwareInfo.gpu.total_vram_gb} GB VRAM)`
        : 'No dedicated GPU detected';
    document.getElementById('gpu-info').textContent = gpuText;
    
    // Recommendations
    document.getElementById('tier-info').textContent = 
        `Hardware Tier: ${recommendations.tier.toUpperCase()}`;
    document.getElementById('model-info').textContent = 
        `Recommended Model: ${recommendations.recommendedModel}`;
    document.getElementById('performance-info').textContent = 
        `Expected Performance: ${recommendations.capabilities.estimatedSpeed}`;
}

// Hardware screen navigation
document.getElementById('back-hardware-btn').addEventListener('click', () => {
    navigateBack();
});

document.getElementById('continue-hardware-btn').addEventListener('click', () => {
    showScreen('mode');
    setupModeSelection();
});

// Mode selection
function setupModeSelection() {
    const modeCards = document.querySelectorAll('.mode-card');
    const installBtn = document.getElementById('install-btn');
    
    // Set recommended mode
    const recommendedMode = recommendations.recommendedMode;
    modeCards.forEach(card => {
        if (card.dataset.mode === recommendedMode) {
            const header = card.querySelector('.mode-header');
            if (!header.querySelector('.badge')) {
                const badge = document.createElement('span');
                badge.className = 'badge recommended';
                badge.textContent = 'Recommended';
                header.appendChild(badge);
            }
        }
    });
    
    // Mode card click handlers
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMode = card.dataset.mode;
            installBtn.disabled = false;
        });
    });
    
    // Auto-select recommended mode
    const recommendedCard = document.querySelector(`[data-mode="${recommendedMode}"]`);
    if (recommendedCard) {
        recommendedCard.click();
    }
}

// Mode screen navigation
document.getElementById('back-mode-btn').addEventListener('click', () => {
    navigateBack();
});

document.getElementById('install-btn').addEventListener('click', () => {
    showScreen('path');
    setupPathSelection();
});

// Path selection
function setupPathSelection() {
    const pathInput = document.getElementById('install-path');
    const browseBtn = document.getElementById('browse-btn');
    const availableSpaceEl = document.getElementById('available-space');
    const modelSizeEl = document.getElementById('model-size');
    const totalSizeEl = document.getElementById('total-size');
    
    // Set default installation path
    const defaultPath = getDefaultInstallPath();
    pathInput.value = defaultPath;
    
    // Update space requirements based on selected mode and model
    const modelSizes = {
        'sdxl-turbo': '6.5 GB',
        'sd-1.5': '2 GB',
        'sd-1.5-cpu': '2 GB',
        'sd-1.5-mini': '1 GB'
    };
    
    const modelSize = modelSizes[recommendations.recommendedModel] || '2 GB';
    modelSizeEl.textContent = `~${modelSize}`;
    
    // Calculate total size
    const coreSizeMB = 500;
    const modelSizeMB = parseFloat(modelSize) * 1024;
    const totalSizeMB = coreSizeMB + modelSizeMB;
    totalSizeEl.textContent = `~${(totalSizeMB / 1024).toFixed(1)} GB`;
    
    // Check available space
    checkAvailableSpace(defaultPath).then(space => {
        if (space) {
            availableSpaceEl.textContent = `${(space / 1024).toFixed(1)} GB`;
            availableSpaceEl.style.color = space > totalSizeMB ? '#2e7d32' : '#d32f2f';
        }
    });
    
    // Browse button handler
    browseBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectDirectory();
        if (result.path) {
            pathInput.value = result.path;
            // Check space for new path
            checkAvailableSpace(result.path).then(space => {
                if (space) {
                    availableSpaceEl.textContent = `${(space / 1024).toFixed(1)} GB`;
                    availableSpaceEl.style.color = space > totalSizeMB ? '#2e7d32' : '#d32f2f';
                }
            });
        }
    });
}

// Get default installation path
function getDefaultInstallPath() {
    const platform = process.platform;
    if (platform === 'win32') {
        return process.env.PROGRAMFILES ?
            `${process.env.PROGRAMFILES}\\DinoAir` : 'C:\\Program Files\\DinoAir';
    } else if (platform === 'darwin') {
        return '/Applications/DinoAir';
    } else {
        return '/usr/local/dinoair';
    }
}

// Check available disk space
async function checkAvailableSpace(path) {
    try {
        const result = await window.electronAPI.checkDiskSpace(path);
        return result.available;
    } catch (error) {
        console.error('Failed to check disk space:', error);
        return null;
    }
}

// Path screen navigation
document.getElementById('back-path-btn').addEventListener('click', () => {
    navigateBack();
});

document.getElementById('install-path-btn').addEventListener('click', async () => {
    const installPath = document.getElementById('install-path').value;
    if (installPath) {
        await startInstallation(installPath);
    }
});

// Installation process
async function startInstallation(installPath) {
    showScreen('progress');
    
    const progressFill = document.getElementById('progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const statusText = document.getElementById('status-text');
    const logContent = document.getElementById('log-content');
    
    // Set installation mode
    await window.electronAPI.setInstallationMode(selectedMode);
    
    // Listen for progress updates
    window.electronAPI.onInstallationProgress((data) => {
        progressFill.style.width = `${data.progress}%`;
        progressPercentage.textContent = `${data.progress}%`;
        statusText.textContent = data.step;
        
        // Add to log
        const logEntry = document.createElement('p');
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${data.step}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    });
    
    try {
        // Start installation
        const config = {
            mode: selectedMode,
            model: recommendations.recommendedModel,
            hardware: hardwareInfo,
            installPath: installPath
        };
        
        const result = await window.electronAPI.startInstallation(config);
        
        if (result.success) {
            showInstallationSuccess();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('Installation failed: ' + error.message);
    } finally {
        window.electronAPI.removeAllListeners();
    }
}

// Success screen
function showInstallationSuccess() {
    showScreen('success');
    
    // Update success details
    document.getElementById('installed-mode').textContent = 
        selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1) + ' Mode';
    document.getElementById('installed-model').textContent = 
        recommendations.recommendedModel;
    
    // Get install location from configuration
    const installPath = document.getElementById('install-path').value || getDefaultInstallPath();
    document.getElementById('install-location').textContent = installPath;
}

document.getElementById('launch-btn').addEventListener('click', async () => {
    try {
        await window.electronAPI.openDinoAir();
        window.close();
    } catch (error) {
        console.error('Failed to launch DinoAir:', error);
    }
});

document.getElementById('finish-btn').addEventListener('click', () => {
    window.close();
});

// Error handling
function showError(message) {
    showScreen('error');
    document.getElementById('error-message').textContent = message;
}

document.getElementById('retry-btn').addEventListener('click', () => {
    // Reset and go back to mode selection
    showScreen('mode');
});

document.getElementById('exit-btn').addEventListener('click', () => {
    window.close();
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('DinoAir Installer initialized');
});