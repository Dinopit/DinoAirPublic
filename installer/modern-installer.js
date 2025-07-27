/**
 * DinoAir Modern Installer JavaScript
 * Handles the complete installation workflow with modern UX
 */

class ModernInstaller {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.installationData = {};
        this.systemInfo = {};
        this.requirements = [];
        this.installationPhases = [];
        this.isInstalling = false;
        this.installationLog = [];
        this.installationStartTime = null;
        
        // Bind methods
        this.nextStep = this.nextStep.bind(this);
        this.prevStep = this.prevStep.bind(this);
        this.updateProgress = this.updateProgress.bind(this);
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStepDisplay();
        this.updateProgress();
        this.initializeInstallationData();
        this.showLoadingOverlay('Initializing installer...', 1000);
    }

    setupEventListeners() {
        // Navigation buttons
        const nextBtn = document.getElementById('next-btn');
        const backBtn = document.getElementById('back-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (nextBtn) nextBtn.addEventListener('click', this.handleNextClick.bind(this));
        if (backBtn) backBtn.addEventListener('click', this.prevStep);
        if (cancelBtn) cancelBtn.addEventListener('click', this.handleCancel.bind(this));

        // Step-specific event listeners
        this.setupStep2EventListeners(); // Requirements
        this.setupStep3EventListeners(); // Configuration
        this.setupStep4EventListeners(); // Installation
        this.setupModalEventListeners();
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Form validation
        this.setupFormValidation();
    }

    setupStep2EventListeners() {
        // Requirements step will auto-run checks
        // No specific user interaction needed
    }

    setupStep3EventListeners() {
        // Path browsing
        const browseBtn = document.getElementById('browse-path');
        if (browseBtn) {
            browseBtn.addEventListener('click', this.browsePath.bind(this));
        }

        // Component selection changes
        const componentCheckboxes = document.querySelectorAll('input[type="checkbox"][id$="-component"]');
        componentCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.updateRequiredSpace.bind(this));
        });

        // Port validation
        const portInputs = document.querySelectorAll('input[type="number"]');
        portInputs.forEach(input => {
            input.addEventListener('change', this.validatePort.bind(this));
        });

        // Installation mode selection
        const modeInputs = document.querySelectorAll('input[name="install-mode"]');
        modeInputs.forEach(input => {
            input.addEventListener('change', this.updateInstallationMode.bind(this));
        });
    }

    setupStep4EventListeners() {
        // Log toggle
        const toggleLog = document.getElementById('toggle-log');
        if (toggleLog) {
            toggleLog.addEventListener('click', this.toggleInstallationLog.bind(this));
        }

        // Cancel installation
        const cancelInstall = document.getElementById('cancel-installation');
        if (cancelInstall) {
            cancelInstall.addEventListener('click', this.cancelInstallation.bind(this));
        }
    }

    setupModalEventListeners() {
        // Error modal
        const closeErrorModal = document.getElementById('close-error-modal');
        const closeError = document.getElementById('close-error');
        const retryInstallation = document.getElementById('retry-installation');
        const viewLogs = document.getElementById('view-logs');

        if (closeErrorModal) closeErrorModal.addEventListener('click', () => this.hideModal('error-modal'));
        if (closeError) closeError.addEventListener('click', () => this.hideModal('error-modal'));
        if (retryInstallation) retryInstallation.addEventListener('click', this.retryInstallation.bind(this));
        if (viewLogs) viewLogs.addEventListener('click', this.showDetailedLogs.bind(this));

        // Confirmation modal
        const closeConfirmModal = document.getElementById('close-confirm-modal');
        const confirmCancel = document.getElementById('confirm-cancel');
        const confirmOk = document.getElementById('confirm-ok');

        if (closeConfirmModal) closeConfirmModal.addEventListener('click', () => this.hideModal('confirm-modal'));
        if (confirmCancel) confirmCancel.addEventListener('click', () => this.hideModal('confirm-modal'));
        if (confirmOk) confirmOk.addEventListener('click', this.confirmAction.bind(this));

        // Dependency modal
        const skipDependencies = document.getElementById('skip-dependencies');
        const downloadDependencies = document.getElementById('download-dependencies');

        if (skipDependencies) skipDependencies.addEventListener('click', this.skipDependencies.bind(this));
        if (downloadDependencies) downloadDependencies.addEventListener('click', this.downloadDependencies.bind(this));
    }

    setupFormValidation() {
        const installPathInput = document.getElementById('install-path');
        if (installPathInput) {
            installPathInput.addEventListener('input', this.validateInstallPath.bind(this));
        }
    }

    handleKeydown(event) {
        if (event.key === 'Escape') {
            this.hideAllModals();
        } else if (event.key === 'Enter' && event.ctrlKey) {
            // Ctrl+Enter to proceed to next step
            if (!this.isInstalling && this.currentStep < this.totalSteps) {
                this.nextStep();
            }
        }
    }

    initializeInstallationData() {
        // Set default installation path
        const defaultPath = this.getDefaultInstallPath();
        const installPathInput = document.getElementById('install-path');
        if (installPathInput) {
            installPathInput.value = defaultPath;
        }

        // Initialize requirements
        this.requirements = [
            {
                name: 'Python 3.11+',
                status: 'checking',
                details: 'Required for ComfyUI and backend services',
                required: true
            },
            {
                name: 'Node.js 18+',
                status: 'checking',
                details: 'Required for web interface',
                required: true
            },
            {
                name: 'Git',
                status: 'checking',
                details: 'Required for downloading dependencies',
                required: true
            },
            {
                name: 'Ollama',
                status: 'checking',
                details: 'Required for AI chat functionality',
                required: false
            },
            {
                name: 'Available Disk Space (10GB+)',
                status: 'checking',
                details: 'Required for installation and models',
                required: true
            },
            {
                name: 'Available Memory (8GB+)',
                status: 'checking',
                details: 'Recommended for optimal performance',
                required: false
            }
        ];

        // Initialize installation phases
        this.installationPhases = [
            {
                id: 'prerequisites',
                name: 'Prerequisites',
                description: 'Installing required dependencies',
                status: 'pending',
                progress: 0
            },
            {
                id: 'core',
                name: 'DinoAir Core',
                description: 'Installing main application',
                status: 'pending',
                progress: 0
            },
            {
                id: 'ollama',
                name: 'Ollama',
                description: 'Setting up language models',
                status: 'pending',
                progress: 0
            },
            {
                id: 'comfyui',
                name: 'ComfyUI',
                description: 'Installing image generation tools',
                status: 'pending',
                progress: 0
            },
            {
                id: 'models',
                name: 'AI Models',
                description: 'Downloading default models',
                status: 'pending',
                progress: 0
            },
            {
                id: 'configuration',
                name: 'Configuration',
                description: 'Finalizing setup',
                status: 'pending',
                progress: 0
            }
        ];

        this.updateRequiredSpace();
    }

    getDefaultInstallPath() {
        // Try to detect the appropriate default path based on platform
        if (typeof window !== 'undefined' && window.navigator) {
            const platform = window.navigator.platform.toLowerCase();
            if (platform.includes('win')) {
                return 'C:\\Program Files\\DinoAir';
            } else if (platform.includes('mac')) {
                return '/Applications/DinoAir';
            } else {
                return '/opt/dinoair';
            }
        }
        return '/opt/dinoair'; // Default fallback
    }

    handleNextClick() {
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        
        switch (this.currentStep) {
            case 1:
                this.nextStep();
                break;
            case 2:
                if (this.validateRequirements()) {
                    this.nextStep();
                } else {
                    this.showDependencyModal();
                }
                break;
            case 3:
                if (this.validateConfiguration()) {
                    this.startInstallation();
                } else {
                    this.showError('Please fix configuration errors before proceeding.');
                }
                break;
            case 4:
                // Installation in progress - button should be disabled
                break;
            case 5:
                this.finishInstallation();
                break;
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            this.updateProgress();
            this.updateNavigationButtons();
            
            // Run step-specific initialization
            this.initializeStep(this.currentStep);
        }
    }

    prevStep() {
        if (this.currentStep > 1 && !this.isInstalling) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateProgress();
            this.updateNavigationButtons();
        }
    }

    updateStepDisplay() {
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show current step content
        const currentContent = document.getElementById(`step-${this.currentStep}`);
        if (currentContent) {
            currentContent.classList.add('active');
        }
        
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    updateProgress() {
        const progressPercent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
    }

    updateNavigationButtons() {
        const nextBtn = document.getElementById('next-btn');
        const backBtn = document.getElementById('back-btn');
        
        if (backBtn) {
            backBtn.disabled = this.currentStep === 1 || this.isInstalling;
        }
        
        if (nextBtn) {
            switch (this.currentStep) {
                case 1:
                    nextBtn.textContent = 'Check Requirements';
                    nextBtn.disabled = false;
                    break;
                case 2:
                    nextBtn.textContent = 'Configure Installation';
                    nextBtn.disabled = false;
                    break;
                case 3:
                    nextBtn.textContent = 'Start Installation';
                    nextBtn.disabled = false;
                    break;
                case 4:
                    nextBtn.textContent = 'Installing...';
                    nextBtn.disabled = true;
                    break;
                case 5:
                    nextBtn.textContent = 'Launch DinoAir';
                    nextBtn.disabled = false;
                    break;
            }
        }
    }

    initializeStep(stepNumber) {
        switch (stepNumber) {
            case 2:
                this.runSystemChecks();
                break;
            case 3:
                this.initializeConfiguration();
                break;
            case 4:
                // Installation step - handled by startInstallation()
                break;
            case 5:
                this.showCompletionScreen();
                break;
        }
    }

    async runSystemChecks() {
        this.showLoadingOverlay('Running system checks...');
        
        // Update status
        const statusElement = document.getElementById('installer-status');
        if (statusElement) {
            statusElement.textContent = 'Checking system requirements...';
        }
        
        try {
            // Populate requirements list
            this.displayRequirements();
            
            // Run actual checks
            await this.checkSystemRequirements();
            
            // Display system information
            await this.displaySystemInformation();
            
        } catch (error) {
            this.showError('Failed to check system requirements: ' + error.message);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    displayRequirements() {
        const requirementsList = document.getElementById('requirements-list');
        if (!requirementsList) return;
        
        requirementsList.innerHTML = '';
        
        this.requirements.forEach(req => {
            const reqElement = this.createRequirementElement(req);
            requirementsList.appendChild(reqElement);
        });
    }

    createRequirementElement(requirement) {
        const div = document.createElement('div');
        div.className = 'requirement-item';
        div.id = `req-${requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        
        div.innerHTML = `
            <div class="requirement-status ${requirement.status}">
                ${this.getStatusIcon(requirement.status)}
            </div>
            <div class="requirement-info">
                <div class="requirement-name">${requirement.name}</div>
                <div class="requirement-details">${requirement.details}</div>
            </div>
            <div class="requirement-badge ${requirement.required ? 'required' : 'optional'}">
                ${requirement.required ? 'Required' : 'Optional'}
            </div>
        `;
        
        return div;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'checking': return '⏳';
            case 'passed': return '✓';
            case 'failed': return '✗';
            case 'warning': return '⚠';
            default: return '?';
        }
    }

    async checkSystemRequirements() {
        // Simulate system checks with realistic delays
        for (let i = 0; i < this.requirements.length; i++) {
            await this.checkRequirement(this.requirements[i]);
            await this.delay(500); // Small delay between checks for better UX
        }
    }

    async checkRequirement(requirement) {
        const reqElement = document.getElementById(`req-${requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
        
        try {
            // Update to checking status
            requirement.status = 'checking';
            this.updateRequirementDisplay(reqElement, requirement);
            
            // Simulate actual check based on requirement name
            let result;
            switch (requirement.name) {
                case 'Python 3.11+':
                    result = await this.checkPython();
                    break;
                case 'Node.js 18+':
                    result = await this.checkNodeJS();
                    break;
                case 'Git':
                    result = await this.checkGit();
                    break;
                case 'Ollama':
                    result = await this.checkOllama();
                    break;
                case 'Available Disk Space (10GB+)':
                    result = await this.checkDiskSpace();
                    break;
                case 'Available Memory (8GB+)':
                    result = await this.checkMemory();
                    break;
                default:
                    result = { status: 'passed', details: 'Check completed' };
            }
            
            requirement.status = result.status;
            requirement.details = result.details || requirement.details;
            requirement.version = result.version;
            
            this.updateRequirementDisplay(reqElement, requirement);
            
        } catch (error) {
            requirement.status = 'failed';
            requirement.details = `Check failed: ${error.message}`;
            this.updateRequirementDisplay(reqElement, requirement);
        }
    }

    updateRequirementDisplay(element, requirement) {
        if (!element) return;
        
        const statusElement = element.querySelector('.requirement-status');
        const detailsElement = element.querySelector('.requirement-details');
        
        if (statusElement) {
            statusElement.className = `requirement-status ${requirement.status}`;
            statusElement.textContent = this.getStatusIcon(requirement.status);
        }
        
        if (detailsElement) {
            let details = requirement.details;
            if (requirement.version) {
                details += ` (${requirement.version} detected)`;
            }
            detailsElement.textContent = details;
        }
    }

    // Mock system check methods (in real implementation, these would call backend APIs)
    async checkPython() {
        await this.delay(1000);
        // Simulate check
        const hasCorrectVersion = Math.random() > 0.2; // 80% chance of success
        return {
            status: hasCorrectVersion ? 'passed' : 'failed',
            version: hasCorrectVersion ? 'Python 3.11.5' : 'Python 3.9.0',
            details: hasCorrectVersion ? 'Python 3.11+ detected' : 'Python 3.11+ required, found older version'
        };
    }

    async checkNodeJS() {
        await this.delay(800);
        const hasCorrectVersion = Math.random() > 0.3; // 70% chance of success
        return {
            status: hasCorrectVersion ? 'passed' : 'failed',
            version: hasCorrectVersion ? 'Node.js 18.17.0' : 'Node.js 16.14.0',
            details: hasCorrectVersion ? 'Node.js 18+ detected' : 'Node.js 18+ required, found older version'
        };
    }

    async checkGit() {
        await this.delay(600);
        const hasGit = Math.random() > 0.1; // 90% chance of success
        return {
            status: hasGit ? 'passed' : 'failed',
            version: hasGit ? 'Git 2.41.0' : undefined,
            details: hasGit ? 'Git is available' : 'Git not found in PATH'
        };
    }

    async checkOllama() {
        await this.delay(700);
        const hasOllama = Math.random() > 0.5; // 50% chance of success (optional)
        return {
            status: hasOllama ? 'passed' : 'warning',
            version: hasOllama ? 'Ollama 0.1.7' : undefined,
            details: hasOllama ? 'Ollama is available' : 'Ollama not found - AI chat will be limited'
        };
    }

    async checkDiskSpace() {
        await this.delay(500);
        const availableGB = Math.floor(Math.random() * 50) + 5; // 5-55 GB
        const hasEnough = availableGB >= 10;
        return {
            status: hasEnough ? 'passed' : 'failed',
            details: `${availableGB}GB available (10GB required)`
        };
    }

    async checkMemory() {
        await this.delay(400);
        const memoryGB = Math.floor(Math.random() * 24) + 4; // 4-28 GB
        const hasEnough = memoryGB >= 8;
        return {
            status: hasEnough ? 'passed' : 'warning',
            details: `${memoryGB}GB total memory (8GB recommended)`
        };
    }

    async displaySystemInformation() {
        const systemDetails = document.getElementById('system-details');
        if (!systemDetails) return;
        
        // Simulate gathering system info
        this.systemInfo = {
            os: this.detectOperatingSystem(),
            cpu: 'Intel Core i7-9700K @ 3.60GHz (8 cores)',
            memory: '16 GB DDR4',
            gpu: 'NVIDIA GeForce RTX 3070',
            storage: '512 GB NVMe SSD'
        };
        
        systemDetails.innerHTML = Object.entries(this.systemInfo).map(([key, value]) => `
            <div class="system-detail">
                <div class="detail-label">${key.toUpperCase()}</div>
                <div class="detail-value">${value}</div>
            </div>
        `).join('');
    }

    detectOperatingSystem() {
        if (typeof window !== 'undefined' && window.navigator) {
            const platform = window.navigator.platform.toLowerCase();
            const userAgent = window.navigator.userAgent.toLowerCase();
            
            if (platform.includes('win') || userAgent.includes('windows')) {
                return 'Windows 11';
            } else if (platform.includes('mac') || userAgent.includes('mac')) {
                return 'macOS Sonoma';
            } else if (userAgent.includes('linux')) {
                return 'Ubuntu 22.04 LTS';
            }
        }
        return 'Unknown OS';
    }

    validateRequirements() {
        const failedRequired = this.requirements.filter(req => 
            req.required && req.status === 'failed'
        );
        
        return failedRequired.length === 0;
    }

    showDependencyModal() {
        const modal = document.getElementById('dependency-modal');
        const dependencyList = document.getElementById('dependency-download-list');
        
        if (!modal || !dependencyList) return;
        
        // Get failed requirements
        const failedRequirements = this.requirements.filter(req => 
            req.status === 'failed' || req.status === 'warning'
        );
        
        dependencyList.innerHTML = failedRequirements.map(req => `
            <div class="dependency-item">
                <div class="dependency-name">${req.name}</div>
                <div class="dependency-size">Auto-install</div>
            </div>
        `).join('');
        
        this.showModal('dependency-modal');
    }

    skipDependencies() {
        this.hideModal('dependency-modal');
        this.nextStep();
    }

    async downloadDependencies() {
        const progressFill = document.getElementById('dependency-progress-fill');
        const progressText = document.getElementById('dependency-progress-text');
        const downloadBtn = document.getElementById('download-dependencies');
        
        if (downloadBtn) downloadBtn.disabled = true;
        
        try {
            // Simulate dependency download
            for (let i = 0; i <= 100; i += 10) {
                if (progressFill) progressFill.style.width = `${i}%`;
                if (progressText) progressText.textContent = `Downloading dependencies... ${i}%`;
                await this.delay(200);
            }
            
            // Update requirements status
            this.requirements.forEach(req => {
                if (req.status === 'failed' || req.status === 'warning') {
                    req.status = 'passed';
                    req.details = 'Automatically installed';
                }
            });
            
            this.hideModal('dependency-modal');
            this.displayRequirements(); // Refresh display
            this.nextStep();
            
        } catch (error) {
            this.showError('Failed to download dependencies: ' + error.message);
        } finally {
            if (downloadBtn) downloadBtn.disabled = false;
        }
    }

    initializeConfiguration() {
        this.updateRequiredSpace();
        this.checkAvailableSpace();
        this.validateAllPorts();
    }

    browsePath() {
        // In a real implementation, this would open a directory picker
        // For demo purposes, we'll simulate it
        const paths = [
            'C:\\Program Files\\DinoAir',
            'C:\\DinoAir',
            'D:\\Applications\\DinoAir',
            '/Applications/DinoAir',
            '/opt/dinoair',
            '/home/user/dinoair'
        ];
        
        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        const installPathInput = document.getElementById('install-path');
        if (installPathInput) {
            installPathInput.value = randomPath;
        }
        
        this.validateInstallPath();
        this.checkAvailableSpace();
    }

    updateRequiredSpace() {
        const components = [
            { id: 'dinoair-core', size: 0.5, required: true },
            { id: 'ollama-component', size: 1.2 },
            { id: 'comfyui-component', size: 0.8 },
            { id: 'models-component', size: 3.0 },
            { id: 'development-tools', size: 0.2 }
        ];
        
        let totalSize = 0;
        components.forEach(component => {
            const checkbox = document.getElementById(component.id);
            if (checkbox && (checkbox.checked || component.required)) {
                totalSize += component.size;
            }
        });
        
        const totalSizeElement = document.getElementById('required-space');
        if (totalSizeElement) {
            totalSizeElement.textContent = `~${totalSize.toFixed(1)} GB`;
        }
        
        this.installationData.requiredSpace = totalSize;
    }

    async checkAvailableSpace() {
        // Simulate checking available space
        const fakeAvailableSpace = Math.floor(Math.random() * 100) + 20; // 20-120 GB
        
        const availableSpaceElement = document.getElementById('available-space');
        if (availableSpaceElement) {
            availableSpaceElement.textContent = `${fakeAvailableSpace} GB`;
            
            // Color code based on available space
            if (fakeAvailableSpace < this.installationData.requiredSpace) {
                availableSpaceElement.style.color = 'var(--error-color)';
            } else if (fakeAvailableSpace < this.installationData.requiredSpace * 2) {
                availableSpaceElement.style.color = 'var(--warning-color)';
            } else {
                availableSpaceElement.style.color = 'var(--success-color)';
            }
        }
        
        this.installationData.availableSpace = fakeAvailableSpace;
    }

    validateInstallPath() {
        const installPathInput = document.getElementById('install-path');
        if (!installPathInput) return true;
        
        const path = installPathInput.value.trim();
        const isValid = path.length > 0 && !path.includes('..') && path !== '/';
        
        if (isValid) {
            installPathInput.style.borderColor = 'var(--success-color)';
        } else {
            installPathInput.style.borderColor = 'var(--error-color)';
        }
        
        return isValid;
    }

    validatePort(event) {
        const input = event.target;
        const port = parseInt(input.value);
        const isValid = port >= 1024 && port <= 65535;
        
        if (isValid) {
            input.style.borderColor = 'var(--success-color)';
        } else {
            input.style.borderColor = 'var(--error-color)';
        }
        
        return isValid;
    }

    validateAllPorts() {
        const portInputs = document.querySelectorAll('input[type="number"]');
        let allValid = true;
        
        portInputs.forEach(input => {
            const port = parseInt(input.value);
            const isValid = port >= 1024 && port <= 65535;
            if (!isValid) allValid = false;
        });
        
        return allValid;
    }

    updateInstallationMode() {
        const selectedMode = document.querySelector('input[name="install-mode"]:checked');
        if (selectedMode) {
            this.installationData.installMode = selectedMode.value;
        }
    }

    validateConfiguration() {
        const pathValid = this.validateInstallPath();
        const portsValid = this.validateAllPorts();
        const spaceValid = this.installationData.availableSpace >= this.installationData.requiredSpace;
        
        if (!pathValid) {
            this.showError('Please select a valid installation path.');
            return false;
        }
        
        if (!portsValid) {
            this.showError('Please ensure all port numbers are between 1024 and 65535.');
            return false;
        }
        
        if (!spaceValid) {
            this.showError('Insufficient disk space for installation.');
            return false;
        }
        
        return true;
    }

    async startInstallation() {
        this.isInstalling = true;
        this.installationStartTime = Date.now();
        this.nextStep(); // Move to installation step
        
        // Update status
        const statusElement = document.getElementById('installer-status');
        if (statusElement) {
            statusElement.textContent = 'Installing DinoAir...';
        }
        
        this.updateNavigationButtons();
        
        try {
            await this.runInstallationPhases();
            this.showCompletionScreen(true);
        } catch (error) {
            this.showCompletionScreen(false, error.message);
        } finally {
            this.isInstalling = false;
        }
    }

    async runInstallationPhases() {
        const totalPhases = this.installationPhases.length;
        
        for (let i = 0; i < totalPhases; i++) {
            const phase = this.installationPhases[i];
            
            // Update current task
            this.updateCurrentTask(phase.name, phase.description);
            
            // Mark phase as active
            this.updatePhaseStatus(phase.id, 'active');
            
            // Run phase with progress updates
            await this.runInstallationPhase(phase, i, totalPhases);
            
            // Mark phase as completed
            this.updatePhaseStatus(phase.id, 'completed');
            
            // Update overall progress
            const overallProgress = ((i + 1) / totalPhases) * 100;
            this.updateOverallProgress(overallProgress);
        }
    }

    async runInstallationPhase(phase, phaseIndex, totalPhases) {
        const steps = this.getPhaseSteps(phase.id);
        const totalSteps = steps.length;
        
        for (let i = 0; i < totalSteps; i++) {
            const step = steps[i];
            
            // Log the step
            this.addLogEntry('info', `${phase.name}: ${step.description}`);
            
            try {
                // Simulate step execution
                await this.executeInstallationStep(step);
                
                // Update phase progress
                const phaseProgress = ((i + 1) / totalSteps) * 100;
                this.updatePhaseProgress(phase.id, phaseProgress);
                
                // Update task progress
                this.updateTaskProgress(phaseProgress);
                
                this.addLogEntry('success', `${step.description} completed`);
                
            } catch (error) {
                this.addLogEntry('error', `${step.description} failed: ${error.message}`);
                throw error;
            }
        }
    }

    getPhaseSteps(phaseId) {
        const stepDefinitions = {
            prerequisites: [
                { description: 'Checking system requirements', duration: 2000 },
                { description: 'Installing Python dependencies', duration: 5000 },
                { description: 'Installing Node.js dependencies', duration: 3000 },
                { description: 'Configuring environment', duration: 1000 }
            ],
            core: [
                { description: 'Downloading DinoAir core', duration: 8000 },
                { description: 'Extracting application files', duration: 3000 },
                { description: 'Setting up directory structure', duration: 1000 },
                { description: 'Configuring application settings', duration: 2000 }
            ],
            ollama: [
                { description: 'Downloading Ollama service', duration: 6000 },
                { description: 'Installing Ollama runtime', duration: 4000 },
                { description: 'Configuring Ollama service', duration: 2000 }
            ],
            comfyui: [
                { description: 'Cloning ComfyUI repository', duration: 5000 },
                { description: 'Installing ComfyUI dependencies', duration: 8000 },
                { description: 'Copying custom workflows', duration: 2000 },
                { description: 'Configuring ComfyUI settings', duration: 1000 }
            ],
            models: [
                { description: 'Downloading base AI models', duration: 15000 },
                { description: 'Downloading image generation models', duration: 20000 },
                { description: 'Verifying model integrity', duration: 3000 },
                { description: 'Optimizing model cache', duration: 2000 }
            ],
            configuration: [
                { description: 'Creating configuration files', duration: 1000 },
                { description: 'Setting up service scripts', duration: 2000 },
                { description: 'Configuring auto-start', duration: 1000 },
                { description: 'Running final verification', duration: 3000 }
            ]
        };
        
        return stepDefinitions[phaseId] || [];
    }

    async executeInstallationStep(step) {
        // Simulate step execution with realistic timing
        const duration = step.duration || 1000;
        const progressInterval = 50; // Update every 50ms
        const progressSteps = duration / progressInterval;
        
        for (let i = 0; i <= progressSteps; i++) {
            await this.delay(progressInterval);
            
            // Simulate potential failures (5% chance)
            if (Math.random() < 0.01) { // Reduced to 1% for better demo experience
                throw new Error('Simulated installation error');
            }
            
            // Update download speed and other stats
            this.updateInstallationStats();
        }
    }

    updateCurrentTask(title, description) {
        const titleElement = document.getElementById('current-task-title');
        const descriptionElement = document.getElementById('current-task-description');
        
        if (titleElement) titleElement.textContent = title;
        if (descriptionElement) descriptionElement.textContent = description;
    }

    updatePhaseStatus(phaseId, status) {
        const phase = document.querySelector(`[data-phase="${phaseId}"]`);
        if (!phase) return;
        
        // Remove all status classes
        phase.classList.remove('pending', 'active', 'completed', 'error');
        
        // Add new status class
        phase.classList.add(status);
        
        // Update status text
        const statusElement = phase.querySelector('.phase-status');
        if (statusElement) {
            statusElement.className = `phase-status ${status}`;
            statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    updatePhaseProgress(phaseId, progress) {
        // Store progress for the phase
        const phase = this.installationPhases.find(p => p.id === phaseId);
        if (phase) {
            phase.progress = progress;
        }
    }

    updateTaskProgress(progress) {
        const taskProgressFill = document.getElementById('task-progress-fill');
        const taskPercentage = document.getElementById('task-percentage');
        
        if (taskProgressFill) {
            taskProgressFill.style.width = `${progress}%`;
        }
        
        if (taskPercentage) {
            taskPercentage.textContent = `${Math.round(progress)}%`;
        }
    }

    updateOverallProgress(progress) {
        const overallProgressFill = document.getElementById('overall-progress-fill');
        const overallPercentage = document.getElementById('overall-percentage');
        
        if (overallProgressFill) {
            overallProgressFill.style.width = `${progress}%`;
        }
        
        if (overallPercentage) {
            overallPercentage.textContent = `${Math.round(progress)}%`;
        }
    }

    updateInstallationStats() {
        // Update elapsed time
        if (this.installationStartTime) {
            const elapsed = Date.now() - this.installationStartTime;
            const elapsedElement = document.getElementById('elapsed-time');
            if (elapsedElement) {
                elapsedElement.textContent = this.formatDuration(elapsed);
            }
        }
        
        // Update download speed (simulated)
        const speed = (Math.random() * 20 + 5).toFixed(1); // 5-25 MB/s
        const speedElement = document.getElementById('download-speed');
        if (speedElement) {
            speedElement.textContent = `${speed} MB/s`;
        }
        
        // Update downloaded size (simulated)
        const downloaded = (Math.random() * 500 + 100).toFixed(0); // 100-600 MB
        const downloadedElement = document.getElementById('downloaded-size');
        if (downloadedElement) {
            downloadedElement.textContent = `${downloaded} MB`;
        }
        
        // Update remaining time (simulated)
        const remaining = Math.floor(Math.random() * 600 + 60); // 1-10 minutes
        const remainingElement = document.getElementById('remaining-time');
        if (remainingElement) {
            remainingElement.textContent = this.formatDuration(remaining * 1000);
        }
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
    }

    addLogEntry(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            type,
            message
        };
        
        this.installationLog.push(logEntry);
        
        // Add to UI
        const logContainer = document.getElementById('installation-log');
        if (logContainer) {
            const entryElement = document.createElement('div');
            entryElement.className = `log-entry ${type}`;
            entryElement.textContent = `[${timestamp}] ${message}`;
            logContainer.appendChild(entryElement);
            
            // Auto-scroll to bottom
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    toggleInstallationLog() {
        const logContainer = document.getElementById('installation-log');
        const toggleIcon = document.querySelector('.toggle-icon');
        const toggleText = document.querySelector('.toggle-text');
        
        if (logContainer && toggleIcon && toggleText) {
            logContainer.classList.toggle('collapsed');
            
            if (logContainer.classList.contains('collapsed')) {
                toggleText.textContent = 'Show Details';
                toggleIcon.textContent = '▼';
            } else {
                toggleText.textContent = 'Hide Details';
                toggleIcon.textContent = '▲';
            }
        }
    }

    cancelInstallation() {
        if (!this.isInstalling) return;
        
        this.showConfirmation(
            'Cancel Installation',
            'Are you sure you want to cancel the installation? All progress will be lost.',
            () => {
                this.isInstalling = false;
                this.addLogEntry('warning', 'Installation cancelled by user');
                this.showCompletionScreen(false, 'Installation was cancelled by the user.');
            }
        );
    }

    retryInstallation() {
        this.hideModal('error-modal');
        this.isInstalling = false;
        this.currentStep = 3; // Go back to configuration
        this.updateStepDisplay();
        this.updateProgress();
        this.updateNavigationButtons();
    }

    showDetailedLogs() {
        // In a real implementation, this would open a detailed log viewer
        const logText = this.installationLog.map(entry => 
            `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
        ).join('\n');
        
        // Create a simple text area modal for logs
        const textarea = document.createElement('textarea');
        textarea.value = logText;
        textarea.style.cssText = `
            width: 100%;
            height: 400px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
            background: #1a1a1a;
            color: #ffffff;
            border: none;
            padding: 16px;
            resize: none;
        `;
        textarea.readOnly = true;
        
        // Replace modal content temporarily
        const modalBody = document.querySelector('#error-modal .modal-body');
        if (modalBody) {
            const originalContent = modalBody.innerHTML;
            modalBody.innerHTML = '';
            modalBody.appendChild(textarea);
            
            // Restore original content when modal is closed
            const restoreContent = () => {
                modalBody.innerHTML = originalContent;
                document.removeEventListener('click', restoreContent);
            };
            
            // Add click listener to modal overlay to restore content
            setTimeout(() => {
                document.addEventListener('click', restoreContent);
            }, 100);
        }
    }

    showCompletionScreen(success = true, errorMessage = null) {
        this.currentStep = 5;
        this.updateStepDisplay();
        this.updateProgress();
        this.updateNavigationButtons();
        
        const completionContent = document.getElementById('completion-content');
        if (!completionContent) return;
        
        if (success) {
            completionContent.innerHTML = this.createSuccessContent();
        } else {
            completionContent.innerHTML = this.createErrorContent(errorMessage);
        }
        
        // Update status
        const statusElement = document.getElementById('installer-status');
        if (statusElement) {
            statusElement.textContent = success ? 'Installation completed!' : 'Installation failed';
        }
    }

    createSuccessContent() {
        const installPath = document.getElementById('install-path')?.value || '/opt/dinoair';
        const selectedComponents = this.getSelectedComponents();
        const installMode = this.installationData.installMode || 'express';
        const duration = this.installationStartTime ? 
            this.formatDuration(Date.now() - this.installationStartTime) : 'Unknown';
        
        return `
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <h2>Installation Complete!</h2>
                <p class="lead">DinoAir has been successfully installed and is ready to use.</p>
                
                <div class="completion-details">
                    <h3>Installation Summary</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Installation Path:</span>
                            <span class="detail-value">${installPath}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Installation Mode:</span>
                            <span class="detail-value">${installMode.charAt(0).toUpperCase() + installMode.slice(1)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Components Installed:</span>
                            <span class="detail-value">${selectedComponents.length} components</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Installation Time:</span>
                            <span class="detail-value">${duration}</span>
                        </div>
                    </div>
                </div>
                
                <div class="action-list">
                    <h3>Next Steps</h3>
                    <ul>
                        <li>Launch DinoAir to start using AI chat and image generation</li>
                        <li>Explore the included tutorials and documentation</li>
                        <li>Join our community for tips, support, and updates</li>
                        <li>Configure additional AI models for enhanced capabilities</li>
                    </ul>
                </div>
            </div>
        `;
    }

    createErrorContent(errorMessage) {
        return `
            <div class="error-content">
                <div class="error-icon">❌</div>
                <h2>Installation Failed</h2>
                <p class="lead">We encountered an error during the installation process.</p>
                
                <div class="completion-details">
                    <h3>Error Details</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Error Message:</span>
                            <span class="detail-value">${errorMessage || 'Unknown error occurred'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Installation Time:</span>
                            <span class="detail-value">${this.installationStartTime ? 
                                this.formatDuration(Date.now() - this.installationStartTime) : 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="action-list">
                    <h3>Troubleshooting Steps</h3>
                    <ul>
                        <li>Check your internet connection and try again</li>
                        <li>Ensure you have sufficient disk space and permissions</li>
                        <li>Review the installation log for detailed error information</li>
                        <li>Contact support if the problem persists</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getSelectedComponents() {
        const components = ['dinoair-core', 'ollama-component', 'comfyui-component', 'models-component', 'development-tools'];
        return components.filter(id => {
            const checkbox = document.getElementById(id);
            return checkbox && checkbox.checked;
        });
    }

    finishInstallation() {
        // In a real implementation, this would launch the application
        window.location.href = 'http://localhost:3000';
    }

    handleCancel() {
        if (this.isInstalling) {
            this.cancelInstallation();
        } else {
            this.showConfirmation(
                'Exit Installer',
                'Are you sure you want to exit the installer?',
                () => {
                    window.close();
                }
            );
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            
            // Focus management
            const focusableElements = modal.querySelectorAll('button, input, select, textarea');
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showConfirmation(title, message, onConfirm) {
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-ok');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // Set up one-time confirm handler
        if (confirmBtn) {
            const handler = () => {
                this.hideModal('confirm-modal');
                onConfirm();
                confirmBtn.removeEventListener('click', handler);
            };
            confirmBtn.addEventListener('click', handler);
        }
        
        this.showModal('confirm-modal');
    }

    confirmAction() {
        // This method is called when the confirm button is clicked
        // The actual action is handled by the showConfirmation method
        this.hideModal('confirm-modal');
    }

    showError(message) {
        const errorContent = document.getElementById('error-content');
        if (errorContent) {
            errorContent.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                </div>
            `;
        }
        
        this.showModal('error-modal');
    }

    showLoadingOverlay(message, duration = null) {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        
        if (text) text.textContent = message;
        if (overlay) overlay.classList.add('active');
        
        if (duration) {
            setTimeout(() => this.hideLoadingOverlay(), duration);
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the installer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ModernInstaller();
});