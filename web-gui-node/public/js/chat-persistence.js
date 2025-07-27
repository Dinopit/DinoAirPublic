/**
 * Chat Persistence Manager
 * Handles local and remote storage of chat messages and sessions
 */

class ChatPersistence {
  constructor() {
    this.localStorageKey = 'dinoair_chat_history';
    this.sessionStorageKey = 'dinoair_current_session';
    this.maxLocalMessages = 1000; // Limit local storage size
    this.syncEnabled = true;
    this.currentSessionId = null;
    
    this.init();
  }

  init() {
    this.loadCurrentSession();
    this.setupPeriodicSync();
    this.setupBeforeUnload();
  }

  /**
   * Save a message to both local and remote storage
   * @param {Object} message - Message object
   * @param {string} sessionId - Session ID
   */
  async saveMessage(message, sessionId = null) {
    const sessionIdToUse = sessionId || this.currentSessionId || this.generateSessionId();
    
    const messageData = {
      id: this.generateMessageId(),
      sessionId: sessionIdToUse,
      timestamp: Date.now(),
      ...message
    };

    // Save locally immediately
    this.saveMessageLocally(messageData);
    
    // Save to server if online
    if (this.syncEnabled && window.connectionMonitor?.isOnline) {
      try {
        await this.saveMessageRemotely(messageData);
        messageData.synced = true;
        this.updateMessageLocally(messageData);
      } catch (error) {
        console.warn('Failed to sync message to server:', error);
        messageData.synced = false;
        this.updateMessageLocally(messageData);
      }
    }

    return messageData;
  }

  /**
   * Load chat history for current session
   * @param {string} sessionId - Session ID to load
   * @returns {Promise<Array>} Array of messages
   */
  async loadChatHistory(sessionId = null) {
    const sessionIdToLoad = sessionId || this.currentSessionId;
    
    if (!sessionIdToLoad) {
      return [];
    }

    // Try to load from server first
    if (this.syncEnabled && window.connectionMonitor?.isOnline) {
      try {
        const remoteMessages = await this.loadMessagesFromServer(sessionIdToLoad);
        if (remoteMessages.length > 0) {
          // Update local storage with server data
          this.updateLocalSessionHistory(sessionIdToLoad, remoteMessages);
          return remoteMessages;
        }
      } catch (error) {
        console.warn('Failed to load messages from server:', error);
      }
    }

    // Fallback to local storage
    return this.loadMessagesLocally(sessionIdToLoad);
  }

  /**
   * Start a new chat session
   * @returns {string} New session ID
   */
  startNewSession() {
    const sessionId = this.generateSessionId();
    this.currentSessionId = sessionId;
    this.saveCurrentSession(sessionId);
    return sessionId;
  }

  /**
   * Switch to existing session
   * @param {string} sessionId - Session ID to switch to
   */
  switchToSession(sessionId) {
    this.currentSessionId = sessionId;
    this.saveCurrentSession(sessionId);
  }

