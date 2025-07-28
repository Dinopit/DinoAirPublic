'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../ui/button';
import { VoiceControls } from '../../ui/voice-controls';
import { useSpeechToText } from '../../../hooks/useSpeechToText';
import { useTextToSpeech } from '../../../hooks/useTextToSpeech';
import { useVoiceCommands, createDefaultVoiceCommands } from '../../../hooks/useVoiceCommands';

interface VoiceInputProps {
  onSendMessage: (message: string) => void;
  onAudioMessage?: (audioBlob: Blob) => void;
  onNewChat?: () => void;
  onSaveChat?: () => void;
  onClearChat?: () => void;
  onToggleSettings?: () => void;
  lastMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onSendMessage,
  onAudioMessage,
  onNewChat,
  onSaveChat,
  onClearChat,
  onToggleSettings,
  lastMessage,
  isLoading = false,
  className = '',
}) => {
  const [voiceInputText, setVoiceInputText] = useState('');
  const [isVoiceCommandsEnabled, setIsVoiceCommandsEnabled] = useState(false);
  const [autoReadResponses, setAutoReadResponses] = useState(false);

  const {
    transcript,
    interimTranscript,
    error: sttError,
    isSupported: sttSupported,
    resetTranscript,
  } = useSpeechToText({
    continuous: false,
    interimResults: true,
  });

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isPaused,
    isSupported: ttsSupported,
  } = useTextToSpeech();

  // Voice commands setup
  const voiceCommands = createDefaultVoiceCommands(
    () => onNewChat?.(),
    () => onSaveChat?.(),
    () => onClearChat?.(),
    () => onToggleSettings?.(),
    onSendMessage
  );

  const {
    isListening: isListeningCommands,
    lastCommand,
    error: commandError,
    startListening: startCommandListening,
    stopListening: stopCommandListening,
  } = useVoiceCommands(voiceCommands, {
    enabled: isVoiceCommandsEnabled,
    prefix: 'DinoAir',
    sensitivity: 0.7,
  });

  // Handle transcript changes
  useEffect(() => {
    if (transcript) {
      setVoiceInputText((prev) => prev + ' ' + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Auto-read AI responses if enabled
  useEffect(() => {
    if (autoReadResponses && lastMessage && !isLoading) {
      // Small delay to ensure message is fully rendered
      setTimeout(() => {
        speak(lastMessage);
      }, 500);
    }
  }, [lastMessage, autoReadResponses, isLoading, speak]);

  const handleVoiceInputComplete = () => {
    if (voiceInputText.trim()) {
      onSendMessage(voiceInputText.trim());
      setVoiceInputText('');
    }
  };

  const handleTranscriptChange = (newTranscript: string) => {
    if (newTranscript.trim()) {
      onSendMessage(newTranscript.trim());
    }
  };

  const toggleVoiceCommands = () => {
    if (isVoiceCommandsEnabled) {
      stopCommandListening();
      setIsVoiceCommandsEnabled(false);
    } else {
      startCommandListening();
      setIsVoiceCommandsEnabled(true);
    }
  };

  const toggleAutoRead = () => {
    if (autoReadResponses) {
      cancelSpeech();
    }
    setAutoReadResponses(!autoReadResponses);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Voice controls header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Voice Controls</h3>
        <div className="flex items-center gap-2">
          {/* Auto-read toggle */}
          {ttsSupported && (
            <Button
              variant={autoReadResponses ? 'default' : 'outline'}
              size="sm"
              onClick={toggleAutoRead}
              className="flex items-center gap-2"
              title="Auto-read AI responses"
            >
              {autoReadResponses ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Voice commands toggle */}
          {sttSupported && (
            <Button
              variant={isVoiceCommandsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={toggleVoiceCommands}
              className="flex items-center gap-2"
              title="Enable voice commands"
            >
              {isListeningCommands ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              Commands
            </Button>
          )}
        </div>
      </div>

      {/* Voice input area */}
      {voiceInputText && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm text-blue-800">{voiceInputText}</p>
              {interimTranscript && (
                <p className="text-sm text-blue-600 italic">{interimTranscript}</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleVoiceInputComplete}
              disabled={!voiceInputText.trim() || isLoading}
              className="flex items-center gap-1"
            >
              <Send className="h-3 w-3" />
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Main voice controls */}
      <VoiceControls
        onTranscriptChange={handleTranscriptChange}
        onAudioMessage={onAudioMessage || (() => {})}
        compact={false}
      />

      {/* Voice commands status */}
      {isVoiceCommandsEnabled && (
        <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-800">
              {isListeningCommands ? (
                <>
                  <div className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                  Listening for commands...
                </>
              ) : (
                'Voice commands ready'
              )}
            </span>
            {lastCommand && (
              <span className="text-xs text-purple-600 font-mono">Last: {lastCommand}</span>
            )}
          </div>

          {/* Available commands help */}
          <details className="mt-2">
            <summary className="text-xs text-purple-700 cursor-pointer hover:text-purple-900">
              Available Commands
            </summary>
            <div className="mt-1 text-xs text-purple-600 space-y-1">
              <div>&quot;DinoAir new chat&quot; - Start new conversation</div>
              <div>&quot;DinoAir save conversation&quot; - Save current chat</div>
              <div>&quot;DinoAir clear chat&quot; - Clear conversation</div>
              <div>&quot;DinoAir open settings&quot; - Open settings panel</div>
            </div>
          </details>
        </div>
      )}

      {/* TTS status */}
      {isSpeaking && (
        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-800">
              {isPaused ? 'Speech paused' : 'Reading response...'}
            </span>
            <Button variant="outline" size="sm" onClick={cancelSpeech} className="text-xs">
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Errors */}
      {(sttError || commandError) && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{sttError || commandError}</p>
        </div>
      )}

      {/* Support status */}
      {!sttSupported && !ttsSupported && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Voice features not supported in this browser. Try using Chrome, Edge, or Safari for full
            voice support.
          </p>
        </div>
      )}
    </div>
  );
};
