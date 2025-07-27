# AI Model Marketplace Documentation

## Overview

The AI Model Marketplace is a comprehensive platform integrated into DinoAir that allows users to discover, install, manage, and optimize AI models. It provides a complete ecosystem for working with various AI models including chat models, code generation models, creative writing assistants, and domain-specific models.

## Features

### 🤖 Model Discovery & Management
- **Model Registry**: Centralized catalog of available models with metadata
- **Hugging Face Integration**: Search and discover models from Hugging Face Hub
- **Model Categories**: Organized by use case (chat, code, creative, analysis, etc.)
- **Installation Management**: One-click install/uninstall with progress tracking
- **Version Control**: Track different versions of models

### 🔍 Advanced Search & Filtering
- **Multi-source Search**: Search local registry and external repositories
- **Category Filtering**: Filter by model type and use case
- **Tag-based Discovery**: Find models by capabilities and features
- **Performance Filtering**: Filter by speed, accuracy, and resource requirements

### 🎯 Model Training Pipeline
- **Dataset Management**: Upload and manage training datasets
- **Fine-tuning**: Customize models on your data using LoRA and other techniques
- **Training Templates**: Pre-configured templates for common use cases
- **Progress Monitoring**: Real-time training progress and metrics
- **Distributed Training**: Support for multi-GPU and distributed setups

### ⚡ Model Optimization
- **Quantization**: Reduce model size with 4-bit, 8-bit, and 16-bit quantization
- **Pruning**: Remove unnecessary parameters for faster inference
- **Model Compression**: Advanced optimization techniques
- **Performance Analysis**: Compare optimized vs original models
- **ONNX Support**: Export models to ONNX for web deployment

### 📊 Usage Analytics
- **Performance Metrics**: Track response times, throughput, and accuracy
- **User Preferences**: Learn from usage patterns for better recommendations
- **Model Comparison**: Compare different models across various metrics
- **Real-time Monitoring**: Live performance dashboards
- **A/B Testing**: Compare model variants

### 🛡️ Privacy & Security
- **Local Execution**: Run models entirely on your machine
- **Data Privacy**: No data sent to external servers
- **Secure Installation**: Verified model downloads
- **Usage Tracking**: Optional analytics with full user control

## Architecture

### Core Services

#### ModelRegistry (`model-registry.ts`)
```typescript
// Central registry for all model metadata
const registry = ModelRegistry.getInstance();

// Register a new model
await registry.registerModel({
  name: 'custom-chat-model',
  version: '1.0.0',
  description: 'A custom fine-tuned chat model',
  category: ModelCategory.CHAT,
  // ... other metadata
});

// Search and filter models
const chatModels = await registry.getModels({
  category: ModelCategory.CHAT,
  installed: true
});
```

#### ModelTrainingService (`model-training.ts`)
```typescript
// Upload training dataset
const dataset = await trainingService.uploadDataset(file, {
  name: 'Customer Support Dataset',
  type: 'chat',
  format: 'jsonl'
});

// Create training job
const job = await trainingService.createTrainingJob(
  'Custom Support Model',
  {
    baseModelId: 'qwen:7b-chat-v1.5-q4_K_M',
    datasetId: dataset.id,
    parameters: {
      epochs: 3,
      batchSize: 4,
      learningRate: 5e-5
    }
  },
  'user123'
);
```

#### ModelOptimizationService (`model-optimization.ts`)
```typescript
// Create optimization job
const optimization = await optimizationService.createOptimizationJob(
  'Quantized Chat Model',
  'original-model-id',
  {
    type: 'quantization',
    quantization: {
      method: 'static',
      bits: 8,
      dataType: 'int8'
    }
  }
);
```

#### ModelAnalyticsService (`model-analytics.ts`)
```typescript
// Track model usage
await analyticsService.trackEvent({
  modelId: 'qwen:7b-chat-v1.5-q4_K_M',
  userId: 'user123',
  sessionId: 'session456',
  eventType: 'inference_complete',
  metadata: {
    inputTokens: 50,
    outputTokens: 100,
    responseTime: 1200
  }
});

// Get model metrics
const metrics = await analyticsService.getModelMetrics(
  'qwen:7b-chat-v1.5-q4_K_M',
  { start: '2024-01-01', end: '2024-01-31' }
);
```

### API Endpoints

