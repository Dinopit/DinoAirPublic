'use client';

import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { useSpeechToText } from './useSpeechToText';
import { processVoiceCommand, VoiceCommand } from '../lib/utils/voiceCommandUtils';

interface UseVoiceCommandsOptions {
  enabled?: boolean;
  language?: string;
  sensitivity?: number; // 0-1, how closely the phrase must match
  prefix?: string; // Command prefix like "DinoAir" or "Hey Assistant"
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  lastCommand: string | null;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  addCommand: (command: VoiceCommand) => void;
  removeCommand: (phrase: string) => void;
  clearCommands: () => void;
  getCommands: () => VoiceCommand[];
}

export const useVoiceCommands = (
  commands: VoiceCommand[] = [],
  options: UseVoiceCommandsOptions = {}
): UseVoiceCommandsReturn => {
  const { enabled = true, language = 'en-US', sensitivity = 0.8, prefix = '' } = options;

  const commandsRef = React.useRef<VoiceCommand[]>(commands);
  const [lastCommand, setLastCommand] = React.useState<string | null>(null);

  const {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    continuous: true,
    interimResults: false,
    language,
  });

  // Process voice commands when transcript changes
  useEffect(() => {
    if (!transcript || !enabled) return;

    const result = processVoiceCommand(transcript, commandsRef.current, {
      sensitivity,
      prefix,
    });

    if (result.executed && result.matchedText) {
      setLastCommand(result.matchedText);
    }

    if (result.error) {
      console.error(result.error);
    }

    resetTranscript();
  }, [transcript, enabled, prefix, sensitivity, resetTranscript]);

  const addCommand = useCallback((command: VoiceCommand) => {
    commandsRef.current = [...commandsRef.current, command];
  }, []);

  const removeCommand = useCallback((phrase: string) => {
    commandsRef.current = commandsRef.current.filter(
      (cmd) => cmd.phrase !== phrase && cmd.phrase.toString() !== phrase
    );
  }, []);

  const clearCommands = useCallback(() => {
    commandsRef.current = [];
  }, []);

  const getCommands = useCallback(() => {
    return [...commandsRef.current];
  }, []);

  return {
    isListening,
    lastCommand,
    error,
    isSupported,
    startListening,
    stopListening,
    addCommand,
    removeCommand,
    clearCommands,
    getCommands,
  };
};

// Default voice commands for DinoAir
export const createDefaultVoiceCommands = (
  onNewChat: () => void,
  onSaveChat: () => void,
  onClearChat: () => void,
  onToggleSettings: () => void,
  onSendMessage: (message: string) => void
): VoiceCommand[] => [
  {
    phrase: 'new chat',
    action: onNewChat,
    description: 'Start a new conversation',
  },
  {
    phrase: 'save conversation',
    action: onSaveChat,
    description: 'Save current conversation',
  },
  {
    phrase: 'clear chat',
    action: onClearChat,
    description: 'Clear current conversation',
  },
  {
    phrase: 'open settings',
    action: onToggleSettings,
    description: 'Open settings panel',
  },
  {
    phrase: 'close settings',
    action: onToggleSettings,
    description: 'Close settings panel',
  },
  {
    phrase: /^(send message|say) (.+)$/,
    action: () => {
      // This will be handled differently as it needs the captured text
    },
    description: 'Send a message (e.g., "send message hello world")',
  },
];