  /**
   * Get list of available sessions
   * @returns {Promise<Array>} Array of session summaries
   */
  async getSessionList() {
    let sessions = [];
    
    // Try to get from server first
    if (this.syncEnabled && window.connectionMonitor?.isOnline) {
      try {
        sessions = await this.loadSessionsFromServer();
      } catch (error) {
        console.warn('Failed to load sessions from server:', error);
      }
    }

    // Merge with local sessions
    const localSessions = this.getLocalSessions();
    const mergedSessions = this.mergeSessions(sessions, localSessions);
    
    return mergedSessions.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Delete a chat session
   * @param {string} sessionId - Session ID to delete
   */
  async deleteSession(sessionId) {
    // Delete locally
    this.deleteSessionLocally(sessionId);
    
    // Delete from server
    if (this.syncEnabled && window.connectionMonitor?.isOnline) {
      try {
        await this.deleteSessionRemotely(sessionId);
      } catch (error) {
        console.warn('Failed to delete session from server:', error);
      }
    }

    // If this was the current session, start a new one
    if (this.currentSessionId === sessionId) {
      this.startNewSession();
    }
  }

  /**
   * Export chat history
   * @param {string} sessionId - Session ID to export
   * @param {string} format - Export format ('json', 'txt', 'md')
   * @returns {Object} Export data
   */
  async exportSession(sessionId, format = 'json') {
    const messages = await this.loadChatHistory(sessionId);
    const sessionInfo = await this.getSessionInfo(sessionId);
    
    const exportData = {
      sessionId,
      sessionInfo,
      messages,
      exportedAt: new Date().toISOString(),
      format
    };

    switch (format) {
      case 'txt':
        return this.exportAsText(exportData);
      case 'md':
        return this.exportAsMarkdown(exportData);
      case 'json':
      default:
        return exportData;
    }
  }

  // ============ LOCAL STORAGE METHODS ============

  saveMessageLocally(message) {
    const history = this.getLocalHistory();
    
    if (!history[message.sessionId]) {
      history[message.sessionId] = [];
    }
    
    history[message.sessionId].push(message);
    
    // Cleanup old messages if we exceed the limit
    this.cleanupLocalHistory(history);
    
    localStorage.setItem(this.localStorageKey, JSON.stringify(history));
  }

  updateMessageLocally(message) {
    const history = this.getLocalHistory();
    
    if (history[message.sessionId]) {
      const index = history[message.sessionId].findIndex(m => m.id === message.id);
      if (index !== -1) {
        history[message.sessionId][index] = message;
        localStorage.setItem(this.localStorageKey, JSON.stringify(history));
      }
    }
  }

  loadMessagesLocally(sessionId) {
    const history = this.getLocalHistory();
    return history[sessionId] || [];
  }

  deleteSessionLocally(sessionId) {
    const history = this.getLocalHistory();
    delete history[sessionId];
    localStorage.setItem(this.localStorageKey, JSON.stringify(history));
  }

  getLocalHistory() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse local chat history:', error);
      return {};
    }
  }

  getLocalSessions() {
    const history = this.getLocalHistory();
    const sessions = [];
    
    for (const [sessionId, messages] of Object.entries(history)) {
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const firstMessage = messages[0];
        
        sessions.push({
          id: sessionId,
          title: this.generateSessionTitle(messages),
          messageCount: messages.length,
          lastActivity: lastMessage.timestamp,
          createdAt: firstMessage.timestamp,
          source: 'local'
        });
      }
    }
    
    return sessions;
  }

  updateLocalSessionHistory(sessionId, messages) {
    const history = this.getLocalHistory();
    history[sessionId] = messages;
    localStorage.setItem(this.localStorageKey, JSON.stringify(history));
  }

  cleanupLocalHistory(history) {
    const allMessages = [];
    
    // Collect all messages with session info
    for (const [sessionId, messages] of Object.entries(history)) {
      messages.forEach(msg => {
        allMessages.push({ ...msg, sessionId });
      });
    }
    
    // Sort by timestamp and keep only the most recent
    allMessages.sort((a, b) => b.timestamp - a.timestamp);
    
    if (allMessages.length > this.maxLocalMessages) {
      const messagesToKeep = allMessages.slice(0, this.maxLocalMessages);
      const newHistory = {};
      
      messagesToKeep.forEach(msg => {
        if (!newHistory[msg.sessionId]) {
          newHistory[msg.sessionId] = [];
        }
        newHistory[msg.sessionId].push(msg);
      });
      
      // Replace the history reference
      Object.keys(history).forEach(key => delete history[key]);
      Object.assign(history, newHistory);
    }
  }

  // ============ REMOTE STORAGE METHODS ============

  async saveMessageRemotely(message) {
    const response = await fetch('/api/chat/sessions/' + message.sessionId + '/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader()
      },
      body: JSON.stringify({
        role: message.role,
        content: message.content,
        metadata: message.metadata || {}
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save message: ${response.status}`);
    }

    return await response.json();
  }

  async loadMessagesFromServer(sessionId) {
    const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  async loadSessionsFromServer() {
    const response = await fetch('/api/chat/sessions', {
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load sessions: ${response.status}`);
    }

    const data = await response.json();
    return data.sessions || [];
  }

  async deleteSessionRemotely(sessionId) {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': this.getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.status}`);
    }
  }

  // ============ UTILITY METHODS ============

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionTitle(messages) {
    if (messages.length === 0) return 'Empty Session';
    
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.trim();
      return content.length > 50 ? content.substring(0, 47) + '...' : content;
    }
    
    return 'Chat Session';
  }

  getAuthHeader() {
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token');
    return token ? `Bearer ${token}` : '';
  }

  saveCurrentSession(sessionId) {
    sessionStorage.setItem(this.sessionStorageKey, sessionId);
  }

  loadCurrentSession() {
    const stored = sessionStorage.getItem(this.sessionStorageKey);
    if (stored) {
      this.currentSessionId = stored;
    } else {
      this.currentSessionId = this.generateSessionId();
      this.saveCurrentSession(this.currentSessionId);
    }
  }

  mergeSessions(remoteSessions, localSessions) {
    const sessionMap = new Map();
    
    // Add remote sessions
    remoteSessions.forEach(session => {
      sessionMap.set(session.id, { ...session, source: 'remote' });
    });
    
    // Add local sessions that aren't on remote
    localSessions.forEach(session => {
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, session);
      }
    });
    
    return Array.from(sessionMap.values());
  }

  setupPeriodicSync() {
    // Sync unsent messages every 30 seconds
    setInterval(async () => {
      if (this.syncEnabled && window.connectionMonitor?.isOnline) {
        await this.syncPendingMessages();
      }
    }, 30000);
  }

  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      // Save any pending state
      this.saveCurrentSession(this.currentSessionId);
    });
  }

  async syncPendingMessages() {
    const history = this.getLocalHistory();
    
    for (const [sessionId, messages] of Object.entries(history)) {
      const unsyncedMessages = messages.filter(m => !m.synced);
      
      for (const message of unsyncedMessages) {
        try {
          await this.saveMessageRemotely(message);
          message.synced = true;
          this.updateMessageLocally(message);
        } catch (error) {
          console.warn('Failed to sync message:', message.id, error);
        }
      }
    }
  }

  exportAsText(exportData) {
    let text = `Chat Session: ${exportData.sessionInfo?.title || exportData.sessionId}\n`;
    text += `Exported: ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    text += `Messages: ${exportData.messages.length}\n\n`;
    
    exportData.messages.forEach(message => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      text += `[${timestamp}] ${message.role.toUpperCase()}: ${message.content}\n\n`;
    });
    
    return { content: text, filename: `chat_${exportData.sessionId}.txt` };
  }

  exportAsMarkdown(exportData) {
    let md = `# Chat Session\n\n`;
    md += `**Session ID:** ${exportData.sessionId}\n`;
    md += `**Exported:** ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    md += `**Messages:** ${exportData.messages.length}\n\n`;
    md += `---\n\n`;
    
    exportData.messages.forEach(message => {
      const timestamp = new Date(message.timestamp).toLocaleString();
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      md += `## ${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n`;
      md += `*${timestamp}*\n\n`;
      md += `${message.content}\n\n`;
    });
    
    return { content: md, filename: `chat_${exportData.sessionId}.md` };
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  isOnline() {
    return window.connectionMonitor?.isOnline ?? navigator.onLine;
  }
}

// Create global instance
window.chatPersistence = new ChatPersistence();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatPersistence;
}