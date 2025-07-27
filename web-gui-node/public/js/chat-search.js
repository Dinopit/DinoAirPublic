/**
 * Chat Search and Export Manager
 * Advanced search functionality and enhanced export options for chat history
 */

class ChatSearchManager {
  constructor() {
    this.searchIndex = new Map();
    this.searchResults = [];
    this.currentSearchTerm = '';
    this.searchFilters = {
      role: 'all', // 'all', 'user', 'assistant'
      dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
      customStartDate: null,
      customEndDate: null
    };
    this.highlightedElements = [];
    this.exportFormats = ['txt', 'md', 'json', 'csv', 'html'];
    
    this.init();
  }

  init() {
    this.createSearchInterface();
    this.setupEventListeners();
    this.buildSearchIndex();
    this.setupPeriodicIndexUpdate();
  }

  createSearchInterface() {
    // Check if search interface already exists
    if (document.getElementById('chat-search-interface')) return;

    const searchInterface = document.createElement('div');
    searchInterface.id = 'chat-search-interface';
    searchInterface.className = 'search-interface hidden';
    searchInterface.innerHTML = `
      <div class="search-header">
        <div class="search-input-container">
          <input type="text" id="chat-search-input" class="search-input" 
                 placeholder="Search conversations..." autocomplete="off">
          <button id="search-clear-btn" class="search-clear-btn hidden">✕</button>
        </div>
        <div class="search-controls">
          <button id="search-toggle-filters" class="btn btn-sm btn-secondary">Filters</button>
          <button id="search-export-btn" class="btn btn-sm btn-primary">Export</button>
          <button id="search-close-btn" class="btn btn-sm btn-secondary">Close</button>
        </div>
      </div>
      
      <div id="search-filters" class="search-filters hidden">
        <div class="filter-group">
          <label class="filter-label">Role:</label>
          <select id="filter-role" class="filter-select">
            <option value="all">All Messages</option>
            <option value="user">User Messages</option>
            <option value="assistant">AI Messages</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Date Range:</label>
          <select id="filter-date-range" class="filter-select">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        <div id="custom-date-range" class="custom-date-range hidden">
          <input type="date" id="filter-start-date" class="filter-date">
          <span>to</span>
          <input type="date" id="filter-end-date" class="filter-date">
        </div>
      </div>
      
      <div class="search-results-container">
        <div id="search-results-header" class="search-results-header hidden">
          <span id="search-results-count">0 results</span>
          <div class="search-navigation">
            <button id="search-prev-btn" class="btn btn-sm btn-secondary" disabled>←</button>
            <span id="search-position">0 / 0</span>
            <button id="search-next-btn" class="btn btn-sm btn-secondary" disabled>→</button>
          </div>
        </div>
        
        <div id="search-results" class="search-results"></div>
      </div>
    `;

    // Insert the search interface into the chat container
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.insertBefore(searchInterface, chatContainer.firstChild);
    }
  }

  setupEventListeners() {
    const searchInput = document.getElementById('chat-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const toggleFiltersBtn = document.getElementById('search-toggle-filters');
    const exportBtn = document.getElementById('search-export-btn');
    const closeBtn = document.getElementById('search-close-btn');
    const filtersContainer = document.getElementById('search-filters');
    
    // Search input handling
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
      });
      
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.performSearch(e.target.value);
        } else if (e.key === 'Escape') {
          this.clearSearch();
        }
      });
    }

    // Clear search
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        this.clearSearch();
      });
    }

    // Toggle filters
    if (toggleFiltersBtn) {
      toggleFiltersBtn.addEventListener('click', () => {
        filtersContainer.classList.toggle('hidden');
      });
    }

    // Export functionality
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.showExportDialog();
      });
    }

    // Close search interface
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideSearchInterface();
      });
    }

    // Filter change handlers
    this.setupFilterEventListeners();
    
    // Navigation buttons
    this.setupNavigationEventListeners();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+F or Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.showSearchInterface();
      }
      
      // Escape to close search
      if (e.key === 'Escape' && this.isSearchVisible()) {
        this.hideSearchInterface();
      }
    });
  }

  setupFilterEventListeners() {
    const roleFilter = document.getElementById('filter-role');
    const dateRangeFilter = document.getElementById('filter-date-range');
    const customDateRange = document.getElementById('custom-date-range');
    const startDate = document.getElementById('filter-start-date');
    const endDate = document.getElementById('filter-end-date');

    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.searchFilters.role = e.target.value;
        this.performSearch(this.currentSearchTerm);
      });
    }

    if (dateRangeFilter) {
      dateRangeFilter.addEventListener('change', (e) => {
        this.searchFilters.dateRange = e.target.value;
        customDateRange.classList.toggle('hidden', e.target.value !== 'custom');
        this.updateDateRange();
        this.performSearch(this.currentSearchTerm);
      });
    }

    if (startDate) {
      startDate.addEventListener('change', (e) => {
        this.searchFilters.customStartDate = e.target.value;
        this.performSearch(this.currentSearchTerm);
      });
    }

    if (endDate) {
      endDate.addEventListener('change', (e) => {
        this.searchFilters.customEndDate = e.target.value;
        this.performSearch(this.currentSearchTerm);
      });
    }
  }

  setupNavigationEventListeners() {
    const prevBtn = document.getElementById('search-prev-btn');
    const nextBtn = document.getElementById('search-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.navigateSearchResults(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.navigateSearchResults(1);
      });
    }
  }

  buildSearchIndex() {
    this.searchIndex.clear();
    
    // Get all messages from chat history
    const messages = document.querySelectorAll('.message:not(.typing-indicator)');
    
    messages.forEach((messageEl, index) => {
      const role = messageEl.classList.contains('user') ? 'user' : 'assistant';
      const content = messageEl.querySelector('.message-bubble')?.textContent || '';
      const timestamp = this.extractTimestamp(messageEl);
      
      const messageData = {
        id: index,
        element: messageEl,
        role: role,
        content: content.toLowerCase(),
        originalContent: content,
        timestamp: timestamp,
        searchableText: `${role} ${content}`.toLowerCase()
      };
      
      this.searchIndex.set(index, messageData);
    });
  }

  extractTimestamp(messageElement) {
    const timeElement = messageElement.querySelector('.message-time');
    if (timeElement) {
      // Try to parse the time text
      const timeText = timeElement.textContent;
      return new Date().setHours(...timeText.split(':').map(Number));
    }
    return Date.now();
  }

  handleSearchInput(value) {
    const searchClearBtn = document.getElementById('search-clear-btn');
    if (searchClearBtn) {
      searchClearBtn.classList.toggle('hidden', !value);
    }
    
    // Debounce search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.performSearch(value);
    }, 300);
  }

  performSearch(searchTerm) {
    this.currentSearchTerm = searchTerm.toLowerCase().trim();
    this.clearHighlights();
    
    if (!this.currentSearchTerm) {
      this.displaySearchResults([]);
      return;
    }

    // Search through the index
    const results = [];
    
    this.searchIndex.forEach((messageData, id) => {
      // Apply role filter
      if (this.searchFilters.role !== 'all' && messageData.role !== this.searchFilters.role) {
        return;
      }
      
      // Apply date filter
      if (!this.matchesDateFilter(messageData.timestamp)) {
        return;
      }
      
      // Perform text search
      if (this.matchesSearchTerm(messageData.searchableText, this.currentSearchTerm)) {
        results.push({
          ...messageData,
          relevanceScore: this.calculateRelevance(messageData.searchableText, this.currentSearchTerm)
        });
      }
    });

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    this.searchResults = results;
    this.displaySearchResults(results);
    this.highlightSearchResults(results);
  }

  matchesSearchTerm(text, searchTerm) {
    // Support for quoted phrases and multiple terms
    if (searchTerm.includes('"')) {
      const phrases = searchTerm.match(/"([^"]+)"/g) || [];
      const phrasesText = phrases.map(p => p.slice(1, -1));
      return phrasesText.some(phrase => text.includes(phrase.toLowerCase()));
    }
    
    // Multiple terms (AND logic)
    const terms = searchTerm.split(/\s+/).filter(t => t.length > 0);
    return terms.every(term => text.includes(term));
  }

  calculateRelevance(text, searchTerm) {
    let score = 0;
    const terms = searchTerm.split(/\s+/);
    
    terms.forEach(term => {
      const occurrences = (text.match(new RegExp(term, 'g')) || []).length;
      score += occurrences;
      
      // Boost for exact matches at word boundaries
      if (text.includes(` ${term} `)) {
        score += 2;
      }
    });
    
    return score;
  }

  matchesDateFilter(timestamp) {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    switch (this.searchFilters.dateRange) {
      case 'all':
        return true;
      case 'today':
        return this.isSameDay(messageDate, now);
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return messageDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return messageDate >= monthAgo;
      case 'custom':
        const startDate = this.searchFilters.customStartDate ? new Date(this.searchFilters.customStartDate) : null;
        const endDate = this.searchFilters.customEndDate ? new Date(this.searchFilters.customEndDate) : null;
        
        if (startDate && messageDate < startDate) return false;
        if (endDate && messageDate > endDate) return false;
        return true;
      default:
        return true;
    }
  }

  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    const resultsHeader = document.getElementById('search-results-header');
    const resultsCount = document.getElementById('search-results-count');
    
    if (!resultsContainer) return;
    
    if (results.length === 0) {
      resultsHeader.classList.add('hidden');
      resultsContainer.innerHTML = this.currentSearchTerm ? 
        '<div class="no-results">No messages found matching your search.</div>' : '';
      return;
    }
    
    resultsHeader.classList.remove('hidden');
    resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    
    const resultsList = results.map((result, index) => {
      const snippet = this.createSearchSnippet(result.originalContent, this.currentSearchTerm);
      const roleIcon = result.role === 'user' ? '👤' : '🤖';
      const timestamp = new Date(result.timestamp).toLocaleString();
      
      return `
        <div class="search-result-item" data-message-id="${result.id}">
          <div class="search-result-header">
            <span class="search-result-role">${roleIcon} ${result.role}</span>
            <span class="search-result-time">${timestamp}</span>
          </div>
          <div class="search-result-content">${snippet}</div>
        </div>
      `;
    }).join('');
    
    resultsContainer.innerHTML = resultsList;
    
    // Add click handlers to scroll to messages
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const messageId = item.getAttribute('data-message-id');
        this.scrollToMessage(messageId);
      });
    });
    
    this.updateSearchNavigation();
  }

  createSearchSnippet(content, searchTerm, maxLength = 150) {
    const terms = searchTerm.toLowerCase().split(/\s+/);
    const lowerContent = content.toLowerCase();
    
    // Find the best position to show (around the first match)
    let bestPosition = 0;
    for (const term of terms) {
      const pos = lowerContent.indexOf(term);
      if (pos !== -1) {
        bestPosition = Math.max(0, pos - 50);
        break;
      }
    }
    
    let snippet = content.substring(bestPosition, bestPosition + maxLength);
    if (bestPosition > 0) snippet = '...' + snippet;
    if (bestPosition + maxLength < content.length) snippet += '...';
    
    // Highlight search terms
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');
    });
    
    return snippet;
  }

  highlightSearchResults(results) {
    results.forEach(result => {
      this.highlightMessageContent(result.element, this.currentSearchTerm);
    });
  }

  highlightMessageContent(messageElement, searchTerm) {
    const bubble = messageElement.querySelector('.message-bubble');
    if (!bubble) return;
    
    const terms = searchTerm.split(/\s+/);
    let content = bubble.innerHTML;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      content = content.replace(regex, '<span class="search-highlight">$1</span>');
    });
    
    bubble.innerHTML = content;
    this.highlightedElements.push(bubble);
  }

  clearHighlights() {
    this.highlightedElements.forEach(element => {
      const content = element.innerHTML;
      element.innerHTML = content.replace(/<span class="search-highlight">(.*?)<\/span>/gi, '$1');
    });
    this.highlightedElements = [];
  }

  scrollToMessage(messageId) {
    const messageData = this.searchIndex.get(parseInt(messageId));
    if (messageData && messageData.element) {
      messageData.element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Temporarily highlight the message
      messageData.element.classList.add('search-target');
      setTimeout(() => {
        messageData.element.classList.remove('search-target');
      }, 2000);
    }
  }

  updateSearchNavigation() {
    const position = document.getElementById('search-position');
    const prevBtn = document.getElementById('search-prev-btn');
    const nextBtn = document.getElementById('search-next-btn');
    
    if (this.searchResults.length === 0) {
      position.textContent = '0 / 0';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } else {
      position.textContent = `1 / ${this.searchResults.length}`;
      prevBtn.disabled = false;
      nextBtn.disabled = this.searchResults.length <= 1;
    }
  }

  navigateSearchResults(direction) {
    // Implementation for navigating between search results
    // This would cycle through highlighted results
    console.log('Navigate search results:', direction);
  }

  clearSearch() {
    const searchInput = document.getElementById('chat-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.classList.add('hidden');
    
    this.currentSearchTerm = '';
    this.clearHighlights();
    this.displaySearchResults([]);
  }

  updateDateRange() {
    // Set default dates for custom range
    const startDate = document.getElementById('filter-start-date');
    const endDate = document.getElementById('filter-end-date');
    
    if (this.searchFilters.dateRange === 'custom' && startDate && endDate) {
      if (!startDate.value) {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate.value = monthAgo.toISOString().split('T')[0];
      }
      
      if (!endDate.value) {
        endDate.value = new Date().toISOString().split('T')[0];
      }
    }
  }

  setupPeriodicIndexUpdate() {
    // Update search index when new messages are added
    const observer = new MutationObserver(() => {
      this.buildSearchIndex();
    });
    
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      observer.observe(chatMessages, { childList: true });
    }
  }

  // Export functionality
  showExportDialog() {
    const dialog = this.createExportDialog();
    document.body.appendChild(dialog);
  }

  createExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'export-dialog-overlay';
    dialog.innerHTML = `
      <div class="export-dialog">
        <div class="export-dialog-header">
          <h3>Export Chat History</h3>
          <button class="export-dialog-close">✕</button>
        </div>
        
        <div class="export-dialog-content">
          <div class="export-option-group">
            <label class="export-label">Export Scope:</label>
            <div class="export-options">
              <label><input type="radio" name="export-scope" value="current" checked> Current Session</label>
              <label><input type="radio" name="export-scope" value="search"> Search Results (${this.searchResults.length} messages)</label>
              <label><input type="radio" name="export-scope" value="all"> All Sessions</label>
            </div>
          </div>
          
          <div class="export-option-group">
            <label class="export-label">Format:</label>
            <div class="export-formats">
              <select id="export-format" class="export-format-select">
                <option value="txt">Plain Text (.txt)</option>
                <option value="md">Markdown (.md)</option>
                <option value="json">JSON (.json)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="html">HTML (.html)</option>
              </select>
            </div>
          </div>
          
          <div class="export-option-group">
            <label class="export-label">Options:</label>
            <div class="export-checkboxes">
              <label><input type="checkbox" id="include-timestamps" checked> Include timestamps</label>
              <label><input type="checkbox" id="include-metadata" checked> Include metadata</label>
              <label><input type="checkbox" id="include-system-messages"> Include system messages</label>
            </div>
          </div>
        </div>
        
        <div class="export-dialog-footer">
          <button id="export-cancel-btn" class="btn btn-secondary">Cancel</button>
          <button id="export-confirm-btn" class="btn btn-primary">Export</button>
        </div>
      </div>
    `;
    
    // Event listeners for the dialog
    dialog.querySelector('.export-dialog-close').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    dialog.querySelector('#export-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    dialog.querySelector('#export-confirm-btn').addEventListener('click', () => {
      this.performExport(dialog);
      document.body.removeChild(dialog);
    });
    
    // Close on overlay click
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
    
    return dialog;
  }

  async performExport(dialog) {
    const scope = dialog.querySelector('input[name="export-scope"]:checked').value;
    const format = dialog.querySelector('#export-format').value;
    const includeTimestamps = dialog.querySelector('#include-timestamps').checked;
    const includeMetadata = dialog.querySelector('#include-metadata').checked;
    const includeSystemMessages = dialog.querySelector('#include-system-messages').checked;
    
    let messages = [];
    
    switch (scope) {
      case 'current':
        messages = this.getCurrentSessionMessages();
        break;
      case 'search':
        messages = this.searchResults.map(r => ({
          role: r.role,
          content: r.originalContent,
          timestamp: r.timestamp
        }));
        break;
      case 'all':
        messages = await this.getAllSessionMessages();
        break;
    }
    
    const exportData = {
      scope,
      format,
      messages,
      exportedAt: new Date().toISOString(),
      options: {
        includeTimestamps,
        includeMetadata,
        includeSystemMessages
      }
    };
    
    const exportResult = this.formatExportData(exportData);
    this.downloadExport(exportResult);
  }

  getCurrentSessionMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('.message:not(.typing-indicator)');
    
    messageElements.forEach(el => {
      const role = el.classList.contains('user') ? 'user' : 'assistant';
      const content = el.querySelector('.message-bubble')?.textContent || '';
      const timestamp = this.extractTimestamp(el);
      
      messages.push({ role, content, timestamp });
    });
    
    return messages;
  }

  async getAllSessionMessages() {
    // This would integrate with the chat persistence system
    if (window.chatPersistence) {
      const sessions = await window.chatPersistence.getSessionList();
      let allMessages = [];
      
      for (const session of sessions) {
        const sessionMessages = await window.chatPersistence.loadChatHistory(session.id);
        allMessages = allMessages.concat(sessionMessages);
      }
      
      return allMessages;
    }
    
    return this.getCurrentSessionMessages();
  }

  formatExportData(exportData) {
    switch (exportData.format) {
      case 'txt':
        return this.exportAsText(exportData);
      case 'md':
        return this.exportAsMarkdown(exportData);
      case 'json':
        return this.exportAsJSON(exportData);
      case 'csv':
        return this.exportAsCSV(exportData);
      case 'html':
        return this.exportAsHTML(exportData);
      default:
        return this.exportAsText(exportData);
    }
  }

  exportAsText(exportData) {
    let content = `DinoAir Chat Export\n`;
    content += `Exported: ${new Date(exportData.exportedAt).toLocaleString()}\n`;
    content += `Scope: ${exportData.scope}\n`;
    content += `Messages: ${exportData.messages.length}\n\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    exportData.messages.forEach(message => {
      if (exportData.options.includeTimestamps) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        content += `[${timestamp}] `;
      }
      
      content += `${message.role.toUpperCase()}: ${message.content}\n\n`;
    });
    
    return {
      content,
      filename: `dinoair-chat-${exportData.scope}-${new Date().toISOString().split('T')[0]}.txt`,
      mimeType: 'text/plain'
    };
  }

  exportAsMarkdown(exportData) {
    let content = `# DinoAir Chat Export\n\n`;
    content += `**Exported:** ${new Date(exportData.exportedAt).toLocaleString()}  \n`;
    content += `**Scope:** ${exportData.scope}  \n`;
    content += `**Messages:** ${exportData.messages.length}  \n\n`;
    content += `---\n\n`;
    
    exportData.messages.forEach(message => {
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      content += `## ${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n`;
      
      if (exportData.options.includeTimestamps) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        content += `*${timestamp}*\n\n`;
      }
      
      content += `${message.content}\n\n`;
      content += `---\n\n`;
    });
    
    return {
      content,
      filename: `dinoair-chat-${exportData.scope}-${new Date().toISOString().split('T')[0]}.md`,
      mimeType: 'text/markdown'
    };
  }

  exportAsJSON(exportData) {
    const jsonData = {
      export: {
        version: '1.0',
        exportedAt: exportData.exportedAt,
        scope: exportData.scope,
        options: exportData.options
      },
      messages: exportData.messages.map(message => ({
        role: message.role,
        content: message.content,
        timestamp: exportData.options.includeTimestamps ? message.timestamp : undefined
      }))
    };
    
    return {
      content: JSON.stringify(jsonData, null, 2),
      filename: `dinoair-chat-${exportData.scope}-${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json'
    };
  }

  exportAsCSV(exportData) {
    let content = 'Role,Content';
    if (exportData.options.includeTimestamps) {
      content += ',Timestamp';
    }
    content += '\n';
    
    exportData.messages.forEach(message => {
      const escapedContent = `"${message.content.replace(/"/g, '""')}"`;
      content += `${message.role},${escapedContent}`;
      
      if (exportData.options.includeTimestamps) {
        const timestamp = new Date(message.timestamp).toISOString();
        content += `,${timestamp}`;
      }
      
      content += '\n';
    });
    
    return {
      content,
      filename: `dinoair-chat-${exportData.scope}-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    };
  }

  exportAsHTML(exportData) {
    let content = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DinoAir Chat Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .message { margin: 20px 0; padding: 15px; border-radius: 10px; }
        .user { background: #3b82f6; color: white; margin-left: 60px; }
        .assistant { background: #f3f4f6; margin-right: 60px; }
        .role { font-weight: bold; margin-bottom: 5px; }
        .timestamp { font-size: 0.8em; opacity: 0.7; margin-bottom: 10px; }
        .content { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DinoAir Chat Export</h1>
        <p><strong>Exported:</strong> ${new Date(exportData.exportedAt).toLocaleString()}</p>
        <p><strong>Scope:</strong> ${exportData.scope}</p>
        <p><strong>Messages:</strong> ${exportData.messages.length}</p>
    </div>
    `;
    
    exportData.messages.forEach(message => {
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      content += `
    <div class="message ${message.role}">
        <div class="role">${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}</div>`;
      
      if (exportData.options.includeTimestamps) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        content += `<div class="timestamp">${timestamp}</div>`;
      }
      
      content += `<div class="content">${this.escapeHTML(message.content)}</div>
    </div>`;
    });
    
    content += `
</body>
</html>`;
    
    return {
      content,
      filename: `dinoair-chat-${exportData.scope}-${new Date().toISOString().split('T')[0]}.html`,
      mimeType: 'text/html'
    };
  }

  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  downloadExport(exportResult) {
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    // Show success notification
    if (window.errorHandler) {
      window.errorHandler.showSuccess(`Chat exported successfully as ${exportResult.filename}`);
    }
  }

  // Public API methods
  showSearchInterface() {
    const searchInterface = document.getElementById('chat-search-interface');
    if (searchInterface) {
      searchInterface.classList.remove('hidden');
      document.getElementById('chat-search-input')?.focus();
    }
  }

  hideSearchInterface() {
    const searchInterface = document.getElementById('chat-search-interface');
    if (searchInterface) {
      searchInterface.classList.add('hidden');
      this.clearSearch();
    }
  }

  isSearchVisible() {
    const searchInterface = document.getElementById('chat-search-interface');
    return searchInterface && !searchInterface.classList.contains('hidden');
  }

  exportCurrentSession() {
    this.showExportDialog();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.chatSearchManager = new ChatSearchManager();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatSearchManager;
}