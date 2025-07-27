'use client';

import { X, Upload, FileJson, AlertCircle } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';

import { apiClient } from '@/lib/api/enhanced-client';
import { toast } from '@/lib/stores/toast-store';

interface PersonalityImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportedPersonality {
  id?: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  system_prompt?: string; // Support both formats
  temperature?: number;
  maxTokens?: number;
  max_tokens?: number; // Support both formats
  isDefault?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export const PersonalityImportModal: React.FC<PersonalityImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportedPersonality | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewData(null);
      setValidationErrors([]);
      setIsImporting(false);
    }
  }, [isOpen]);

  // Validate personality data
  const validatePersonality = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (data.description && typeof data.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    }

    // Support both systemPrompt and system_prompt
    const systemPrompt = data.systemPrompt || data.system_prompt;
    if (systemPrompt && typeof systemPrompt !== 'string') {
      errors.push({ field: 'systemPrompt', message: 'System prompt must be a string' });
    }

    if (data.temperature !== undefined) {
      const temp = parseFloat(data.temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        errors.push({ field: 'temperature', message: 'Temperature must be between 0 and 2' });
      }
    }

    // Support both maxTokens and max_tokens
    const maxTokens = data.maxTokens || data.max_tokens;
    if (maxTokens !== undefined) {
      const tokens = parseInt(maxTokens);
      if (isNaN(tokens) || tokens < 1) {
        errors.push({ field: 'maxTokens', message: 'Max tokens must be a positive number' });
      }
    }

    return errors;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (selectedFile.size > 100 * 1024) {
      toast.error('File too large', 'File must be less than 100KB');
      return;
    }

    setFile(selectedFile);
    setValidationErrors([]);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      // Validate the data
      const errors = validatePersonality(data);
      if (errors.length > 0) {
        setValidationErrors(errors);
        setPreviewData(null);
        return;
      }

      // Normalize the data format
      const normalized: ImportedPersonality = {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt || data.system_prompt,
        temperature: data.temperature,
        maxTokens: data.maxTokens || data.max_tokens,
        isDefault: data.isDefault
      };

      setPreviewData(normalized);
    } catch (error) {
      setValidationErrors([{ field: 'file', message: 'Invalid JSON file' }]);
      setPreviewData(null);
    }
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/json') {
        handleFileSelect(droppedFile);
      } else {
        toast.error('Invalid file type', 'Please select a JSON file');
      }
    }
  }, [handleFileSelect]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!file || !previewData) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/v1/personalities/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Personality imported successfully');
      onImportSuccess();
      onClose();
    } catch (error) {
      toast.error(
        'Import failed',
        error instanceof Error ? error.message : 'Failed to import personality'
      );
    } finally {
      setIsImporting(false);
    }
  }, [file, previewData, onImportSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">Import Personality</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* File Upload Area */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileJson className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drop your personality JSON file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse (max 100KB)
              </p>
              <input
                type="file"
                id="personality-file-input"
                accept=".json,application/json"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    handleFileSelect(selectedFile);
                  }
                }}
                className="hidden"
              />
              <label
                htmlFor="personality-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>
            </div>

            {/* Selected File */}
            {file && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileJson className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-red-500">Validation Failed</p>
                    <ul className="text-sm text-red-500/80 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error.field}: {error.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {previewData && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preview</h3>
                
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Name:</p>
                    <p className="font-medium capitalize">{previewData.name}</p>
                  </div>
                  
                  {previewData.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description:</p>
                      <p>{previewData.description}</p>
                    </div>
                  )}
                  
                  {previewData.systemPrompt && (
                    <div>
                      <p className="text-sm text-muted-foreground">System Prompt:</p>
                      <p className="text-sm font-mono bg-background p-2 rounded mt-1">
                        {previewData.systemPrompt.substring(0, 200)}
                        {previewData.systemPrompt.length > 200 && '...'}
                      </p>
                    </div>
                  )}
                  
                  {(previewData.temperature !== undefined || previewData.maxTokens !== undefined) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Parameters:</p>
                      <div className="text-sm space-y-1 mt-1">
                        {previewData.temperature !== undefined && (
                          <p>Temperature: {previewData.temperature}</p>
                        )}
                        {previewData.maxTokens !== undefined && (
                          <p>Max Tokens: {previewData.maxTokens}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-muted/30">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!previewData || isImporting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Personality
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