#### Model Marketplace APIs
- `GET /api/marketplace/models` - List and filter models
- `GET /api/marketplace/models/[id]` - Get model details
- `POST /api/marketplace/models/[id]/install` - Install model with progress
- `DELETE /api/marketplace/models/[id]/install` - Uninstall model
- `GET /api/marketplace/search` - Search external repositories

#### Training APIs
- `GET /api/training/jobs` - List training jobs
- `POST /api/training/jobs` - Create new training job
- `GET /api/training/datasets` - List datasets
- `POST /api/training/datasets` - Upload dataset

### Frontend Components

#### ModelMarketplace
Main marketplace interface with search, filtering, and model management.

```tsx
import ModelMarketplace from '@/components/marketplace/ModelMarketplace';

<ModelMarketplace
  onModelSelect={(model) => console.log('Selected:', model)}
  showInstalled={true}
/>
```

#### ModelCard
Individual model display with installation controls.

```tsx
import ModelCard from '@/components/marketplace/ModelCard';

<ModelCard
  model={modelData}
  onInstallToggle={() => handleInstall()}
  installProgress={progressData}
/>
```

#### React Hooks

##### useMarketplace
Complete marketplace state management.

```tsx
const {
  models,
  isLoading,
  installModel,
  searchExternal,
  updateFilters
} = useMarketplace();
```

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- 8GB+ RAM (16GB+ recommended)
- Optional: CUDA-compatible GPU for training

### Installation
The marketplace is integrated into DinoAir and requires no additional setup. It's automatically available in the main interface under the "Models" tab.

### Configuration
Default models are automatically initialized. You can customize the available models by:

1. **Adding Custom Models**: Use the model registry API
2. **Configuring External Sources**: Update Hugging Face integration settings
3. **Setting Resource Limits**: Configure memory and compute limits for training

## Usage Guide

### Browsing Models

1. **Open the Marketplace**: Click the "Models" tab (🤖) in the main navigation
2. **Browse Categories**: Use the category filter to find specific types of models
3. **Search Models**: Use the search bar to find models by name, description, or tags
4. **External Search**: Click "Search Hugging Face" to discover new models

### Installing Models

1. **Find a Model**: Browse or search for the model you want
2. **Check Requirements**: Review memory and compute requirements
3. **Install**: Click the "Install" button
4. **Monitor Progress**: Watch the real-time installation progress
5. **Use Model**: Switch to the installed model in chat or other interfaces

### Training Custom Models

1. **Prepare Dataset**: Format your data as JSONL, CSV, or text files
2. **Upload Dataset**: Go to Training > Datasets and upload your file
3. **Choose Base Model**: Select a pre-trained model to fine-tune
4. **Configure Training**: Set epochs, batch size, and other parameters
5. **Start Training**: Monitor progress in real-time
6. **Use Trained Model**: Install and use your custom model

### Optimizing Models

1. **Select Model**: Choose a model to optimize
2. **Choose Optimization**: Select quantization, pruning, or combination
3. **Configure Settings**: Set target compression ratio and quality preferences
4. **Run Optimization**: Monitor the optimization process
5. **Compare Results**: Review performance improvements and quality impact

## API Reference

### Model Metadata Interface
```typescript
interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: ModelCategory;
  tags: string[];
  size: number;
  downloadUrl: string;
  performance: ModelPerformance;
  requirements: ModelRequirements;
  license: string;
  isInstalled: boolean;
}
```

### Training Configuration
```typescript
interface TrainingConfig {
  baseModelId: string;
  datasetId: string;
  parameters: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    maxLength: number;
    lora?: LoRAConfig;
    quantization?: QuantizationConfig;
  };
  hardware: HardwareConfig;
  evaluation: EvaluationConfig;
}
```

### Optimization Configuration
```typescript
interface OptimizationConfig {
  type: 'quantization' | 'pruning' | 'distillation';
  quantization?: {
    method: 'dynamic' | 'static' | 'qat';
    bits: 4 | 8 | 16;
    dataType: 'int8' | 'int4' | 'fp16';
  };
  pruning?: {
    method: 'structured' | 'unstructured';
    sparsity: number;
  };
}
```

## Examples

### Basic Model Management
```typescript
// Get all installed chat models
const chatModels = await modelRegistry.getModels({
  category: ModelCategory.CHAT,
  installed: true
});

// Install a specific model
await modelRegistry.installModel('codellama:7b-instruct');

// Search Hugging Face for models
const searchResults = await modelRegistry.searchHuggingFaceModels('sentiment analysis');
```

