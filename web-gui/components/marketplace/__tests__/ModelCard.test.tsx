import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelCard from '../ModelCard';
import { ModelMetadata, ModelCategory } from '@/lib/services/model-registry';

describe('ModelCard', () => {
  const mockModel: ModelMetadata = {
    id: 'test-model-1',
    name: 'Test Model',
    version: '1.0.0',
    description: 'A test model for unit testing',
    author: 'Test Author',
    category: ModelCategory.CHAT,
    tags: ['test', 'chat', 'ai'],
    size: 1500000000, // 1.5GB
    downloadUrl: 'http://example.com/model',
    performance: {
      benchmarks: {
        accuracy: 87.5,
        speed: 45,
        memoryUsage: 1500
      },
      requirements: {
        minRam: 4096,
        minVram: 2048,
        cpuCores: 4
      }
    },
    requirements: {
      runtime: 'ollama',
      minRam: 4096,
      supportedFormats: ['gguf']
    },
    license: 'MIT',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    downloads: 1250,
    rating: 4.5,
    isLocal: false,
    isInstalled: false
  };

  const mockOnInstallToggle = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render model information correctly', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('Test Model')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('A test model for unit testing')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('1.40 GB')).toBeInTheDocument(); // Formatted size
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Formatted downloads
    expect(screen.getByText('4.5')).toBeInTheDocument(); // Rating
  });

  it('should display tags correctly', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
  });

  it('should show install button for uninstalled models', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    const installButton = screen.getByText('Install');
    expect(installButton).toBeInTheDocument();
    expect(installButton).toBeEnabled();
  });

  it('should show uninstall button for installed models', () => {
    const installedModel = { ...mockModel, isInstalled: true };
    
    render(
      <ModelCard
        model={installedModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    const uninstallButton = screen.getByText('Uninstall');
    expect(uninstallButton).toBeInTheDocument();
    expect(uninstallButton).toBeEnabled();
  });

  it('should call onInstallToggle when install button is clicked', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    const installButton = screen.getByText('Install');
    fireEvent.click(installButton);

    expect(mockOnInstallToggle).toHaveBeenCalledTimes(1);
  });

  it('should show select button when onSelect is provided', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
        onSelect={mockOnSelect}
      />
    );

    const selectButton = screen.getByText('Select');
    expect(selectButton).toBeInTheDocument();

    fireEvent.click(selectButton);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should display installation progress', () => {
    const installProgress = {
      id: 'test-model-1',
      status: 'downloading' as const,
      progress: 65,
      message: 'Downloading model...',
      downloadedBytes: 975000000,
      totalBytes: 1500000000
    };

    render(
      <ModelCard
        model={mockModel}
        installProgress={installProgress}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('Downloading model...')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('930.18 MB / 1.40 GB')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar', { hidden: true });
    expect(progressBar).toHaveStyle('width: 65%');
  });

  it('should disable install button during installation', () => {
    const installProgress = {
      id: 'test-model-1',
      status: 'downloading' as const,
      progress: 50,
      message: 'Downloading...'
    };

    render(
      <ModelCard
        model={mockModel}
        installProgress={installProgress}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    const installButton = screen.getByText('Downloading...');
    expect(installButton).toBeDisabled();
  });

  it('should show external badge for HuggingFace models', () => {
    const externalModel = {
      ...mockModel,
      huggingFaceId: 'microsoft/DialoGPT-medium'
    };

    render(
      <ModelCard
        model={externalModel}
        onInstallToggle={mockOnInstallToggle}
        showExternalBadge={true}
      />
    );

    expect(screen.getByText('HF')).toBeInTheDocument();
    expect(screen.getByText('View on Hugging Face')).toBeInTheDocument();
  });

  it('should display model performance metrics', () => {
    render(
      <ModelCard
        model={mockModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('87.5%')).toBeInTheDocument(); // Accuracy
  });

  it('should handle models with limited tags', () => {
    const modelWithManyTags = {
      ...mockModel,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
    };

    render(
      <ModelCard
        model={modelWithManyTags}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument(); // Shows remaining count
  });

  it('should show installed indicator', () => {
    const installedModel = { ...mockModel, isInstalled: true };
    
    render(
      <ModelCard
        model={installedModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    const installedIndicator = screen.getByTitle('Installed');
    expect(installedIndicator).toBeInTheDocument();
    expect(installedIndicator).toHaveClass('bg-green-500');
  });

  it('should format category names correctly', () => {
    const codeModel = {
      ...mockModel,
      category: ModelCategory.CODE_GENERATION
    };

    render(
      <ModelCard
        model={codeModel}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('Code Generation')).toBeInTheDocument();
  });

  it('should handle unknown sizes gracefully', () => {
    const modelWithUnknownSize = { ...mockModel, size: 0 };
    
    render(
      <ModelCard
        model={modelWithUnknownSize}
        onInstallToggle={mockOnInstallToggle}
      />
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});