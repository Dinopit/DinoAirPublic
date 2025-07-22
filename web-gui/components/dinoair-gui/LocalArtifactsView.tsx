'use client';

import React, { useState, useEffect } from 'react';

interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: Date;
}

const LocalArtifactsView = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate artifact structure
  const isValidArtifact = (artifact: any): boolean => {
    return (
      artifact &&
      typeof artifact === 'object' &&
      typeof artifact.id === 'string' &&
      typeof artifact.name === 'string' &&
      typeof artifact.type === 'string' &&
      typeof artifact.content === 'string' &&
      artifact.createdAt
    );
  };

  // Load artifacts from localStorage with error handling
  useEffect(() => {
    const loadArtifacts = () => {
      try {
        const stored = localStorage.getItem('dinoair-artifacts');
        
        if (!stored) {
          // No data exists, initialize with empty array
          setArtifacts([]);
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(stored);
        } catch (parseError) {
          console.error('Failed to parse artifacts from localStorage:', parseError);
          setErrorMessage('Corrupted artifacts data detected. Resetting to empty state.');
          
          // Clear corrupted data
          localStorage.removeItem('dinoair-artifacts');
          setArtifacts([]);
          
          // Clear error message after 5 seconds
          setTimeout(() => setErrorMessage(''), 5000);
          return;
        }

        // Validate that parsed data is an array
        if (!Array.isArray(parsed)) {
          console.error('Artifacts data is not an array:', parsed);
          setErrorMessage('Invalid artifacts format detected. Resetting to empty state.');
          
          // Clear invalid data
          localStorage.removeItem('dinoair-artifacts');
          setArtifacts([]);
          
          // Clear error message after 5 seconds
          setTimeout(() => setErrorMessage(''), 5000);
          return;
        }

        // Validate and filter artifacts
        const validArtifacts = parsed
          .filter(isValidArtifact)
          .map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt)
          }));

        // If some artifacts were invalid, show a warning
        if (validArtifacts.length < parsed.length) {
          const invalidCount = parsed.length - validArtifacts.length;
          setErrorMessage(`Removed ${invalidCount} invalid artifact(s).`);
          
          // Save only valid artifacts back to localStorage
          localStorage.setItem('dinoair-artifacts', JSON.stringify(validArtifacts));
          
          // Clear error message after 5 seconds
          setTimeout(() => setErrorMessage(''), 5000);
        }

        setArtifacts(validArtifacts);
      } catch (error) {
        console.error('Unexpected error loading artifacts:', error);
        setErrorMessage('Failed to load artifacts. Starting with empty state.');
        setArtifacts([]);
        
        // Clear error message after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
      }
    };
    
    loadArtifacts();
  }, []);

  // Save artifacts to localStorage with validation
  const saveArtifacts = (newArtifacts: Artifact[]) => {
    try {
      // Ensure all artifacts are valid before saving
      const validArtifacts = newArtifacts.filter(isValidArtifact);
      
      if (validArtifacts.length < newArtifacts.length) {
        console.warn('Some artifacts were invalid and not saved');
      }
      
      localStorage.setItem('dinoair-artifacts', JSON.stringify(validArtifacts));
      setArtifacts(validArtifacts);
    } catch (error) {
      console.error('Failed to save artifacts:', error);
      setErrorMessage('Failed to save artifacts. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleView = (artifact: Artifact) => {
    setViewingArtifact(artifact);
  };

  const handleEdit = (artifact: Artifact) => {
    setEditedContent(artifact.content);
    setEditingArtifact(artifact);
  };

  const handleSaveEdit = () => {
    if (!editingArtifact) return;
    
    const updatedArtifacts = artifacts.map(a => 
      a.id === editingArtifact.id 
        ? { ...a, content: editedContent }
        : a
    );
    
    saveArtifacts(updatedArtifacts);
    setEditingArtifact(null);
    setEditedContent('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this artifact?')) {
      const filteredArtifacts = artifacts.filter(a => a.id !== id);
      saveArtifacts(filteredArtifacts);
    }
  };

  const handleDownload = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddSample = () => {
    const newArtifact: Artifact = {
      id: Date.now().toString(),
      name: `sample-${Date.now()}.txt`,
      type: 'text',
      content: 'This is a sample artifact created in DinoAir Free Tier.',
      createdAt: new Date()
    };
    saveArtifacts([...artifacts, newArtifact]);
  };

  const handleResetArtifacts = () => {
    if (confirm('Are you sure you want to clear all artifacts? This action cannot be undone.')) {
      try {
        localStorage.removeItem('dinoair-artifacts');
        setArtifacts([]);
        setErrorMessage('All artifacts have been cleared.');
        
        // Clear success message after 3 seconds
        setTimeout(() => setErrorMessage(''), 3000);
      } catch (error) {
        console.error('Failed to reset artifacts:', error);
        setErrorMessage('Failed to clear artifacts. Please try again.');
        
        // Clear error message after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
      }
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Artifacts</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddSample}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Add Sample Artifact
            </button>
            {artifacts.length > 0 && (
              <button
                onClick={handleResetArtifacts}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}
        
        <div className="space-y-4">
          {artifacts.length > 0 ? (
            artifacts.map((artifact) => (
              <div 
                key={artifact.id} 
                className="p-4 bg-card border rounded-lg flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-foreground">{artifact.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {artifact.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleView(artifact)} 
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleEdit(artifact)} 
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDownload(artifact)} 
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Download
                  </button>
                  <button 
                    onClick={() => handleDelete(artifact.id)} 
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No artifacts found.</p>
              <p className="text-sm text-muted-foreground">
                Artifacts will appear here when created through the chat interface.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-lg font-bold mb-4">Edit {editingArtifact.name}</h2>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-64 p-3 border rounded-lg bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setEditingArtifact(null)}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <h2 className="text-lg font-bold mb-4">{viewingArtifact.name}</h2>
            <pre className="w-full h-64 p-3 border rounded-lg bg-muted text-foreground font-mono text-sm overflow-auto">
              {viewingArtifact.content}
            </pre>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setViewingArtifact(null)}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalArtifactsView;