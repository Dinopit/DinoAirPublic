/**
 * Simple Alerting Module
 * Basic alerting functionality for development
 */

class AlertingSystem {
  constructor() {
    this.alerts = [];
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  alert(message, level = 'info') {
    if (!this.enabled) return;
    
    const alert = {
      id: Date.now(),
      message,
      level,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    console.log(`[ALERT:${level.toUpperCase()}] ${message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getAlerts() {
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

const alertingSystem = new AlertingSystem();

module.exports = { alertingSystem };