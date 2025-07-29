import { renderHook, act } from '@testing-library/react';
import { useVoiceCommands, createDefaultVoiceCommands } from '../../hooks/useVoiceCommands';

// Mock the useSpeechToText hook since we're testing the useVoiceCommands hook integration
jest.mock('../../hooks/useSpeechToText', () => ({
  useSpeechToText: jest.fn(() => ({
    isListening: false,
    transcript: '',
    error: null,
    isSupported: true,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    resetTranscript: jest.fn(),
  })),
}));

describe('useVoiceCommands Integration', () => {
  const mockAction = jest.fn();

  const testCommands = [
    {
      phrase: 'test command',
      action: mockAction,
      description: 'Test command',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useVoiceCommands(testCommands));

    expect(result.current.isListening).toBe(false);
    expect(result.current.lastCommand).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isSupported).toBe(true);
  });

  it('should provide all expected functions', () => {
    const { result } = renderHook(() => useVoiceCommands(testCommands));

    expect(typeof result.current.startListening).toBe('function');
    expect(typeof result.current.stopListening).toBe('function');
    expect(typeof result.current.addCommand).toBe('function');
    expect(typeof result.current.removeCommand).toBe('function');
    expect(typeof result.current.clearCommands).toBe('function');
    expect(typeof result.current.getCommands).toBe('function');
  });

  it('should manage commands correctly', () => {
    const { result } = renderHook(() => useVoiceCommands());

    // Initially empty
    expect(result.current.getCommands()).toEqual([]);

    // Add a command
    act(() => {
      result.current.addCommand(testCommands[0]);
    });

    expect(result.current.getCommands()).toHaveLength(1);
    expect(result.current.getCommands()[0]).toEqual(testCommands[0]);

    // Remove a command
    act(() => {
      result.current.removeCommand('test command');
    });

    expect(result.current.getCommands()).toEqual([]);

    // Add and clear commands
    act(() => {
      result.current.addCommand(testCommands[0]);
      result.current.clearCommands();
    });

    expect(result.current.getCommands()).toEqual([]);
  });

  it('should create default voice commands with proper structure', () => {
    const mockHandlers = {
      onNewChat: jest.fn(),
      onSaveChat: jest.fn(),
      onClearChat: jest.fn(),
      onToggleSettings: jest.fn(),
      onSendMessage: jest.fn(),
    };

    const defaultCommands = createDefaultVoiceCommands(
      mockHandlers.onNewChat,
      mockHandlers.onSaveChat,
      mockHandlers.onClearChat,
      mockHandlers.onToggleSettings,
      mockHandlers.onSendMessage
    );

    expect(defaultCommands).toHaveLength(6);

    // Check that each command has the required properties
    defaultCommands.forEach((command) => {
      expect(command).toHaveProperty('phrase');
      expect(command).toHaveProperty('action');
      expect(command).toHaveProperty('description');
      expect(typeof command.action).toBe('function');
      expect(typeof command.description).toBe('string');
    });

    // Test that the actions are properly bound
    act(() => {
      defaultCommands[0].action(); // new chat
    });
    expect(mockHandlers.onNewChat).toHaveBeenCalledTimes(1);

    act(() => {
      defaultCommands[1].action(); // save conversation
    });
    expect(mockHandlers.onSaveChat).toHaveBeenCalledTimes(1);
  });

  it('should work with different options', () => {
    const options = {
      enabled: true,
      language: 'en-GB',
      sensitivity: 0.9,
      prefix: 'Computer',
    };

    const { result } = renderHook(() => useVoiceCommands(testCommands, options));

    // Should still initialize correctly with custom options
    expect(result.current.isListening).toBe(false);
    expect(result.current.lastCommand).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.isSupported).toBe(true);
  });
});
