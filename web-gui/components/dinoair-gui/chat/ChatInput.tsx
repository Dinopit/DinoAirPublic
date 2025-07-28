import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceControls } from '../../ui/voice-controls';
import { sanitizeText } from '../../../lib/security/sanitizer';

interface ChatInputProps {
  isLoading: boolean;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onCancelStreaming: () => void;
  onAudioMessage?: (audioBlob: Blob) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  isLoading,
  isStreaming,
  onSendMessage,
  onCancelStreaming,
  onAudioMessage,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showVoiceControls, setShowVoiceControls] = useState(false);

  const handleTranscriptChange = (transcript: string) => {
    const sanitizedTranscript = sanitizeText(transcript);
    if (sanitizedTranscript.trim()) {
      setInputValue((prev) => prev + (prev ? ' ' : '') + sanitizedTranscript);
    }
  };

  const handleSendMessage = () => {
    const sanitizedInput = sanitizeText(inputValue);
    if (!sanitizedInput.trim() || isLoading) return;
    onSendMessage(sanitizedInput.trim());
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t bg-card">
      <div className="max-w-4xl mx-auto">
        {/* Voice controls panel */}
        {showVoiceControls && (
          <div className="p-4 border-b bg-muted/50">
            <VoiceControls
              onTranscriptChange={handleTranscriptChange}
              onAudioMessage={onAudioMessage || (() => {})}
              compact={false}
            />
          </div>
        )}

        {/* Main input area */}
        <div className="p-4">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or use voice input..."
              className="flex-1 p-3 border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={1}
              disabled={isLoading}
            />

            {/* Voice controls toggle */}
            <button
              onClick={() => setShowVoiceControls(!showVoiceControls)}
              className={`p-3 rounded-lg border transition-colors ${
                showVoiceControls
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
              title="Toggle voice controls"
            >
              <Mic className="h-5 w-5" />
            </button>

            {isStreaming ? (
              <button
                onClick={onCancelStreaming}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
