'use client';

import React, { useState } from 'react';
import LocalChatView from './LocalChatView';
import LocalArtifactsView from './LocalArtifactsView';

type Tab = 'chat' | 'artifacts';

const LocalGui = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex border-b bg-card">
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'artifacts' 
              ? 'border-b-2 border-primary text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('artifacts')}
        >
          Artifacts
        </button>
      </div>

      <div className="flex-grow overflow-hidden">
        {activeTab === 'chat' ? <LocalChatView /> : <LocalArtifactsView />}
      </div>
    </div>
  );
};

export default LocalGui;