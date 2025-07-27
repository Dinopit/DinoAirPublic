'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

// Custom CSS to match DinoAir theme
const customCss = `
  .swagger-ui {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
  
  .swagger-ui .topbar {
    display: none;
  }
  
  .swagger-ui .info .title {
    color: #2563eb;
  }
  
  .swagger-ui .btn.authorize {
    background-color: #2563eb;
    border-color: #2563eb;
  }
  
  .swagger-ui .btn.authorize:hover {
    background-color: #1d4ed8;
    border-color: #1d4ed8;
  }
  
  .swagger-ui .btn.execute {
    background-color: #10b981;
    border-color: #10b981;
  }
  
  .swagger-ui .btn.execute:hover {
    background-color: #059669;
    border-color: #059669;
  }
  
  .swagger-ui .opblock.opblock-get .opblock-summary {
    border-color: #10b981;
  }
  
  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background-color: #10b981;
  }
  
  .swagger-ui .opblock.opblock-get.is-open .opblock-summary {
    border-color: #10b981;
  }
  
  .swagger-ui .opblock.opblock-post .opblock-summary {
    border-color: #3b82f6;
  }
  
  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background-color: #3b82f6;
  }
  
  .swagger-ui .opblock.opblock-post.is-open .opblock-summary {
    border-color: #3b82f6;
  }
  
  .swagger-ui .opblock.opblock-put .opblock-summary {
    border-color: #f59e0b;
  }
  
  .swagger-ui .opblock.opblock-put .opblock-summary-method {
    background-color: #f59e0b;
  }
  
  .swagger-ui .opblock.opblock-put.is-open .opblock-summary {
    border-color: #f59e0b;
  }
  
  .swagger-ui .opblock.opblock-delete .opblock-summary {
    border-color: #ef4444;
  }
  
  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background-color: #ef4444;
  }
  
  .swagger-ui .opblock.opblock-delete.is-open .opblock-summary {
    border-color: #ef4444;
  }
  
  .swagger-ui .parameter__name.required::after {
    color: #ef4444;
  }
  
  .swagger-ui .response-col_status {
    color: #2563eb;
  }
  
  .swagger-ui .response-col_status.status-200 {
    color: #10b981;
  }
  
  .swagger-ui .response-col_status.status-201 {
    color: #10b981;
  }
  
  .swagger-ui .response-col_status.status-400 {
    color: #f59e0b;
  }
  
  .swagger-ui .response-col_status.status-401 {
    color: #f59e0b;
  }
  
  .swagger-ui .response-col_status.status-404 {
    color: #f59e0b;
  }
  
  .swagger-ui .response-col_status.status-429 {
    color: #ef4444;
  }
  
  .swagger-ui .response-col_status.status-500 {
    color: #dc2626;
  }
  
  .swagger-ui .model-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
  }
  
  .swagger-ui .model {
    color: #475569;
  }
  
  .swagger-ui select {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
  }
  
  .swagger-ui input[type=text], 
  .swagger-ui input[type=password], 
  .swagger-ui input[type=search], 
  .swagger-ui input[type=email], 
  .swagger-ui input[type=file], 
  .swagger-ui textarea {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
  }
  
  .swagger-ui .scheme-container {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .swagger-ui .loading-container {
    padding: 2rem;
    text-align: center;
  }
  
  .swagger-ui table tbody tr td {
    border-bottom: 1px solid #e2e8f0;
  }
  
  .swagger-ui .response-body pre {
    background-color: #1e293b;
    color: #e2e8f0;
    border-radius: 0.375rem;
  }
  
  /* Dark mode styles */
  @media (prefers-color-scheme: dark) {
    .swagger-ui {
      background-color: #0f172a;
      color: #e2e8f0;
    }
    
    .swagger-ui .info .title {
      color: #60a5fa;
    }
    
    .swagger-ui .info .base-url {
      color: #94a3b8;
    }
    
    .swagger-ui .info p, 
    .swagger-ui .info li {
      color: #cbd5e1;
    }
    
    .swagger-ui .scheme-container {
      background-color: #1e293b;
      border-color: #334155;
    }
    
    .swagger-ui .model-box {
      background-color: #1e293b;
      border-color: #334155;
    }
    
    .swagger-ui .model {
      color: #cbd5e1;
    }
    
    .swagger-ui .opblock .opblock-section-header {
      background-color: #1e293b;
    }
    
    .swagger-ui .opblock .opblock-section-header h4,
    .swagger-ui .opblock .opblock-section-header label {
      color: #e2e8f0;
    }
    
    .swagger-ui .parameter__name {
      color: #e2e8f0;
    }
    
    .swagger-ui .parameter__type {
      color: #94a3b8;
    }
    
    .swagger-ui .parameter__deprecated {
      color: #f87171;
    }
    
    .swagger-ui .parameter__in {
      color: #94a3b8;
    }
    
    .swagger-ui table thead tr th,
    .swagger-ui table thead tr td {
      color: #e2e8f0;
      border-bottom-color: #334155;
    }
    
    .swagger-ui table tbody tr td {
      border-bottom-color: #334155;
      color: #cbd5e1;
    }
    
    .swagger-ui select,
    .swagger-ui input[type=text], 
    .swagger-ui input[type=password], 
    .swagger-ui input[type=search], 
    .swagger-ui input[type=email], 
    .swagger-ui input[type=file], 
    .swagger-ui textarea {
      background-color: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
    }
    
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 {
      color: #e2e8f0;
    }
    
    .swagger-ui .response-col_description {
      color: #cbd5e1;
    }
  }
`;

export default function ApiDocsV1Page() {
  const [specUrl, setSpecUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set the OpenAPI spec URL
    setSpecUrl('/api/openapi');
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
            Explore and test the DinoAir API endpoints. All endpoints require API key authentication.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Authentication</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Include your API key in the <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded">X-API-Key</code> header for all requests.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Rate Limiting</h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                API requests are rate limited. Check response headers for current limits and usage.
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">New Features in v1.0</h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• <strong>Artifacts API:</strong> Complete CRUD operations for code artifacts</li>
              <li>• <strong>Streaming Export:</strong> Optimized export functionality for large files</li>
              <li>• <strong>Enhanced Validation:</strong> Comprehensive input validation with detailed error responses</li>
              <li>• <strong>Progress Tracking:</strong> Real-time progress updates for bulk operations</li>
            </ul>
          </div>
        </div>

        <style>{customCss}</style>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <SwaggerUI 
              url={specUrl}
              docExpansion="list"
              defaultModelsExpandDepth={1}
              displayRequestDuration={true}
              filter={true}
              showExtensions={true}
              showCommonExtensions={true}
              persistAuthorization={true}
              tryItOutEnabled={true}
              supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
            />
          </div>
        )}
      </div>
    </div>
  );
}
