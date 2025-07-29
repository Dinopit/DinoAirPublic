import React from 'react';
import { Model } from '@/hooks/useModels';
import { Conversation } from '@/hooks/useConversations';

interface ChatHeaderProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: Model[];
  showSettings: boolean;
  onToggleSettings: () => void;
  onNewConversation: () => void;
  onSaveConversation: () => void;
  conversations: Conversation[];
  onLoadConversation: (id: string) => void;
  activeConversationId: string | null;
  onDeleteConversation: (id: string) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedModel,
  onModelChange,
  models,
  showSettings: _showSettings,
  onToggleSettings,
  onNewConversation,
  onSaveConversation,
  conversations,
  onLoadConversation,
  activeConversationId,
  onDeleteConversation
}) => {
  return (
    <div className="border-b bg-card p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 items-center">
            {/* Model Selection */}
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-foreground"
            >
              <option value="qwen:7b-chat-v1.5-q4_K_M">Qwen 7B (Default)</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>

            {/* Settings Button */}
            <button
              onClick={onToggleSettings}
              className="px-3 py-2 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
            >
              ⚙️ Settings
            </button>
          </div>

          <div className="flex gap-2">
            {/* Conversation Management */}
            <button
              onClick={onNewConversation}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              New Chat
            </button>
            <button
              onClick={onSaveConversation}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Save Chat
            </button>
            <select
              onChange={(e) => {
                if (e.target.value) onLoadConversation(e.target.value);
              }}
              className="px-3 py-2 border rounded-lg bg-background text-foreground"
              value=""
            >
              <option value="">Load Conversation...</option>
              {conversations.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.name} ({conv.messages.length} messages)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Conversation Info */}
        {activeConversationId && (
          <div className="mt-2 text-sm text-muted-foreground">
            Active: {conversations.find(c => c.id === activeConversationId)?.name}
            <button
              onClick={() => onDeleteConversation(activeConversationId)}
              className="ml-2 text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
