import {
  calculateSimilarity,
  levenshteinDistance,
  findMatchingCommand,
  processVoiceCommand,
  VoiceCommand,
  CommandMatchOptions,
} from '../../hooks/utils/voiceCommandUtils';

describe('Voice Command Utils', () => {
  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1);
      expect(calculateSimilarity('', '')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const result = calculateSimilarity('abc', 'xyz');
      expect(result).toBe(0);
    });

    it('should return values between 0 and 1 for similar strings', () => {
      const result = calculateSimilarity('hello', 'helo');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    it('should handle different length strings', () => {
      const result = calculateSimilarity('cat', 'cats');
      expect(result).toBeGreaterThan(0.7);
    });
  });

  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('should return correct distance for simple cases', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
      expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
      expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('should calculate complex distances correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });
  });

  describe('findMatchingCommand', () => {
    const mockCommands: VoiceCommand[] = [
      {
        phrase: 'new chat',
        action: jest.fn(),
        description: 'Start a new conversation',
      },
      {
        phrase: 'save conversation',
        action: jest.fn(),
        description: 'Save current conversation',
      },
      {
        phrase: /^(send message|say) (.+)$/,
        action: jest.fn(),
        description: 'Send a message',
      },
    ];

    const defaultOptions: CommandMatchOptions = {
      sensitivity: 0.8,
    };

    it('should find exact matches', () => {
      const result = findMatchingCommand('new chat', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(true);
      expect(result.command).toBe(mockCommands[0]);
      expect(result.matchedText).toBe('new chat');
    });

    it('should find fuzzy matches within sensitivity threshold', () => {
      const result = findMatchingCommand('new chatt', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(true);
      expect(result.command).toBe(mockCommands[0]);
    });

    it('should not find matches below sensitivity threshold', () => {
      const result = findMatchingCommand('completely different', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(false);
      expect(result.command).toBe(null);
    });

    it('should handle regex patterns', () => {
      const result = findMatchingCommand('send message hello world', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(true);
      expect(result.command).toBe(mockCommands[2]);
    });

    it('should require exact match when sensitivity is 1', () => {
      const strictOptions: CommandMatchOptions = { sensitivity: 1 };
      const result = findMatchingCommand('new chatt', mockCommands, strictOptions);
      expect(result.isMatch).toBe(false);
    });

    it('should be case insensitive', () => {
      const result = findMatchingCommand('NEW CHAT', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(true);
      expect(result.command).toBe(mockCommands[0]);
    });

    it('should trim whitespace', () => {
      const result = findMatchingCommand('  new chat  ', mockCommands, defaultOptions);
      expect(result.isMatch).toBe(true);
      expect(result.command).toBe(mockCommands[0]);
    });
  });

  describe('processVoiceCommand', () => {
    const mockAction = jest.fn();
    const mockCommands: VoiceCommand[] = [
      {
        phrase: 'test command',
        action: mockAction,
        description: 'Test command',
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute matching command', () => {
      const result = processVoiceCommand('test command', mockCommands, { sensitivity: 0.8 });
      expect(result.executed).toBe(true);
      expect(result.matchedText).toBe('test command');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should not execute when no match found', () => {
      const result = processVoiceCommand('unknown command', mockCommands, { sensitivity: 0.8 });
      expect(result.executed).toBe(false);
      expect(result.matchedText).toBe('unknown command');
      expect(mockAction).not.toHaveBeenCalled();
    });

    it('should handle prefix requirements', () => {
      const options: CommandMatchOptions = { sensitivity: 0.8, prefix: 'DinoAir' };

      // Should not execute without prefix
      let result = processVoiceCommand('test command', mockCommands, options);
      expect(result.executed).toBe(false);
      expect(result.matchedText).toBe(null);

      // Should execute with prefix
      result = processVoiceCommand('DinoAir test command', mockCommands, options);
      expect(result.executed).toBe(true);
      expect(result.matchedText).toBe('test command');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should handle case insensitive prefix', () => {
      const options: CommandMatchOptions = { sensitivity: 0.8, prefix: 'DinoAir' };
      const result = processVoiceCommand('dinoair test command', mockCommands, options);
      expect(result.executed).toBe(true);
      expect(result.matchedText).toBe('test command');
    });

    it('should handle command execution errors', () => {
      const errorAction = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const errorCommands: VoiceCommand[] = [
        {
          phrase: 'error command',
          action: errorAction,
          description: 'Command that throws error',
        },
      ];

      const result = processVoiceCommand('error command', errorCommands, { sensitivity: 0.8 });
      expect(result.executed).toBe(false);
      expect(result.error).toContain('Error executing voice command: Test error');
      expect(errorAction).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from input', () => {
      const result = processVoiceCommand('  test command  ', mockCommands, { sensitivity: 0.8 });
      expect(result.executed).toBe(true);
      expect(result.matchedText).toBe('test command');
    });
  });
});
