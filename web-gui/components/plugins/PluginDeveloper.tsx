'use client';

import React, { useState } from 'react';

import { usePlugins } from '@/hooks/usePlugins';
import type { PluginManifest } from '@/lib/plugins/plugin-manager';

interface PluginDeveloperProps {
  className?: string;
}

export function PluginDeveloper({ className = '' }: PluginDeveloperProps) {
  const { installPlugin, loading, error } = usePlugins();
  
  const [manifest, setManifest] = useState<Partial<PluginManifest>>({
    id: '',
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    homepage: '',
    permissions: [],
    main: '',
    config: {}
  });
  
  const [validationResult, setValidationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'docs' | 'examples'>('editor');

  const handleManifestChange = (field: keyof PluginManifest, value: any) => {
    setManifest(prev => ({ ...prev, [field]: value }));
    setValidationResult(null); // Clear validation when editing
  };

  const validatePlugin = async () => {
    try {
      const response = await fetch('/api/v1/plugins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ manifest })
      });

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        valid: false,
        error: err instanceof Error ? err.message : 'Validation failed'
      });
    }
  };

  const testPlugin = async () => {
    if (!manifest.id || !manifest.name || !manifest.main) {
      alert('Please fill in required fields (ID, Name, and Main code)');
      return;
    }

    const success = await installPlugin(manifest as PluginManifest);
    if (success) {
      alert('Plugin installed successfully! Check the Plugin Manager to see it in action.');
    }
  };

  const loadExample = (exampleType: string) => {
    const examples = {
      hello: {
        id: 'hello-world',
        name: 'Hello World Plugin',
        version: '1.0.0',
        description: 'A simple hello world plugin',
        author: 'Developer',
        permissions: ['chat'],
        main: `
class HelloWorldPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user' && message.content === '!hello') {
        await api.sendChatMessage('Hello World from my plugin!');
      }
    });
    
    api.showNotification({
      type: 'success',
      title: 'Hello World Plugin',
      message: 'Plugin loaded! Type !hello to test.'
    });
  }
}

module.exports = HelloWorldPlugin;`,
        config: {}
      },
      counter: {
        id: 'message-counter',
        name: 'Message Counter',
        version: '1.0.0',
        description: 'Counts user messages and responds with stats',
        author: 'Developer',
        permissions: ['chat', 'storage'],
        main: `
class MessageCounterPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.registerCommand({
      id: 'show-stats',
      name: 'Show Message Stats',
      description: 'Display message statistics',
      action: () => {
        const count = api.storage.get('messageCount') || 0;
        api.sendChatMessage(\`Total messages: \${count}\`);
      }
    });
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user') {
        const count = (api.storage.get('messageCount') || 0) + 1;
        api.storage.set('messageCount', count);
        
        if (message.content === '!stats') {
          await api.sendChatMessage(\`Message count: \${count}\`);
        }
      }
    });
  }
}

module.exports = MessageCounterPlugin;`,
        config: {
          showNotifications: true
        }
      }
    };

    const example = examples[exampleType as keyof typeof examples];
    if (example) {
      setManifest(example);
    }
  };

  return (
    <div className={`plugin-developer ${className}`}>
      {/* Header */}
      <div className="developer-header border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Plugin Developer</h2>
        <p className="text-gray-600 mt-2">
          Create, test, and validate your DinoAir plugins
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs mt-6">
        <div className="tab-nav border-b border-gray-200">
          <button
            className={`tab-button px-4 py-2 font-medium border-b-2 ${
              activeTab === 'editor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            Plugin Editor
          </button>
          <button
            className={`tab-button px-4 py-2 font-medium border-b-2 ml-8 ${
              activeTab === 'docs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('docs')}
          >
            Documentation
          </button>
          <button
            className={`tab-button px-4 py-2 font-medium border-b-2 ml-8 ${
              activeTab === 'examples'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="developer-content mt-6">
        {activeTab === 'editor' && (
          <PluginEditor
            manifest={manifest}
            validationResult={validationResult}
            loading={loading}
            error={error}
            onManifestChange={handleManifestChange}
            onValidate={validatePlugin}
            onTest={testPlugin}
          />
        )}
        
        {activeTab === 'docs' && <PluginDocumentation />}
        
        {activeTab === 'examples' && (
          <PluginExamples onLoadExample={loadExample} />
        )}
      </div>
    </div>
  );
}

// Plugin Editor Component
interface PluginEditorProps {
  manifest: Partial<PluginManifest>;
  validationResult: any;
  loading: boolean;
  error: string | null;
  onManifestChange: (field: keyof PluginManifest, value: any) => void;
  onValidate: () => void;
  onTest: () => void;
}

function PluginEditor({
  manifest,
  validationResult,
  loading,
  error,
  onManifestChange,
  onValidate,
  onTest
}: PluginEditorProps) {
  return (
    <div className="plugin-editor">
      <div className="editor-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manifest Form */}
        <div className="manifest-form">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Manifest</h3>
          
          <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plugin ID *
              </label>
              <input
                type="text"
                value={manifest.id || ''}
                onChange={(e) => onManifestChange('id', e.target.value)}
                placeholder="my-awesome-plugin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="form-field">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plugin Name *
              </label>
              <input
                type="text"
                value={manifest.name || ''}
                onChange={(e) => onManifestChange('name', e.target.value)}
                placeholder="My Awesome Plugin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="form-field">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version *
              </label>
              <input
                type="text"
                value={manifest.version || ''}
                onChange={(e) => onManifestChange('version', e.target.value)}
                placeholder="1.0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="form-field">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author *
              </label>
              <input
                type="text"
                value={manifest.author || ''}
                onChange={(e) => onManifestChange('author', e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="form-field mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={manifest.description || ''}
              onChange={(e) => onManifestChange('description', e.target.value)}
              placeholder="Describe what your plugin does..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="form-field mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Homepage URL
            </label>
            <input
              type="url"
              value={manifest.homepage || ''}
              onChange={(e) => onManifestChange('homepage', e.target.value)}
              placeholder="https://github.com/yourname/plugin"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="form-field mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions
            </label>
            <div className="permissions-grid grid grid-cols-2 gap-2">
              {['chat', 'commands', 'storage', 'ui', 'network'].map((permission) => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={manifest.permissions?.includes(permission) || false}
                    onChange={(e) => {
                      const permissions = manifest.permissions || [];
                      if (e.target.checked) {
                        onManifestChange('permissions', [...permissions, permission]);
                      } else {
                        onManifestChange('permissions', permissions.filter(p => p !== permission));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{permission}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Code Editor */}
        <div className="code-editor">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Code</h3>
          
          <div className="code-field">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Code *
            </label>
            <textarea
              value={manifest.main || ''}
              onChange={(e) => onManifestChange('main', e.target.value)}
              placeholder="class MyPlugin {&#10;  async onLoad(api) {&#10;    // Your plugin code here&#10;  }&#10;}&#10;&#10;module.exports = MyPlugin;"
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className={`validation-results mt-6 p-4 rounded-lg border ${
          validationResult.valid 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-medium ${
            validationResult.valid ? 'text-green-800' : 'text-red-800'
          }`}>
            Validation {validationResult.valid ? 'Passed' : 'Failed'}
          </h4>
          
          {validationResult.error && (
            <p className="text-red-600 text-sm mt-1">{validationResult.error}</p>
          )}
          
          {validationResult.missingFields && (
            <div className="mt-2">
              <p className="text-red-600 text-sm">Missing required fields:</p>
              <ul className="text-red-600 text-sm list-disc list-inside">
                {validationResult.missingFields.map((field: string) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.securityIssues && validationResult.securityIssues.length > 0 && (
            <div className="mt-2">
              <p className="text-red-600 text-sm">Security issues found:</p>
              <ul className="text-red-600 text-sm list-disc list-inside">
                {validationResult.securityIssues.map((issue: string, index: number) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-display mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium">Error</h4>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="editor-actions mt-6 flex gap-4">
        <button
          onClick={onValidate}
          disabled={loading}
          className="validate-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Validating...' : 'Validate Plugin'}
        </button>
        
        <button
          onClick={onTest}
          disabled={loading || !validationResult?.valid}
          className="test-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Installing...' : 'Test Plugin'}
        </button>
      </div>
    </div>
  );
}

// Plugin Documentation Component
function PluginDocumentation() {
  return (
    <div className="plugin-docs prose max-w-none">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Development Guide</h3>
      
      <div className="docs-content bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium mb-3">Getting Started</h4>
        <p className="text-sm text-gray-700 mb-4">
          DinoAir plugins are JavaScript classes that implement specific lifecycle methods.
          They run in a secure sandbox environment and can interact with DinoAir through the Plugin API.
        </p>

        <h4 className="font-medium mb-3">Required Structure</h4>
        <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-x-auto">
{`class MyPlugin {
  // Called when plugin is loaded
  async onLoad(api) {
    this.api = api;
    // Initialize your plugin here
  }
  
  // Called when plugin is unloaded
  async onUnload() {
    // Clean up resources
  }
  
  // Called when plugin is enabled
  async onEnable() {
    // Resume operations
  }
  
  // Called when plugin is disabled
  async onDisable() {
    // Pause operations
  }
}

module.exports = MyPlugin;`}
        </pre>

        <h4 className="font-medium mb-3 mt-6">Plugin API Methods</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li><code>api.onChatMessage(callback)</code> - Listen for chat messages</li>
          <li><code>api.onChatResponse(callback)</code> - Listen for AI responses</li>
          <li><code>api.sendChatMessage(message)</code> - Send a message to chat</li>
          <li><code>api.registerCommand(command)</code> - Register a UI command</li>
          <li><code>api.showNotification(notification)</code> - Show user notification</li>
          <li><code>api.storage.get/set/remove(key, value)</code> - Plugin storage</li>
          <li><code>api.logger.log/error/warn(...args)</code> - Logging methods</li>
        </ul>

        <h4 className="font-medium mb-3 mt-6">Security Guidelines</h4>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• Don't use <code>eval()</code> or <code>Function()</code> constructor</li>
          <li>• Avoid direct DOM manipulation</li>
          <li>• Use plugin storage API instead of localStorage</li>
          <li>• Validate all user input</li>
          <li>• Handle errors gracefully</li>
        </ul>
      </div>
    </div>
  );
}

// Plugin Examples Component
interface PluginExamplesProps {
  onLoadExample: (type: string) => void;
}

function PluginExamples({ onLoadExample }: PluginExamplesProps) {
  const examples = [
    {
      id: 'hello',
      name: 'Hello World',
      description: 'Simple plugin that responds to !hello command',
      difficulty: 'Beginner'
    },
    {
      id: 'counter',
      name: 'Message Counter',
      description: 'Counts user messages and provides statistics',
      difficulty: 'Intermediate'
    }
  ];

  return (
    <div className="plugin-examples">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Plugin Examples</h3>
      
      <div className="examples-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map((example) => (
          <div
            key={example.id}
            className="example-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="example-header flex justify-between items-start mb-3">
              <h4 className="font-medium text-gray-900">{example.name}</h4>
              <span className={`difficulty-badge px-2 py-1 text-xs rounded ${
                example.difficulty === 'Beginner' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {example.difficulty}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{example.description}</p>
            
            <button
              onClick={() => onLoadExample(example.id)}
              className="load-example-btn w-full py-2 px-4 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Load Example
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