### Training a Custom Model
```typescript
// Upload training data
const dataset = await trainingService.uploadDataset(file, {
  name: 'Code Comments Dataset',
  type: 'completion',
  format: 'jsonl',
  uploadedBy: 'user123'
});

// Start training
const job = await trainingService.createTrainingJob('Code Comment Model', {
  baseModelId: 'codellama:7b-instruct',
  datasetId: dataset.id,
  parameters: {
    epochs: 5,
    batchSize: 2,
    learningRate: 2e-5,
    maxLength: 2048
  }
}, 'user123');
```

### Model Optimization
```typescript
// Quantize a model to 8-bit
const optimization = await optimizationService.createOptimizationJob(
  'Quantized Chat Model',
  'qwen:7b-chat-v1.5-q4_K_M',
  {
    type: 'quantization',
    quantization: {
      method: 'static',
      bits: 8,
      dataType: 'int8',
      preserveAccuracy: true,
      targetReduction: 75
    }
  }
);
```

### Analytics and Monitoring
```typescript
// Track model usage
await analyticsService.trackEvent({
  modelId: 'custom-model-id',
  userId: 'user123',
  sessionId: 'session456',
  eventType: 'inference_complete',
  metadata: {
    inputTokens: 100,
    outputTokens: 200,
    responseTime: 1500
  }
});

// Get performance metrics
const metrics = await analyticsService.getModelMetrics('custom-model-id');
console.log('Average response time:', metrics.usage.averageResponseTime);
console.log('User satisfaction:', metrics.userFeedback.satisfactionScore);
```

## Best Practices

### Model Selection
- **Match Use Case**: Choose models specifically designed for your task
- **Consider Resources**: Ensure your hardware can handle the model requirements
- **Check Performance**: Review benchmarks and user ratings
- **Test First**: Try models before committing to training or optimization

### Training
- **Quality Data**: Use high-quality, relevant training data
- **Start Small**: Begin with smaller models and datasets
- **Monitor Progress**: Watch for overfitting and adjust parameters
- **Validate Results**: Test on separate validation data

### Optimization
- **Baseline First**: Measure original performance before optimization
- **Gradual Approach**: Start with conservative settings
- **Quality Checks**: Validate that optimized models meet quality requirements
- **A/B Testing**: Compare optimized models with originals in real usage

### Performance
- **Regular Monitoring**: Track model performance over time
- **User Feedback**: Collect and analyze user satisfaction data
- **Resource Optimization**: Monitor memory and compute usage
- **Continuous Improvement**: Use analytics to guide model selection and optimization

## Troubleshooting

### Installation Issues
- **Insufficient Memory**: Ensure adequate RAM/VRAM for the model
- **Network Issues**: Check internet connection for downloads
- **Storage Space**: Verify available disk space
- **Permissions**: Ensure write permissions to model directory

### Training Problems
- **Data Format**: Verify dataset format matches requirements
- **Resource Limits**: Check GPU memory and adjust batch size
- **Convergence Issues**: Adjust learning rate and other hyperparameters
- **Quality Issues**: Review training data quality and quantity

### Performance Issues
- **Slow Inference**: Consider model optimization or hardware upgrade
- **High Memory Usage**: Use quantized models or reduce batch size
- **Poor Quality**: Check model suitability for your use case
- **Inconsistent Results**: Review model configuration and parameters

## Support & Community

- **Documentation**: Complete API and usage documentation
- **Examples**: Sample code and tutorials
- **Community**: Discord channel for discussions and support
- **Issue Tracking**: GitHub issues for bug reports and feature requests

## Roadmap

### Current Features ✅
- Model discovery and installation
- Basic training pipeline
- Model optimization
- Usage analytics
- Hugging Face integration

### Upcoming Features 🚧
- Advanced training techniques (QLora, full fine-tuning)
- Model serving and deployment
- Collaborative model sharing
- Advanced analytics dashboard
- Integration with more model repositories

### Future Plans 🔮
- Federated learning support
- Automated model optimization
- Custom model architectures
- Enterprise features
- Mobile model support

---

For more information, visit the [DinoAir GitHub repository](https://github.com/Dinopit/DinoAirPublic) or join our [Discord community](https://discord.gg/GVd4jSh3).