/**
 * Chat Integration Manager
 * Integrates all chat features: search, export, persistence, typing status, etc.
 */

class ChatIntegrationManager {
  constructor() {
    this.components = {
      chatInterface: null,
      chatPersistence: null,
      chatSearchManager: null,
      typingStatusManager: null,
      connectionMonitor: null,
      errorHandler: null
    };
    
    this.init();
  }

  init() {
    // Wait for all components to be available
    this.waitForComponents().then(() => {
      this.setupIntegrations();
      this.setupGlobalKeyboardShortcuts();
      this.setupComponentCommunication();
      console.log('🔗 DinoAir chat integration initialized');
    });
  }

  async waitForComponents() {
    const maxAttempts = 50; // 5 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Check if all required components are available
      this.components.chatInterface = window.chatInterface;
      this.components.chatPersistence = window.chatPersistence;
      this.components.chatSearchManager = window.chatSearchManager;
      this.components.typingStatusManager = window.typingStatusManager;
      this.components.connectionMonitor = window.connectionMonitor;
      this.components.errorHandler = window.errorHandler;

      const availableComponents = Object.values(this.components).filter(c => c !== null);
      
      if (availableComponents.length >= 4) { // Minimum required components
        console.log(`✅ ${availableComponents.length}/6 chat components loaded`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  setupIntegrations() {
    this.integrateSearchWithPersistence();
    this.integrateTypingWithConnection();
    this.integrateErrorHandling();
    this.setupAdvancedExport();
    this.setupSessionManagement();
  }

  integrateSearchWithPersistence() {
    if (!this.components.chatSearchManager || !this.components.chatPersistence) return;

    // Enhance search with persistence data
    const originalGetAllSessions = this.components.chatSearchManager.getAllSessionMessages;
    this.components.chatSearchManager.getAllSessionMessages = async () => {
      try {
        const sessions = await this.components.chatPersistence.getSessionList();
        let allMessages = [];
        
        for (const session of sessions) {
          const sessionMessages = await this.components.chatPersistence.loadChatHistory(session.id);
          const enhancedMessages = sessionMessages.map(msg => ({
            ...msg,
            sessionId: session.id,
            sessionTitle: session.title
          }));
          allMessages = allMessages.concat(enhancedMessages);
        }
        
        return allMessages;
      } catch (error) {
        console.error('Failed to load all session messages:', error);
        return [];
      }
    };
  }

  integrateTypingWithConnection() {
    if (!this.components.typingStatusManager || !this.components.connectionMonitor) return;

    // Integrate typing status with connection monitoring
    window.addEventListener('connection:lost', () => {
      this.components.typingStatusManager.forceStopTyping();
    });

    window.addEventListener('connection:restored', () => {
      // Re-enable typing detection
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        this.components.typingStatusManager.startTypingDetection(chatInput);
      }
    });
  }

  integrateErrorHandling() {
    if (!this.components.errorHandler) return;

    // Integrate error handling across all components
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      // Show user-friendly error for certain types
      const errorMessage = args[0];
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Failed to save message')) {
          this.components.errorHandler.showError('Unable to save message. Check your connection.');
        } else if (errorMessage.includes('Failed to load')) {
          this.components.errorHandler.showError('Failed to load data. Please refresh the page.');
        }
      }
    };
  }

  setupAdvancedExport() {
    if (!this.components.chatSearchManager || !this.components.chatPersistence) return;

    // Add session-based export functionality
    this.components.chatSearchManager.exportSessionById = async (sessionId, format = 'json') => {
      try {
        const messages = await this.components.chatPersistence.loadChatHistory(sessionId);
        const sessionInfo = await this.components.chatPersistence.getSessionInfo?.(sessionId) || { id: sessionId };
        
        const exportData = {
          sessionId,
          sessionInfo,
          messages,
          exportedAt: new Date().toISOString(),
          format
        };

        return this.components.chatSearchManager.formatExportData({ ...exportData, format });
      } catch (error) {
        console.error('Failed to export session:', error);
        throw error;
      }
    };
  }

  setupSessionManagement() {
    if (!this.components.chatInterface || !this.components.chatPersistence) return;

    // Add session switching functionality
    this.components.chatInterface.switchSession = async (sessionId) => {
      try {
        await this.components.chatInterface.loadSession(sessionId);
        
        // Update search index with new session
        if (this.components.chatSearchManager) {
          setTimeout(() => {
            this.components.chatSearchManager.buildSearchIndex();
          }, 500);
        }
        
        // Show success message
        if (this.components.errorHandler) {
          this.components.errorHandler.showSuccess('Session switched successfully');
        }
      } catch (error) {
        console.error('Failed to switch session:', error);
        if (this.components.errorHandler) {
          this.components.errorHandler.showError('Failed to switch session');
        }
      }
    };
  }

  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (this.components.chatSearchManager) {
          this.components.chatSearchManager.showSearchInterface();
        }
      }
      
      // Ctrl/Cmd + E for export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (this.components.chatSearchManager) {
          this.components.chatSearchManager.showExportDialog();
        }
      }
      
      // Ctrl/Cmd + Shift + L for clear chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (this.components.chatInterface) {
          this.components.chatInterface.clearChat();
        }
      }
    });
  }

  setupComponentCommunication() {
    // Create a communication bus between components
    window.chatBus = {
      emit: (event, data) => {
        const customEvent = new CustomEvent(`chat:${event}`, { detail: data });
        window.dispatchEvent(customEvent);
      },
      
      on: (event, callback) => {
        window.addEventListener(`chat:${event}`, callback);
      },
      
      off: (event, callback) => {
        window.removeEventListener(`chat:${event}`, callback);
      }
    };

    // Set up common events
    this.setupCommonEvents();
  }

  setupCommonEvents() {
    // Message sent event
    if (this.components.chatInterface) {
      const originalAddUserMessage = this.components.chatInterface.addUserMessage;
      this.components.chatInterface.addUserMessage = async function(content) {
        const result = await originalAddUserMessage.call(this, content);
        window.chatBus.emit('message:sent', { content, type: 'user' });
        return result;
      };
    }

    // Message received event
    window.chatBus.on('message:sent', (e) => {
      console.log('Message sent:', e.detail);
      
      // Update search index
      if (this.components.chatSearchManager) {
        setTimeout(() => {
          this.components.chatSearchManager.buildSearchIndex();
        }, 100);
      }
    });

    // Search performed event
    window.chatBus.on('search:performed', (e) => {
      console.log('Search performed:', e.detail);
    });

    // Export completed event
    window.chatBus.on('export:completed', (e) => {
      console.log('Export completed:', e.detail);
      
      if (this.components.errorHandler) {
        this.components.errorHandler.showSuccess(`Chat exported as ${e.detail.filename}`);
      }
    });
  }

  // Public API for external integrations
  getComponent(name) {
    return this.components[name];
  }

  isComponentReady(name) {
    return this.components[name] !== null;
  }

  getAllComponents() {
    return { ...this.components };
  }

  // Utility methods for common operations
  async searchAndExport(searchTerm, exportFormat = 'json') {
    if (!this.components.chatSearchManager) {
      throw new Error('Search functionality not available');
    }

    // Perform search
    this.components.chatSearchManager.performSearch(searchTerm);
    
    // Wait a moment for search to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Export search results
    const results = this.components.chatSearchManager.searchResults;
    if (results.length === 0) {
      throw new Error('No search results to export');
    }

    const exportData = {
      scope: 'search',
      format: exportFormat,
      messages: results.map(r => ({
        role: r.role,
        content: r.originalContent,
        timestamp: r.timestamp
      })),
      exportedAt: new Date().toISOString(),
      searchTerm
    };

    const exportResult = this.components.chatSearchManager.formatExportData(exportData);
    this.components.chatSearchManager.downloadExport(exportResult);
    
    return exportResult;
  }

  async importChatHistory(fileContent, format = 'json') {
    if (!this.components.chatPersistence) {
      throw new Error('Persistence functionality not available');
    }

    try {
      let messages = [];
      
      switch (format) {
        case 'json':
          const jsonData = JSON.parse(fileContent);
          messages = jsonData.messages || [];
          break;
        case 'csv':
          // Basic CSV parsing (would need enhancement for production)
          const lines = fileContent.split('\n');
          lines.slice(1).forEach(line => {
            const [role, content, timestamp] = line.split(',');
            if (role && content) {
              messages.push({
                role: role.trim(),
                content: content.trim().replace(/^"|"$/g, ''),
                timestamp: timestamp ? new Date(timestamp).getTime() : Date.now()
              });
            }
          });
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Create new session for imported messages
      const sessionId = this.components.chatPersistence.startNewSession();
      
      // Save imported messages
      for (const message of messages) {
        await this.components.chatPersistence.saveMessage(message, sessionId);
      }

      // Switch to the new session
      if (this.components.chatInterface) {
        await this.components.chatInterface.switchSession(sessionId);
      }

      if (this.components.errorHandler) {
        this.components.errorHandler.showSuccess(`Imported ${messages.length} messages successfully`);
      }

      return { sessionId, messageCount: messages.length };
    } catch (error) {
      console.error('Failed to import chat history:', error);
      if (this.components.errorHandler) {
        this.components.errorHandler.showError('Failed to import chat history');
      }
      throw error;
    }
  }

  // Analytics and insights
  getChatAnalytics() {
    const messages = Array.from(document.querySelectorAll('.message:not(.typing-indicator)'));
    
    const analytics = {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.classList.contains('user')).length,
      aiMessages: messages.filter(m => m.classList.contains('assistant')).length,
      averageMessageLength: 0,
      sessionStartTime: null,
      sessionDuration: 0
    };

    analytics.averageMessageLength = messages.reduce((sum, msg) => {
      const content = msg.querySelector('.message-bubble')?.textContent || '';
      return sum + content.length;
    }, 0) / Math.max(messages.length, 1);

    // Calculate session duration if available
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    if (firstMessage && lastMessage) {
      const firstTime = this.extractTimestamp(firstMessage);
      const lastTime = this.extractTimestamp(lastMessage);
      analytics.sessionStartTime = firstTime;
      analytics.sessionDuration = lastTime - firstTime;
    }

    return analytics;
  }

  extractTimestamp(messageElement) {
    const timeElement = messageElement.querySelector('.message-time');
    if (timeElement) {
      const timeText = timeElement.textContent;
      // This is a simplified timestamp extraction
      return new Date().setHours(...timeText.split(':').map(Number));
    }
    return Date.now();
  }
}

// Initialize integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure all components are loaded
  setTimeout(() => {
    window.chatIntegrationManager = new ChatIntegrationManager();
  }, 1000);
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatIntegrationManager;
}