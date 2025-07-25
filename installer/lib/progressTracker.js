/**
 * Progress Tracker Module
 * Provides enhanced progress tracking with time estimation for the DinoAir CLI installer
 */

const chalk = require('chalk');
const cliProgress = require('cli-progress');

class ProgressTracker {
  constructor(options = {}) {
    this.logger = options.logger;
    this.verbose = options.verbose || false;
    
    // Progress tracking state
    this.totalSteps = 0;
    this.currentStep = 0;
    this.totalWeight = 0;
    this.completedWeight = 0;
    this.startTime = null;
    this.stepStartTime = null;
    this.stepTimes = [];
    this.estimatedTimes = new Map();
    
    // Progress bar configuration
    this.progressBar = new cliProgress.SingleBar({
      format: this.getProgressFormat(),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true
    });
    
    this.isActive = false;
  }

  /**
   * Get progress bar format string with ETA
   */
  getProgressFormat() {
    return chalk.cyan('Progress') + ' |{bar}| {percentage}% | ETA: {eta_formatted} | {value}/{total} | {step}';
  }

  /**
   * Initialize progress tracking with installation steps
   * @param {Array} steps - Array of installation steps with name and weight
   */
  initialize(steps) {
    this.totalSteps = steps.length;
    this.totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
    this.completedWeight = 0;
    this.currentStep = 0;
    this.startTime = Date.now();
    this.stepTimes = [];
    this.estimatedTimes.clear();
    
    // Pre-calculate estimated times based on step weights
    this.calculateInitialEstimates(steps);
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Progress tracker initialized with ${this.totalSteps} steps, total weight: ${this.totalWeight}`);
    }
  }

  /**
   * Calculate initial time estimates based on step weights and historical data
   * @param {Array} steps - Installation steps
   */
  calculateInitialEstimates(steps) {
    // Base time estimates per weight unit (in seconds)
    const baseTimePerWeight = {
      'Checking prerequisites': 2,
      'Creating directories': 1,
      'Copying core files': 3,
      'Downloading models': 8, // Longer for downloads
      'Installing dependencies': 5,
      'Configuring DinoAir': 2,
      'Creating shortcuts': 1
    };

    steps.forEach(step => {
      const baseTime = baseTimePerWeight[step.name] || 3;
      const estimatedTime = baseTime * (step.weight || 1);
      this.estimatedTimes.set(step.name, estimatedTime * 1000); // Convert to milliseconds
    });
  }

  /**
   * Start progress tracking
   */
  start() {
    if (this.isActive) return;
    
    this.progressBar.start(this.totalWeight, 0, {
      step: 'Initializing...',
      eta_formatted: this.formatTime(this.getTotalEstimatedTime())
    });
    
    this.isActive = true;
    
    if (this.verbose && this.logger) {
      this.logger.debug('Progress tracking started');
    }
  }

  /**
   * Start a new step
   * @param {string} stepName - Name of the step
   * @param {number} stepWeight - Weight of the step
   */
  startStep(stepName, stepWeight = 1) {
    if (!this.isActive) this.start();
    
    this.currentStep++;
    this.stepStartTime = Date.now();
    
    // Update progress bar
    this.progressBar.update(this.completedWeight, {
      step: `${stepName} (${this.currentStep}/${this.totalSteps})`,
      eta_formatted: this.formatTime(this.getEstimatedTimeRemaining())
    });
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Started step ${this.currentStep}/${this.totalSteps}: ${stepName} (weight: ${stepWeight})`);
    }
  }

  /**
   * Update progress within a step
   * @param {number} stepProgress - Progress within current step (0-1)
   * @param {string} substep - Optional substep description
   */
  updateStep(stepProgress = 0, substep = '') {
    if (!this.isActive || !this.stepStartTime) return;
    
    const currentStepWeight = this.getCurrentStepWeight();
    const stepProgressWeight = currentStepWeight * Math.min(Math.max(stepProgress, 0), 1);
    const totalProgress = this.completedWeight + stepProgressWeight;
    
    const stepName = this.getCurrentStepName();
    const displayName = substep ? `${stepName} - ${substep}` : stepName;
    
    this.progressBar.update(totalProgress, {
      step: `${displayName} (${this.currentStep}/${this.totalSteps})`,
      eta_formatted: this.formatTime(this.getEstimatedTimeRemaining())
    });
  }

  /**
   * Complete current step
   * @param {string} stepName - Name of the completed step
   * @param {number} stepWeight - Weight of the completed step
   */
  completeStep(stepName, stepWeight = 1) {
    if (!this.isActive || !this.stepStartTime) return;
    
    const stepDuration = Date.now() - this.stepStartTime;
    this.stepTimes.push({
      name: stepName,
      weight: stepWeight,
      duration: stepDuration,
      timestamp: Date.now()
    });
    
    this.completedWeight += stepWeight;
    
    // Update estimated time for this step type based on actual duration
    this.updateEstimate(stepName, stepDuration);
    
    this.progressBar.update(this.completedWeight, {
      step: `Completed: ${stepName}`,
      eta_formatted: this.formatTime(this.getEstimatedTimeRemaining())
    });
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Completed step: ${stepName} in ${this.formatTime(stepDuration)}`);
    }
    
    this.stepStartTime = null;
  }

  /**
   * Complete all progress tracking
   */
  complete() {
    if (!this.isActive) return;
    
    const totalDuration = Date.now() - this.startTime;
    
    this.progressBar.update(this.totalWeight, {
      step: 'Installation Complete!',
      eta_formatted: '00:00'
    });
    
    this.progressBar.stop();
    this.isActive = false;
    
    if (this.logger) {
      this.logger.success(`Installation completed in ${this.formatTime(totalDuration)}`);
    }
    
    if (this.verbose && this.logger) {
      this.logPerformanceStats();
    }
  }

  /**
   * Handle error and stop progress tracking
   * @param {Error} error - The error that occurred
   */
  error(error) {
    if (this.isActive) {
      this.progressBar.stop();
      this.isActive = false;
    }
    
    if (this.logger) {
      this.logger.error(`Installation failed: ${error.message}`);
    }
  }

  /**
   * Get estimated time remaining
   * @returns {number} Estimated time in milliseconds
   */
  getEstimatedTimeRemaining() {
    if (!this.startTime || this.completedWeight === 0) {
      return this.getTotalEstimatedTime();
    }
    
    const elapsed = Date.now() - this.startTime;
    const progress = this.completedWeight / this.totalWeight;
    const estimatedTotal = elapsed / progress;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return remaining;
  }

  /**
   * Get total estimated time for all steps
   * @returns {number} Total estimated time in milliseconds
   */
  getTotalEstimatedTime() {
    let total = 0;
    for (const time of this.estimatedTimes.values()) {
      total += time;
    }
    return total;
  }

  /**
   * Update time estimate for a step type
   * @param {string} stepName - Name of the step
   * @param {number} actualDuration - Actual duration in milliseconds
   */
  updateEstimate(stepName, actualDuration) {
    const currentEstimate = this.estimatedTimes.get(stepName) || actualDuration;
    // Use weighted average: 70% current estimate, 30% actual duration
    const newEstimate = (currentEstimate * 0.7) + (actualDuration * 0.3);
    this.estimatedTimes.set(stepName, newEstimate);
  }

  /**
   * Get current step weight
   * @returns {number} Weight of current step
   */
  getCurrentStepWeight() {
    // This would need to be passed from the installer
    return 1; // Default weight
  }

  /**
   * Get current step name
   * @returns {string} Name of current step
   */
  getCurrentStepName() {
    return `Step ${this.currentStep}`;
  }

  /**
   * Format time duration for display
   * @param {number} milliseconds - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTime(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '00:00';
    
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Log performance statistics
   */
  logPerformanceStats() {
    if (!this.logger) return;
    
    this.logger.debug('\n=== Installation Performance Stats ===');
    this.stepTimes.forEach((step, index) => {
      this.logger.debug(`${index + 1}. ${step.name}: ${this.formatTime(step.duration)} (weight: ${step.weight})`);
    });
    
    const totalTime = Date.now() - this.startTime;
    this.logger.debug(`Total installation time: ${this.formatTime(totalTime)}`);
    this.logger.debug('=====================================\n');
  }

  /**
   * Get current progress percentage
   * @returns {number} Progress percentage (0-100)
   */
  getProgressPercentage() {
    if (this.totalWeight === 0) return 0;
    return Math.round((this.completedWeight / this.totalWeight) * 100);
  }

  /**
   * Check if progress tracking is active
   * @returns {boolean} True if active
   */
  isTracking() {
    return this.isActive;
  }
}

module.exports = ProgressTracker;