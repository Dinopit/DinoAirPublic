/**
 * DinoAir Models Management
 * Handles model selection and configuration with loading states
 */

class ModelsManager {
  constructor() {
    this.currentModel = null;
    this.availableModels = [];
    this.modelModal = document.getElementById('model-modal');
    this.modelList = document.getElementById('model-list');
    this.changeModelBtn = document.getElementById('change-model-btn');
    this.selectModelBtn = document.getElementById('select-model-btn');
    this.cancelModelBtn = document.getElementById('cancel-model-btn');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadAvailableModels();
  }

  setupEventListeners() {
    this.changeModelBtn?.addEventListener('click', () => this.openModelModal());
    this.selectModelBtn?.addEventListener('click', () => this.selectModel());
    this.cancelModelBtn?.addEventListener('click', () => this.closeModelModal());
    this.modalCloseBtn?.addEventListener('click', () => this.closeModelModal());
    
    this.modelModal?.addEventListener('click', (e) => {
      if (e.target === this.modelModal) {
        this.closeModelModal();
      }
    });

    this.modelList?.addEventListener('click', (e) => {
      const modelItem = e.target.closest('.model-item');
      if (modelItem) {
        this.selectModelItem(modelItem);
      }
    });
  }

  async openModelModal() {
    if (!this.modelModal) return;
    
    this.modelModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    await this.loadAvailableModels();
  }

  closeModelModal() {
    if (!this.modelModal) return;
    
    this.modelModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  async loadAvailableModels() {
    if (!this.modelList) return;

    try {
      window.loadingManager.show('model-list', {
        showSpinner: true,
        showMessage: true,
        message: 'Loading available models...',
        disableInteraction: false,
        timeout: 15000
      });

      const response = await API.get('/models');
      this.availableModels = response.models || [];
      this.renderModelList();
      
    } catch (error) {
      console.error('Failed to load models:', error);
      this.showModelError('Failed to load available models. Please try again.');
    } finally {
      window.loadingManager.hide('model-list');
    }
  }

  renderModelList() {
    if (!this.modelList || !this.availableModels.length) {
      this.showModelError('No models available.');
      return;
    }

    this.modelList.innerHTML = '';
    
    this.availableModels.forEach(model => {
      const modelItem = this.createModelItem(model);
      this.modelList.appendChild(modelItem);
    });

    if (this.currentModel) {
      const currentItem = this.modelList.querySelector(`[data-model-id="${this.currentModel.id}"]`);
      if (currentItem) {
        this.selectModelItem(currentItem);
      }
    }
  }

  createModelItem(model) {
    const item = document.createElement('div');
    item.className = 'model-item';
    item.setAttribute('data-model-id', model.id);
    
    item.innerHTML = `
      <div class="model-radio"></div>
      <div class="model-details">
        <div class="model-name">${this.escapeHtml(model.name)}</div>
        <div class="model-description">${this.escapeHtml(model.description || 'No description available')}</div>
        <div class="model-meta">
          ${model.size ? `<span class="model-size">${model.size}</span>` : ''}
          ${model.performance ? `<span class="model-performance">${model.performance}</span>` : ''}
        </div>
      </div>
    `;
    
    return item;
  }

  selectModelItem(item) {
    this.modelList.querySelectorAll('.model-item').forEach(el => {
      el.classList.remove('selected');
    });
    
    item.classList.add('selected');
    
    if (this.selectModelBtn) {
      this.selectModelBtn.disabled = false;
    }
  }

  async selectModel() {
    const selectedItem = this.modelList.querySelector('.model-item.selected');
    if (!selectedItem) return;

    const modelId = selectedItem.getAttribute('data-model-id');
    const model = this.availableModels.find(m => m.id === modelId);
    
    if (!model) return;

    try {
      window.loadingManager.show('select-model-btn', {
        showSpinner: true,
        showMessage: true,
        message: 'Selecting...',
        disableInteraction: true
      });

      const response = await API.post('/models/select', { modelId: model.id });
      
      if (response.success) {
        this.currentModel = model;
        this.updateCurrentModelDisplay();
        this.closeModelModal();
        
        if (window.NotificationManager) {
          window.NotificationManager.show({
            type: 'success',
            title: 'Model Selected',
            message: `Successfully switched to ${model.name}`,
            timeout: 3000
          });
        }
      } else {
        throw new Error(response.error || 'Failed to select model');
      }
      
    } catch (error) {
      console.error('Failed to select model:', error);
      
      if (window.NotificationManager) {
        window.NotificationManager.show({
          type: 'error',
          title: 'Model Selection Failed',
          message: error.message || 'Failed to select model. Please try again.',
          timeout: 5000
        });
      }
    } finally {
      window.loadingManager.hide('select-model-btn');
    }
  }

  updateCurrentModelDisplay() {
    const currentModelElement = document.getElementById('current-model');
    if (currentModelElement && this.currentModel) {
      currentModelElement.textContent = this.currentModel.name;
    }
  }

  async getCurrentModel() {
    try {
      const response = await API.get('/models/current');
      this.currentModel = response.model;
      this.updateCurrentModelDisplay();
      return this.currentModel;
    } catch (error) {
      console.error('Failed to get current model:', error);
      return null;
    }
  }

  showModelError(message) {
    if (!this.modelList) return;
    
    this.modelList.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${this.escapeHtml(message)}</div>
        <button class="btn btn-sm btn-primary" onclick="window.modelsManager.loadAvailableModels()">
          Retry
        </button>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getAvailableModels() {
    return [...this.availableModels];
  }

  getCurrentModelInfo() {
    return this.currentModel ? { ...this.currentModel } : null;
  }

  async refreshModels() {
    await this.loadAvailableModels();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.modelsManager = new ModelsManager();
});
