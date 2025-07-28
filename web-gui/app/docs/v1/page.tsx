'use client';

import { useEffect, useState } from 'react';

export default function ApiDocsV1Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              DinoAir API Documentation
            </h1>
            <span className="px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900 rounded-full">
              v1.0
            </span>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Explore and test the DinoAir API endpoints. All endpoints require API key
            authentication.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Authentication
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Include your API key in the{' '}
                <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded">X-API-Key</code>{' '}
                header for all requests.
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Rate Limiting
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                API requests are rate limited. Check response headers for current limits and usage.
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
              New Features in v1.0
            </h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>
                • <strong>Artifacts API:</strong> Complete CRUD operations for code artifacts
              </li>
              <li>
                • <strong>Streaming Export:</strong> Optimized export functionality for large files
              </li>
              <li>
                • <strong>Enhanced Validation:</strong> Comprehensive input validation with detailed
                error responses
              </li>
              <li>
                • <strong>Progress Tracking:</strong> Real-time progress updates for bulk operations
              </li>
            </ul>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🦕</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                API Documentation v1.0
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Interactive API documentation will be available here
              </p>
              <div className="space-y-4 max-w-2xl mx-auto text-left">
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Chat API</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    POST /api/v1/chat - Send messages to AI models
                  </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Artifacts API</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    GET /api/v1/artifacts - Manage code artifacts
                  </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Export API</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    POST /api/v1/export - Export conversations and data
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
