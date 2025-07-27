'use client';

import React, { useCallback, useEffect } from 'react';
import { useSpeechToText } from './useSpeechToText';

interface VoiceCommand {
  phrase: string | RegExp;
  action: () => void;
  description: string;
}

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

    const processCommand = (text: string) => {
      const cleanText = text.toLowerCase().trim();

      // Check for prefix if required
      if (prefix && !cleanText.startsWith(prefix.toLowerCase())) {
        return;
      }

      // Remove prefix from text for command matching
      const commandText = prefix ? cleanText.slice(prefix.length).trim() : cleanText;

      // Find matching command
      for (const command of commandsRef.current) {
        let isMatch = false;

        if (command.phrase instanceof RegExp) {
          isMatch = command.phrase.test(commandText);
        } else {
          const phrase = command.phrase.toLowerCase();
          // Simple fuzzy matching based on sensitivity
          if (sensitivity === 1) {
            isMatch = commandText === phrase;
          } else {
            // Calculate similarity using Levenshtein distance approximation
            const similarity = calculateSimilarity(commandText, phrase);
            isMatch = similarity >= sensitivity;
          }
        }

        if (isMatch) {
          setLastCommand(commandText);
          try {
            command.action();
          } catch (err) {
            console.error('Error executing voice command:', err);
          }
          break;
        }
      }
    };

    processCommand(transcript);
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

// Simple similarity calculation for fuzzy matching
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

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
