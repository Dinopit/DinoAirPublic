import React from 'react';
import { Personality } from '@/hooks/usePersonalities';

interface ChatSettingsProps {
  showSettings: boolean;
  selectedPersonality: string;
  personalities: Personality[];
  customSystemPrompt: string;
  onPersonalityChange: (personalityName: string) => void;
  onSystemPromptChange: (prompt: string) => void;
  onResetToSelectedPersonality: () => void;
  onClose: () => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({
  showSettings,
  selectedPersonality,
  personalities,
  customSystemPrompt,
  onPersonalityChange,
  onSystemPromptChange,
  onResetToSelectedPersonality,
  onClose
}) => {
  if (!showSettings) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/50">
      <h3 className="font-semibold mb-3">System Prompt Configuration</h3>
      
      {/* Personality Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select Personality</label>
        <select
          value={selectedPersonality}
          onChange={(e) => onPersonalityChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
        >
          {personalities.map((personality) => (
            <option key={personality.name} value={personality.name}>
              {personality.name} - {personality.description}
            </option>
          ))}
        </select>
      </div>

      {/* Custom System Prompt */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">System Prompt</label>
        <textarea
          value={customSystemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          className="w-full h-32 p-3 border rounded-lg bg-background text-foreground resize-none"
          placeholder="Enter custom system prompt..."
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onResetToSelectedPersonality}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Reset to Selected Personality
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
        >
          Close Settings
        </button>
      </div>
    </div>
  );
};

export default ChatSettings;