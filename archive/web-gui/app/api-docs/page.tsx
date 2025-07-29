'use client';

import { useEffect, useState } from 'react';

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            DinoAir API Documentation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Explore and test the DinoAir API endpoints. All endpoints require API key
            authentication.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Authentication:</strong> Include your API key in the{' '}
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded">X-API-Key</code>{' '}
              header for all requests.
            </p>
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
                API Documentation
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
                  <h3 className="font-semibold text-gray-900 dark:text-white">Marketplace API</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    GET /api/marketplace/search - Search available models
                  </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Health Check</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    GET /api/health - Service health status
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
