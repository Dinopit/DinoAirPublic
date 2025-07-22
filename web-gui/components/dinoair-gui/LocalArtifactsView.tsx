'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-php';
import { versionControl } from '@/lib/utils/artifact-version-control';
import { ArtifactExporter } from '@/lib/utils/artifact-export';
import { SkeletonCard } from '../ui/skeleton';

interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: Date;
}

interface ArtifactVersion {
  id: string;
  artifactId: string;
  content: string;
  timestamp: Date;
  versionNumber: number;
}

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'type';

const LocalArtifactsView = () => {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set());
  const [viewingVersions, setViewingVersions] = useState<Artifact | null>(null);
  const [versionHistory, setVersionHistory] = useState<ArtifactVersion[]>([]);
  const [comparingVersions, setComparingVersions] = useState<{artifact: Artifact, v1: number, v2: number} | null>(null);
  const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get file type icon
  const getFileTypeIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'javascript': '🟨',
      'typescript': '🔷',
      'typescriptreact': '⚛️',
      'javascriptreact': '⚛️',
      'python': '🐍',
      'java': '☕',
      'cpp': '🔧',
      'c': '🔧',
      'csharp': '🟦',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'yaml': '📝',
      'yml': '📝',
      'markdown': '📄',
      'md': '📄',
      'text': '📝',
      'sql': '🗃️',
      'shell': '🖥️',
      'bash': '🖥️',
      'rust': '🦀',
      'go': '🐹',
      'php': '🐘'
    };
    return iconMap[type.toLowerCase()] || '📄';
  };

  // Get Prism language for syntax highlighting
  const getPrismLanguage = (type: string): string => {
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'typescriptreact': 'tsx',
      'javascriptreact': 'jsx',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'csharp',
      'html': 'markup',
      'css': 'css',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'markdown': 'markdown',
      'md': 'markdown',
      'sql': 'sql',
      'shell': 'bash',
      'bash': 'bash',
      'rust': 'rust',
      'go': 'go',
      'php': 'php'
    };
    return languageMap[type.toLowerCase()] || 'text';
  };

  // Apply syntax highlighting
  useEffect(() => {
    if (viewingArtifact) {
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);
    }
  }, [viewingArtifact]);

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
      setIsLoading(true);
      
      // Simulate loading delay to show skeleton
      setTimeout(() => {
        try {
          const stored = localStorage.getItem('dinoair-artifacts');
          
          if (!stored) {
            // No data exists, initialize with empty array
            setArtifacts([]);
            setIsLoading(false);
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
        } finally {
          setIsLoading(false);
        }
      }, 300); // Small delay to show loading state
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
    
    // Save version before updating
    const artifact = artifacts.find(a => a.id === editingArtifact.id);
    if (artifact) {
      versionControl.addVersion(artifact.id, artifact.content);
    }
    
    const updatedArtifacts = artifacts.map(a =>
      a.id === editingArtifact.id
        ? { ...a, content: editedContent }
        : a
    );
    
    saveArtifacts(updatedArtifacts);
    setEditingArtifact(null);
    setEditedContent('');
  };

  // Filter and sort artifacts
  const filteredAndSortedArtifacts = useMemo(() => {
    let filtered = artifacts;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(artifact =>
        artifact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        artifact.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(artifact => artifact.type === filterType);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'type':
          return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [artifacts, searchTerm, filterType, sortOption]);

  // Get unique types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(artifacts.map(a => a.type));
    return Array.from(types).sort();
  }, [artifacts]);

  // Get artifact statistics
  const statistics = useMemo(() => {
    const stats = artifacts.reduce((acc, artifact) => {
      acc.total++;
      acc.byType[artifact.type] = (acc.byType[artifact.type] || 0) + 1;
      return acc;
    }, { total: 0, byType: {} as Record<string, number> });
    return stats;
  }, [artifacts]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this artifact?')) {
      const filteredArtifacts = artifacts.filter(a => a.id !== id);
      saveArtifacts(filteredArtifacts);
    }
  };

  const handleDownload = (artifact: Artifact) => {
    ArtifactExporter.exportSingle(artifact);
  };

  const handleBulkExport = async () => {
    const artifactsToExport = selectedArtifacts.size > 0
      ? artifacts.filter(a => selectedArtifacts.has(a.id))
      : artifacts;
    
    if (artifactsToExport.length === 0) {
      setErrorMessage('No artifacts to export.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      await ArtifactExporter.exportBulk(artifactsToExport, true);
      setSelectedArtifacts(new Set());
    } catch (error) {
      setErrorMessage('Failed to export artifacts.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleViewVersions = (artifact: Artifact) => {
    const history = versionControl.getVersionHistory(artifact.id);
    setVersionHistory(history);
    setViewingVersions(artifact);
  };

  const handleRestoreVersion = (artifactId: string, versionNumber: number) => {
    const content = versionControl.restoreVersion(artifactId, versionNumber);
    if (content !== null) {
      // Save current version before restoring
      const artifact = artifacts.find(a => a.id === artifactId);
      if (artifact) {
        versionControl.addVersion(artifact.id, artifact.content);
      }

      const updatedArtifacts = artifacts.map(a =>
        a.id === artifactId ? { ...a, content } : a
      );
      saveArtifacts(updatedArtifacts);
      setViewingVersions(null);
      setErrorMessage(`Restored version ${versionNumber}`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleCopyToClipboard = async (artifact: Artifact) => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopiedArtifactId(artifact.id);
      setTimeout(() => setCopiedArtifactId(null), 2000);
    } catch (error) {
      setErrorMessage('Failed to copy to clipboard.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const toggleArtifactSelection = (artifactId: string) => {
    const newSelection = new Set(selectedArtifacts);
    if (newSelection.has(artifactId)) {
      newSelection.delete(artifactId);
    } else {
      newSelection.add(artifactId);
    }
    setSelectedArtifacts(newSelection);
  };

  const selectAll = () => {
    setSelectedArtifacts(new Set(filteredAndSortedArtifacts.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedArtifacts(new Set());
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
        {/* Header with Controls */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Artifacts</h2>
              <div className="text-sm text-muted-foreground">
                Total: {statistics.total} |
                {Object.entries(statistics.byType).map(([type, count]) => (
                  <span key={type} className="ml-2">
                    {getFileTypeIcon(type)} {type}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSample}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add Sample
              </button>
              {selectedArtifacts.size > 0 ? (
                <>
                  <button
                    onClick={handleBulkExport}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Export Selected ({selectedArtifacts.size})
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Deselect All
                  </button>
                </>
              ) : (
                artifacts.length > 0 && (
                  <>
                    <button
                      onClick={handleBulkExport}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Export All
                    </button>
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Select All
                    </button>
                  </>
                )
              )}
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

          {/* Search and Filter Controls */}
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search artifacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-background text-foreground"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {getFileTypeIcon(type)} {type}
                </option>
              ))}
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-4 py-2 border rounded-lg bg-background text-foreground"
            >
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>
        
        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            {errorMessage}
          </div>
        )}
        
        <div className="space-y-4">
          {isLoading ? (
            // Show skeleton cards while loading
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredAndSortedArtifacts.length > 0 ? (
            filteredAndSortedArtifacts.map((artifact) => (
              <div
                key={artifact.id}
                className={`p-4 bg-card border rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-[1.01] ${
                  selectedArtifacts.has(artifact.id) ? 'ring-2 ring-primary' : ''
                }`}
                style={{
                  animation: 'fadeIn 0.3s ease-out',
                  animationDelay: `${filteredAndSortedArtifacts.indexOf(artifact) * 0.05}s`,
                  animationFillMode: 'both'
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedArtifacts.has(artifact.id)}
                      onChange={() => toggleArtifactSelection(artifact.id)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-2xl">{getFileTypeIcon(artifact.type)}</span>
                    <div>
                      <p className="font-semibold text-foreground">{artifact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {artifact.type} • {artifact.createdAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(artifact)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(artifact)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCopyToClipboard(artifact)}
                      className={`px-3 py-1 rounded transition-all duration-200 hover:scale-105 active:scale-95 ${
                        copiedArtifactId === artifact.id
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      {copiedArtifactId === artifact.id ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleViewVersions(artifact)}
                      className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Versions
                    </button>
                    <button
                      onClick={() => handleDownload(artifact)}
                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(artifact.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all'
                  ? 'No artifacts match your search criteria.'
                  : 'No artifacts found.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Artifacts will appear here when created through the chat interface.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-2xl animate-in zoom-in-95 duration-300">
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

      {/* View Modal with Syntax Highlighting */}
      {viewingArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">{getFileTypeIcon(viewingArtifact.type)}</span>
                {viewingArtifact.name}
              </h2>
              <span className="text-sm text-muted-foreground">{viewingArtifact.type}</span>
            </div>
            <div className="flex-1 overflow-auto mb-4">
              <pre className="p-4 rounded-lg bg-[#2d2d2d] text-white">
                <code className={`language-${getPrismLanguage(viewingArtifact.type)}`}>
                  {viewingArtifact.content}
                </code>
              </pre>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => handleCopyToClipboard(viewingArtifact)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  copiedArtifactId === viewingArtifact.id
                    ? 'bg-green-500 text-white'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {copiedArtifactId === viewingArtifact.id ? 'Copied!' : 'Copy to Clipboard'}
              </button>
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

      {/* Version History Modal */}
      {viewingVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-300">
            <h2 className="text-lg font-bold mb-4">Version History - {viewingVersions.name}</h2>
            <div className="flex-1 overflow-auto">
              {versionHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-semibold text-green-600 dark:text-green-400">Current Version</p>
                    <p className="text-sm text-muted-foreground">
                      Last modified: {viewingVersions.createdAt.toLocaleString()}
                    </p>
                  </div>
                  {versionHistory.map((version) => (
                    <div key={version.id} className="p-3 bg-card border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Version {version.versionNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(version.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(version.artifactId, version.versionNumber)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No version history available.</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setViewingVersions(null)}
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