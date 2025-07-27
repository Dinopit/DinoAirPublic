/**
 * DinoAir Chat Interface
 * Main chat functionality with integrated loading states
 */

class ChatInterface {
  constructor() {
    this.chatMessages = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    this.charCount = document.getElementById('char-count');
    this.currentModel = document.getElementById('current-model');

    this.streamer = new ChatStreamer();
    this.isStreaming = false;
    this.currentSessionId = null;
    this.messageHistory = [];

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.loadCurrentModel();
    this.setupStreamingHandlers();
    this.autoResizeTextarea();
    await this.loadChatHistory();
  }

  setupEventListeners() {
    this.chatForm.addEventListener('submit', e => this.handleSubmit(e));
    this.chatInput.addEventListener('input', () => this.handleInputChange());
    this.chatInput.addEventListener('keydown', e => this.handleKeyDown(e));

    document.getElementById('clear-chat-btn')?.addEventListener('click', () => this.clearChat());
    document.getElementById('export-chat-btn')?.addEventListener('click', () => this.showExportDialog());
    document.getElementById('search-chat-btn')?.addEventListener('click', () => this.showSearchInterface());
  }

  setupStreamingHandlers() {
    this.streamer.on('streamStart', () => {
      this.isStreaming = true;
      this.showAdvancedTypingIndicator('DinoAir is preparing your response...');
      window.loadingManager.show('send-btn', {
        showSpinner: true,
        showMessage: true,
        message: 'Sending...',
        disableInteraction: true
      });
    });

    this.streamer.on('streamChunk', chunk => {
      // Update typing indicator message when first chunk arrives
      if (!this.chatMessages.querySelector('.message.streaming')) {
        this.updateTypingIndicatorMessage('DinoAir is responding...');
        
        // Add slight delay to show processing state
        setTimeout(() => {
          this.updateStreamingMessage(chunk);
        }, 300);
      } else {
        this.updateStreamingMessage(chunk);
      }
    });

    this.streamer.on('streamComplete', response => {
      this.isStreaming = false;
      this.hideTypingIndicator();
      this.finalizeMessage(response);
      window.loadingManager.hide('send-btn');
      this.enableInput();
    });

    this.streamer.on('streamError', error => {
      this.isStreaming = false;
      this.hideTypingIndicator();
      this.showErrorMessage(error);
      window.loadingManager.hide('send-btn');
      this.enableInput();
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isStreaming || !this.chatInput.value.trim()) {
      return;
    }

    const message = this.chatInput.value.trim();
    const streamResponse = document.getElementById('stream-response')?.checked ?? true;

    this.addUserMessage(message);
    this.chatInput.value = '';
    this.updateCharCount();
    this.disableInput();

    try {
      const messageData = {
        messages: [{ role: 'user', content: message }],
        stream: streamResponse,
        sessionId: this.currentSessionId
      };

      await this.streamer.startStream(messageData);
    } catch (error) {
      console.error('Chat error:', error);
      this.showErrorMessage(error);
      this.enableInput();
    }
  }

  async addUserMessage(content) {
    const messageElement = this.createMessageElement('user', content);
    this.chatMessages.appendChild(messageElement);
    this.scrollToBottom();

    // Update message status to sent
    setTimeout(() => {
      this.updateMessageStatus(messageElement, 'sent');
    }, 300);

    // Save to persistence
    if (window.chatPersistence) {
      try {
        const sessionId = this.currentSessionId || window.chatPersistence.getCurrentSessionId();
        await window.chatPersistence.saveMessage({
          role: 'user',
          content: content
        }, sessionId);
        this.currentSessionId = sessionId;
        
        // Update to delivered status
        setTimeout(() => {
          this.updateMessageStatus(messageElement, 'delivered');
        }, 800);
      } catch (error) {
        console.error('Failed to save message:', error);
        this.updateMessageStatus(messageElement, 'failed');
      }
    }
  }

  showTypingIndicator() {
    const existingIndicator = this.chatMessages.querySelector('.typing-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <div class="typing-avatar">
        <div class="typing-avatar-inner">AI</div>
      </div>
      <div class="typing-content">
        <div class="typing-bubble">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
        <div class="typing-text">DinoAir is typing...</div>
      </div>
    `;

    this.chatMessages.appendChild(indicator);
    this.scrollToBottom();
    
    // Add subtle animation entrance
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      indicator.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    });
  }

  hideTypingIndicator() {
    const indicator = this.chatMessages.querySelector('.typing-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 200);
    }
  }

  updateStreamingMessage(chunk) {
    let streamingMessage = this.chatMessages.querySelector('.message.streaming');

    if (!streamingMessage) {
      this.hideTypingIndicator();
      streamingMessage = this.createMessageElement('assistant', '', true);
      this.chatMessages.appendChild(streamingMessage);
    }

    const bubble = streamingMessage.querySelector('.message-bubble');
    if (bubble) {
      bubble.textContent += chunk;
      this.scrollToBottom();
    }
  }

  async finalizeMessage(response) {
    const streamingMessage = this.chatMessages.querySelector('.message.streaming');
    if (streamingMessage) {
      streamingMessage.classList.remove('streaming');
      const bubble = streamingMessage.querySelector('.message-bubble');
      if (bubble && response.content) {
        bubble.innerHTML = this.formatMessageContent(response.content);
      }

      // Save assistant message to persistence
      if (window.chatPersistence && response.content) {
        const sessionId = this.currentSessionId || window.chatPersistence.getCurrentSessionId();
        await window.chatPersistence.saveMessage({
          role: 'assistant',
          content: response.content
        }, sessionId);
      }
    }
    this.scrollToBottom();
  }

  createMessageElement(role, content, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}${isStreaming ? ' streaming' : ''}`;
    messageDiv.setAttribute('data-message-id', this.generateMessageId());

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = this.formatMessageContent(content);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();

    // Add message status for user messages
    if (role === 'user') {
      const status = document.createElement('div');
      status.className = 'message-status';
      status.innerHTML = this.getMessageStatusIcon('sending');
      status.setAttribute('data-status', 'sending');
      metaDiv.appendChild(status);
    }

    metaDiv.appendChild(time);
    contentDiv.appendChild(bubble);
    contentDiv.appendChild(metaDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
  }

  formatMessageContent(content) {
    if (!content) { return ''; }

    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  showErrorMessage(error) {
    const errorContent = error.message || 'An error occurred while processing your request.';
    const errorElement = this.createMessageElement('assistant', `❌ ${errorContent}`);
    errorElement.classList.add('error');
    this.chatMessages.appendChild(errorElement);
    this.scrollToBottom();
  }

  async loadCurrentModel() {
    try {
      window.loadingManager.show('current-model', {
        showSpinner: true,
        showMessage: false,
        disableInteraction: false
      });

      const response = await API.get('/models/current');
      this.currentModel.textContent = response.model || 'Unknown';
    } catch (error) {
      console.error('Failed to load current model:', error);
      this.currentModel.textContent = 'Error loading model';
    } finally {
      window.loadingManager.hide('current-model');
    }
  }

  handleInputChange() {
    this.updateCharCount();
    this.updateSendButton();
    this.autoResizeTextarea();
    this.handleUserTyping();
  }

  updateCharCount() {
    const count = this.chatInput.value.length;
    this.charCount.textContent = count;

    if (count > 3500) {
      this.charCount.style.color = 'var(--error-color)';
    } else if (count > 3000) {
      this.charCount.style.color = 'var(--warning-color)';
    } else {
      this.charCount.style.color = '';
    }
  }

  updateSendButton() {
    const hasContent = this.chatInput.value.trim().length > 0;
    this.sendBtn.disabled = !hasContent || this.isStreaming;
  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!this.sendBtn.disabled) {
        this.handleSubmit(e);
      }
    }
  }

  autoResizeTextarea() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = `${Math.min(this.chatInput.scrollHeight, 120)}px`;
  }

  disableInput() {
    this.chatInput.disabled = true;
    this.sendBtn.disabled = true;
  }

  enableInput() {
    this.chatInput.disabled = false;
    this.updateSendButton();
    this.chatInput.focus();
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // New methods for enhanced typing and status features
  
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getMessageStatusIcon(status) {
    switch (status) {
      case 'sending':
        return '<div class="status-icon status-sending">○</div>';
      case 'sent':
        return '<div class="status-icon status-sent">✓</div>';
      case 'delivered':
        return '<div class="status-icon status-delivered">✓✓</div>';
      case 'failed':
        return '<div class="status-icon status-failed">⚠</div>';
      default:
        return '';
    }
  }

  updateMessageStatus(messageElement, status) {
    const statusElement = messageElement.querySelector('.message-status');
    if (statusElement) {
      statusElement.innerHTML = this.getMessageStatusIcon(status);
      statusElement.setAttribute('data-status', status);
      
      // Add animation for status change
      statusElement.style.transform = 'scale(1.2)';
      setTimeout(() => {
        statusElement.style.transform = 'scale(1)';
      }, 200);
    }
  }

  handleUserTyping() {
    // Show typing indicator to other users (if implementing real-time features)
    // For now, this is a placeholder for future real-time typing indicators
    clearTimeout(this.typingTimeout);
    
    if (this.chatInput.value.trim().length > 0) {
      // User is typing
      this.isUserTyping = true;
      
      // Clear typing status after 2 seconds of no activity
      this.typingTimeout = setTimeout(() => {
        this.isUserTyping = false;
      }, 2000);
    } else {
      this.isUserTyping = false;
    }
  }

  showAdvancedTypingIndicator(message = 'DinoAir is processing your request...') {
    this.hideTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator advanced';
    indicator.innerHTML = `
      <div class="typing-avatar">
        <div class="typing-avatar-inner processing">AI</div>
      </div>
      <div class="typing-content">
        <div class="typing-bubble processing">
          <div class="processing-bar">
            <div class="processing-fill"></div>
          </div>
        </div>
        <div class="typing-text">${message}</div>
      </div>
    `;

    this.chatMessages.appendChild(indicator);
    this.scrollToBottom();
  }

  updateTypingIndicatorMessage(message) {
    const indicator = this.chatMessages.querySelector('.typing-indicator');
    const textElement = indicator?.querySelector('.typing-text');
    if (textElement) {
      textElement.textContent = message;
    }
  }

  // Integration with search and export functionality
  showSearchInterface() {
    if (window.chatSearchManager) {
      window.chatSearchManager.showSearchInterface();
    } else {
      console.warn('Search functionality not available');
    }
  }

  showExportDialog() {
    if (window.chatSearchManager) {
      window.chatSearchManager.showExportDialog();
    } else {
      // Fallback to basic export
      this.exportChat();
    }
  }

  async clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
      try {
        window.loadingManager.show('clear-chat-btn', {
          showSpinner: true,
          showMessage: true,
          message: 'Clearing...',
          disableInteraction: true
        });

        if (this.currentSessionId) {
          await API.delete(`/chat/sessions/${this.currentSessionId}`);
        }

        this.chatMessages.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-content">
              <h3>Welcome to DinoAir Chat</h3>
              <p>Start a conversation with AI. Type your message below and press Enter or click Send.</p>
              <div class="model-info">
                <span class="model-label">Current Model:</span>
                <span class="model-name" id="current-model">${this.currentModel.textContent}</span>
                <button class="btn btn-sm btn-secondary" id="change-model-btn">Change</button>
              </div>
            </div>
          </div>
        `;

        this.currentSessionId = null;
        
        // Start a new session in persistence
        if (window.chatPersistence) {
          this.currentSessionId = window.chatPersistence.startNewSession();
        }
      } catch (error) {
        console.error('Failed to clear chat:', error);
        alert('Failed to clear chat. Please try again.');
      } finally {
        window.loadingManager.hide('clear-chat-btn');
      }
    }
  }

  async exportChat() {
    try {
      window.loadingManager.show('export-chat-btn', {
        showSpinner: true,
        showMessage: true,
        message: 'Exporting...',
        disableInteraction: true
      });

      const messages = Array.from(this.chatMessages.querySelectorAll('.message:not(.typing-indicator)'))
        .map(msg => {
          const role = msg.classList.contains('user') ? 'User' : 'Assistant';
          const content = msg.querySelector('.message-bubble').textContent;
          const time = msg.querySelector('.message-time').textContent;
          return `[${time}] ${role}: ${content}`;
        });

      const chatText = messages.join('\n\n');
      const blob = new Blob([chatText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `dinoair-chat-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export chat:', error);
      alert('Failed to export chat. Please try again.');
    } finally {
      window.loadingManager.hide('export-chat-btn');
    }
  }

  /**
   * Load chat history from persistence
   */
  async loadChatHistory() {
    if (!window.chatPersistence) return;

    try {
      // Get current session ID
      this.currentSessionId = window.chatPersistence.getCurrentSessionId();
      
      // Load messages for current session
      const messages = await window.chatPersistence.loadChatHistory(this.currentSessionId);
      
      if (messages.length > 0) {
        // Clear welcome message
        this.chatMessages.innerHTML = '';
        
        // Render all messages
        messages.forEach(message => {
          const messageElement = this.createMessageElement(message.role, message.content);
          this.chatMessages.appendChild(messageElement);
        });
        
        this.scrollToBottom();
        console.log(`Loaded ${messages.length} messages from chat history`);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Continue without history - not a breaking error
    }
  }

  /**
   * Load a specific session
   */
  async loadSession(sessionId) {
    if (!window.chatPersistence) return;

    try {
      window.loadingManager.show('chat-messages', {
        showSpinner: true,
        message: 'Loading conversation...'
      });

      this.currentSessionId = sessionId;
      window.chatPersistence.switchToSession(sessionId);
      
      const messages = await window.chatPersistence.loadChatHistory(sessionId);
      
      // Clear current messages
      this.chatMessages.innerHTML = '';
      
      if (messages.length === 0) {
        // Show welcome message for empty session
        this.chatMessages.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-content">
              <h3>New Conversation</h3>
              <p>Start a conversation with AI. Type your message below and press Enter or click Send.</p>
            </div>
          </div>
        `;
      } else {
        // Render all messages
        messages.forEach(message => {
          const messageElement = this.createMessageElement(message.role, message.content);
          this.chatMessages.appendChild(messageElement);
        });
      }
      
      this.scrollToBottom();
    } catch (error) {
      console.error('Failed to load session:', error);
      if (window.errorHandler) {
        window.errorHandler.handleError(error, {
          container: this.chatMessages,
          inline: true
        });
      }
    } finally {
      window.loadingManager.hide('chat-messages');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.chatInterface = new ChatInterface();
});
