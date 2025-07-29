/**
 * DinoAir PWA Manager
 * Handles service worker registration, PWA installation, and offline functionality
 */

class PWAManager {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    this.installButton = null;
    this.notificationPermission = 'default';

    this.init();
  }

  /**
   * Initialize PWA functionality
   */
  async init() {
    console.log('[PWA] Initializing PWA Manager...');

    // Register service worker
    await this.registerServiceWorker();

    // Setup PWA installation
    this.setupInstallPrompt();

    // Setup offline/online detection
    this.setupConnectionHandling();

    // Setup push notifications
    await this.setupPushNotifications();

    // Setup background sync
    this.setupBackgroundSync();

    // Setup periodic sync
    this.setupPeriodicSync();

    console.log('[PWA] PWA Manager initialized successfully');
  }

  /**
   * Register the service worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return;
    }

    try {
      console.log('[PWA] Registering service worker...');

      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service worker registered:', this.swRegistration.scope);

      // Handle service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('[PWA] Service worker update found');
        this.handleServiceWorkerUpdate();
      });

      // Check for existing service worker
      if (this.swRegistration.active) {
        console.log('[PWA] Service worker is active');
      }

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', event => {
        this.handleServiceWorkerMessage(event);
      });
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  }

  /**
   * Handle service worker updates
   */
  handleServiceWorkerUpdate() {
    const newWorker = this.swRegistration.installing;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker is available
        this.showUpdateNotification();
      }
    });
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'pwa-update-banner';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span>🦕 DinoAir has been updated!</span>
        <button onclick="window.pwaManager.applyUpdate()" class="update-btn">Refresh</button>
        <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">×</button>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-update-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #2563eb;
        color: white;
        padding: 1rem;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .update-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        max-width: 600px;
        margin: 0 auto;
      }
      .update-btn {
        background: white;
        color: #2563eb;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 600;
      }
      .dismiss-btn {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(updateBanner);
  }

  /**
   * Apply service worker update
   */
  applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Setup PWA installation prompt
   */
  setupInstallPrompt() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', event => {
      console.log('[PWA] Install prompt available');

      // Prevent the mini-infobar from appearing
      event.preventDefault();

      // Store the event for later use
      this.deferredPrompt = event;

      // Show custom install button
      this.showInstallButton();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.hideInstallButton();
      this.deferredPrompt = null;

      // Track installation
      this.trackEvent('pwa_installed');
    });
  }

  /**
   * Show install button
   */
  showInstallButton() {
    // Remove existing button
    this.hideInstallButton();

    this.installButton = document.createElement('button');
    this.installButton.className = 'pwa-install-btn';
    this.installButton.innerHTML = '📱 Install DinoAir';
    this.installButton.onclick = () => this.promptInstall();

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2563eb;
        color: white;
        border: none;
        padding: 1rem 1.5rem;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
        z-index: 1000;
        transition: all 0.3s ease;
      }
      .pwa-install-btn:hover {
        background: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(37, 99, 235, 0.4);
      }
      @media (max-width: 768px) {
        .pwa-install-btn {
          bottom: 80px;
          right: 15px;
          padding: 0.8rem 1.2rem;
          font-size: 0.9rem;
        }
      }
    `;

    if (!document.querySelector('style[data-pwa-install]')) {
      style.setAttribute('data-pwa-install', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(this.installButton);
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.remove();
      this.installButton = null;
    }
  }

  /**
   * Prompt user to install PWA
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;

      console.log('[PWA] Install prompt outcome:', outcome);

      if (outcome === 'accepted') {
        this.trackEvent('pwa_install_accepted');
      } else {
        this.trackEvent('pwa_install_dismissed');
      }

      // Clear the prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
    }
  }

  /**
   * Setup connection handling
   */
  setupConnectionHandling() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[PWA] Connection restored');
      this.isOnline = true;
      this.showConnectionStatus('online');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Connection lost');
      this.isOnline = false;
      this.showConnectionStatus('offline');
    });
  }

  /**
   * Show connection status
   */
  showConnectionStatus(status) {
    // Remove existing status
    const existing = document.querySelector('.pwa-connection-status');
    if (existing) { existing.remove(); }

    const statusEl = document.createElement('div');
    statusEl.className = 'pwa-connection-status';

    if (status === 'online') {
      statusEl.innerHTML = '✅ Back online';
      statusEl.style.background = '#10b981';
    } else {
      statusEl.innerHTML = '📡 You\'re offline';
      statusEl.style.background = '#ef4444';
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-connection-status {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        padding: 0.8rem 1.5rem;
        border-radius: 25px;
        font-weight: 600;
        z-index: 10000;
        animation: slideDown 0.3s ease;
      }
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); }
        to { transform: translateX(-50%) translateY(0); }
      }
    `;

    if (!document.querySelector('style[data-pwa-connection]')) {
      style.setAttribute('data-pwa-connection', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(statusEl);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (statusEl.parentNode) {
        statusEl.remove();
      }
    }, 3000);
  }

  /**
   * Setup push notifications
   */
  async setupPushNotifications() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.warn('[PWA] Push notifications not supported');
      return;
    }

    // Check current permission
    this.notificationPermission = Notification.permission;

    if (this.notificationPermission === 'default') {
      // Don't request permission immediately, wait for user interaction
      console.log('[PWA] Notification permission not requested yet');
    } else if (this.notificationPermission === 'granted') {
      console.log('[PWA] Notification permission granted');
      await this.subscribeToPush();
    } else {
      console.log('[PWA] Notification permission denied');
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;

      if (permission === 'granted') {
        console.log('[PWA] Notification permission granted');
        await this.subscribeToPush();
        return true;
      }
      console.log('[PWA] Notification permission denied');
      return false;
    } catch (error) {
      console.error('[PWA] Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    if (!this.swRegistration) {
      console.warn('[PWA] No service worker registration for push subscription');
      return;
    }

    try {
      // Check if already subscribed
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log('[PWA] Already subscribed to push notifications');
        return existingSubscription;
      }

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9LdNnC_NNNNNNNNNNNNNNNNNNNNNNNN' // Replace with your VAPID public key
        )
      });

      console.log('[PWA] Subscribed to push notifications');

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('[PWA] Error subscribing to push notifications:', error);
    }
  }

  /**
   * Send push subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      if (response.ok) {
        console.log('[PWA] Subscription sent to server');
      } else {
        console.error('[PWA] Failed to send subscription to server');
      }
    } catch (error) {
      console.error('[PWA] Error sending subscription to server:', error);
    }
  }

  /**
   * Setup background sync
   */
  setupBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[PWA] Background sync not supported');
      return;
    }

    console.log('[PWA] Background sync available');
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync(tag) {
    if (!this.swRegistration) {
      console.warn('[PWA] No service worker registration for background sync');
      return;
    }

    try {
      await this.swRegistration.sync.register(tag);
      console.log('[PWA] Background sync registered:', tag);
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
    }
  }

  /**
   * Setup periodic sync
   */
  async setupPeriodicSync() {
    if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('[PWA] Periodic sync not supported');
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });

      if (status.state === 'granted') {
        await this.swRegistration.periodicSync.register('system-health-check', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        });
        console.log('[PWA] Periodic sync registered');
      }
    } catch (error) {
      console.error('[PWA] Periodic sync setup failed:', error);
    }
  }

  /**
   * Sync pending data when back online
   */
  async syncPendingData() {
    if (!this.isOnline) { return; }

    try {
      // Trigger background sync for pending uploads
      await this.registerBackgroundSync('artifact-upload');
      await this.registerBackgroundSync('chat-message');

      console.log('[PWA] Triggered sync for pending data');
    } catch (error) {
      console.error('[PWA] Error syncing pending data:', error);
    }
  }

  /**
   * Handle service worker messages
   */
  handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('[PWA] Cache updated:', payload);
        break;
      case 'SYNC_COMPLETE':
        console.log('[PWA] Background sync complete:', payload);
        this.showSyncNotification(payload);
        break;
      case 'OFFLINE_FALLBACK':
        console.log('[PWA] Serving offline fallback');
        break;
      default:
        console.log('[PWA] Unknown message from service worker:', event.data);
    }
  }

  /**
   * Show sync notification
   */
  showSyncNotification(payload) {
    const notification = document.createElement('div');
    notification.className = 'pwa-sync-notification';
    notification.innerHTML = `✅ ${payload.message || 'Data synced successfully'}`;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-sync-notification {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 10000;
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `;

    if (!document.querySelector('style[data-pwa-sync]')) {
      style.setAttribute('data-pwa-sync', 'true');
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  /**
   * Utility: Convert VAPID key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Track events (placeholder for analytics)
   */
  trackEvent(eventName, data = {}) {
    console.log('[PWA] Event tracked:', eventName, data);

    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', eventName, data);
    }
  }

  /**
   * Get PWA installation status
   */
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
           || window.navigator.standalone === true;
  }

  /**
   * Get service worker status
   */
  getServiceWorkerStatus() {
    if (!('serviceWorker' in navigator)) {
      return 'not_supported';
    }

    if (!this.swRegistration) {
      return 'not_registered';
    }

    if (this.swRegistration.active) {
      return 'active';
    }

    if (this.swRegistration.installing) {
      return 'installing';
    }

    if (this.swRegistration.waiting) {
      return 'waiting';
    }

    return 'unknown';
  }
}

// Initialize PWA Manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager = new PWAManager();
  });
} else {
  window.pwaManager = new PWAManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
