'use client';

import React, { useState } from 'react';

import { PluginManager, PluginDeveloper } from '@/components/plugins';

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<'manager' | 'developer'>('manager');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">🦕</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DinoAir Plugin System</h1>
                <p className="text-gray-600">Extend DinoAir with custom plugins</p>
              </div>
            </div>
            
            <nav className="flex space-x-8">
              <button
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'manager'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('manager')}
              >
                Plugin Manager
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'developer'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('developer')}
              >
                Plugin Developer
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'manager' ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Welcome to the Plugin System</h3>
              <p className="text-blue-700 text-sm">
                Discover and install plugins to extend DinoAir's functionality. Browse the registry for featured plugins
                or install your own custom plugins.
              </p>
            </div>
            <PluginManager />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900 mb-2">Plugin Development Environment</h3>
              <p className="text-green-700 text-sm">
                Create, test, and validate your own DinoAir plugins. Use the examples to get started quickly.
              </p>
            </div>
            <PluginDeveloper />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Plugin API</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li><code>/api/v1/plugins</code> - List and validate plugins</li>
                <li><code>/api/v1/plugins/registry</code> - Browse plugin marketplace</li>
                <li><code>/api/v1/plugins/docs</code> - Plugin documentation</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Features</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Secure sandboxed execution</li>
                <li>• Plugin lifecycle management</li>
                <li>• Registry and marketplace</li>
                <li>• Development tools and SDK</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Getting Started</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>1. Browse the Plugin Registry</li>
                <li>2. Install example plugins</li>
                <li>3. Create your own plugins</li>
                <li>4. Test and validate your code</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              DinoAir Plugin System - Built with ❤️ for extensibility
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
