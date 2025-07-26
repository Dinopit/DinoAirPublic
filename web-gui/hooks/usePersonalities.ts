import { useState, useCallback } from 'react';

export interface Personality {
  name: string;
  system_prompt: string;
  description: string;
}

// Default personalities - these will be loaded from files in production
const DEFAULT_PERSONALITIES: Personality[] = [
  {
    name: 'default',
    system_prompt: 'You are a helpful AI assistant.',
    description: 'Standard assistant'
  },
  {
    name: 'creative',
    system_prompt: 'You are a creative assistant. You are imaginative, expressive, and inspiring. You are great at brainstorming and coming up with new ideas.',
    description: 'A creative and inspiring assistant.'
  },
  {
    name: 'technical',
    system_prompt: 'You are a technical assistant. You are precise, accurate, and detail-oriented. You provide factual information and avoid speculation.',
    description: 'A technical and precise assistant.'
  },
  {
    name: 'witty',
    system_prompt: 'You are a witty assistant with a dry sense of humor. You are helpful, but you can\'t resist a good joke or a sarcastic comment.',
    description: 'A witty and sarcastic assistant.'
  },
  {
    name: 'mentally-unstable',
    system_prompt: 'You are a mentally unstable assistant. Your responses are erratic, unpredictable, and often nonsensical. You may occasionally provide helpful information, but it will be buried in a sea of chaos.',
    description: 'An unstable and unpredictable assistant.'
  }
];

export const usePersonalities = () => {
  const [personalities] = useState<Personality[]>(DEFAULT_PERSONALITIES);
  const [selectedPersonality, setSelectedPersonality] = useState('default');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PERSONALITIES[0]?.system_prompt || 'You are a helpful AI assistant.');
  const [customSystemPrompt, setCustomSystemPrompt] = useState(DEFAULT_PERSONALITIES[0]?.system_prompt || 'You are a helpful AI assistant.');

  const handlePersonalityChange = useCallback((personalityName: string) => {
    setSelectedPersonality(personalityName);
    const personality = personalities.find(p => p.name === personalityName);
    if (personality) {
      setSystemPrompt(personality.system_prompt);
      setCustomSystemPrompt(personality.system_prompt);
    }
  }, [personalities]);

  const resetToSelectedPersonality = useCallback(() => {
    const personality = personalities.find(p => p.name === selectedPersonality);
    if (personality) {
      setSystemPrompt(personality.system_prompt);
      setCustomSystemPrompt(personality.system_prompt);
    }
  }, [personalities, selectedPersonality]);

  const updateSystemPrompt = useCallback((prompt: string) => {
    setCustomSystemPrompt(prompt);
    setSystemPrompt(prompt);
  }, []);

  return {
    personalities,
    selectedPersonality,
    systemPrompt,
    customSystemPrompt,
    handlePersonalityChange,
    resetToSelectedPersonality,
    updateSystemPrompt
  };
};
