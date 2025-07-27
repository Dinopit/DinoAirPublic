'use client';

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

import MemoryMonitor from '@/components/ui/memory-monitor';

// Use optimized LocalGui with better memory management
const OptimizedLocalGui = dynamic(() => import('@/components/dinoair-gui/OptimizedLocalGui'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <div className="text-6xl animate-bounce">🦕</div>
        <h1 className="text-2xl font-bold">Loading DinoAir...</h1>
        <p className="text-muted-foreground">Initializing optimized interface</p>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
});

export default function DinoAirGUIPage() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <main className="relative">
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">🦕</div>
              <p>Loading DinoAir...</p>
            </div>
          </div>
        }
      >
        <OptimizedLocalGui />
      </Suspense>

      {/* Memory monitor in development mode */}
      {isDevelopment && (
        <div className="fixed bottom-4 right-4 z-50">
          <MemoryMonitor
            showDetails={false}
            onMemoryWarning={(warning) => {
              console.warn('Memory warning:', warning);
              // Could show toast notification here
            }}
          />
        </div>
      )}
    </main>
  );
}
