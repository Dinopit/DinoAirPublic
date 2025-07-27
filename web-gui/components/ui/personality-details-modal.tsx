'use client';

import { X, Copy, Download } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';

import type { Personality } from '@/lib/stores/personality-store';
import { toast } from '@/lib/stores/toast-store';

interface PersonalityDetailsModalProps {
  personality: Personality | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PersonalityDetailsModal: React.FC<PersonalityDetailsModalProps> = ({
  personality,
  isOpen,
  onClose
}) => {
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

  // Copy system prompt to clipboard
  const copySystemPrompt = useCallback(() => {
    if (personality?.systemPrompt) {
      navigator.clipboard.writeText(personality.systemPrompt)
        .then(() => {
          toast.success('System prompt copied to clipboard');
        })
        .catch(() => {
          toast.error('Failed to copy system prompt');
        });
    }
  }, [personality]);

  // Export personality as JSON
  const exportPersonality = useCallback(() => {
    if (!personality) return;

    const exportData = {
      id: personality.id,
      name: personality.name,
      description: personality.description,
      systemPrompt: personality.systemPrompt,
      temperature: personality.temperature,
      maxTokens: personality.maxTokens,
      isDefault: personality.isDefault,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personality-${personality.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Personality exported successfully');
  }, [personality]);

  if (!isOpen || !personality) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold capitalize">
              {personality.id === 'mentally-unstable' && <span className="mr-2">🎲</span>}
              {personality.name} Personality
            </h2>
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
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <p className="text-muted-foreground">
                {personality.description || 'No description available'}
              </p>
            </div>

            {/* System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">System Prompt</h3>
                <button
                  onClick={copySystemPrompt}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {personality.systemPrompt || 'No system prompt defined'}
                </pre>
              </div>
            </div>

            {/* Optional Parameters */}
            <div>
              <h3 className="text-lg font-medium mb-2">Parameters</h3>
              <div className="space-y-2">
                {personality.temperature !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">{personality.temperature}</span>
                  </div>
                )}
                {personality.maxTokens !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Tokens:</span>
                    <span className="font-medium">{personality.maxTokens}</span>
                  </div>
                )}
                {!personality.temperature && !personality.maxTokens && (
                  <p className="text-muted-foreground">No custom parameters defined</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            {(personality.createdAt || personality.updatedAt) && (
              <div>
                <h3 className="text-lg font-medium mb-2">Metadata</h3>
                <div className="space-y-2 text-sm">
                  {personality.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(personality.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {personality.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span>{new Date(personality.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-muted/30">
            <div className="flex justify-between items-center">
              <div>
                {personality.isDefault && (
                  <span className="text-sm px-3 py-1 bg-primary/20 text-primary rounded-full">
                    Default Personality
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportPersonality}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
