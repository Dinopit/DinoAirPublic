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

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCurrentModel();
    this.setupStreamingHandlers();
    this.autoResizeTextarea();
  }

  setupEventListeners() {
    this.chatForm.addEventListener('submit', e => this.handleSubmit(e));
    this.chatInput.addEventListener('input', () => this.handleInputChange());
    this.chatInput.addEventListener('keydown', e => this.handleKeyDown(e));

    document.getElementById('clear-chat-btn')?.addEventListener('click', () => this.clearChat());
    document.getElementById('export-chat-btn')?.addEventListener('click', () => this.exportChat());
  }

  setupStreamingHandlers() {
    this.streamer.on('streamStart', () => {
      this.isStreaming = true;
      this.showTypingIndicator();
      window.loadingManager.show('send-btn', {
        showSpinner: true,
        showMessage: true,
        message: 'Sending...',
        disableInteraction: true
      });
    });

    this.streamer.on('streamChunk', chunk => {
      this.updateStreamingMessage(chunk);
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

  addUserMessage(content) {
    const messageElement = this.createMessageElement('user', content);
    this.chatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const existingIndicator = this.chatMessages.querySelector('.typing-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
      <div class="typing-text">AI is thinking...</div>
    `;

    this.chatMessages.appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = this.chatMessages.querySelector('.typing-indicator');
    if (indicator) {
      indicator.remove();
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

  finalizeMessage(response) {
    const streamingMessage = this.chatMessages.querySelector('.message.streaming');
    if (streamingMessage) {
      streamingMessage.classList.remove('streaming');
      const bubble = streamingMessage.querySelector('.message-bubble');
      if (bubble && response.content) {
        bubble.innerHTML = this.formatMessageContent(response.content);
      }
    }
    this.scrollToBottom();
  }

  createMessageElement(role, content, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}${isStreaming ? ' streaming' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = this.formatMessageContent(content);

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();

    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);
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
}

document.addEventListener('DOMContentLoaded', () => {
  window.chatInterface = new ChatInterface();
});
