import { renderHook, act } from '@testing-library/react';
import { usePersonalities } from '../usePersonalities';

describe('usePersonalities', () => {
  it('should initialize with default personality', () => {
    const { result } = renderHook(() => usePersonalities());

    expect(result.current.personalities).toHaveLength(5);
    expect(result.current.selectedPersonality).toBe('default');
    expect(result.current.systemPrompt).toBe('You are a helpful AI assistant.');
    expect(result.current.customSystemPrompt).toBe('You are a helpful AI assistant.');
  });

  it('should have all expected personalities', () => {
    const { result } = renderHook(() => usePersonalities());

    const personalityNames = result.current.personalities.map(p => p.name);
    expect(personalityNames).toEqual([
      'default',
      'creative',
      'technical',
      'witty',
      'mentally-unstable'
    ]);
  });

  it('should change personality and update prompts', () => {
    const { result } = renderHook(() => usePersonalities());

    act(() => {
      result.current.handlePersonalityChange('creative');
    });

    expect(result.current.selectedPersonality).toBe('creative');
    expect(result.current.systemPrompt).toContain('creative assistant');
    expect(result.current.systemPrompt).toContain('imaginative');
    expect(result.current.customSystemPrompt).toBe(result.current.systemPrompt);
  });

  it('should handle changing to technical personality', () => {
    const { result } = renderHook(() => usePersonalities());

    act(() => {
      result.current.handlePersonalityChange('technical');
    });

    expect(result.current.selectedPersonality).toBe('technical');
    expect(result.current.systemPrompt).toContain('technical assistant');
    expect(result.current.systemPrompt).toContain('precise');
  });

  it('should handle changing to witty personality', () => {
    const { result } = renderHook(() => usePersonalities());

    act(() => {
      result.current.handlePersonalityChange('witty');
    });

    expect(result.current.selectedPersonality).toBe('witty');
    expect(result.current.systemPrompt).toContain('witty assistant');
    expect(result.current.systemPrompt).toContain('dry sense of humor');
  });

  it('should handle changing to mentally-unstable personality', () => {
    const { result } = renderHook(() => usePersonalities());

    act(() => {
      result.current.handlePersonalityChange('mentally-unstable');
    });

    expect(result.current.selectedPersonality).toBe('mentally-unstable');
    expect(result.current.systemPrompt).toContain('mentally unstable');
    expect(result.current.systemPrompt).toContain('erratic');
  });

  it('should update system prompt with custom value', () => {
    const { result } = renderHook(() => usePersonalities());

    const customPrompt = 'You are a custom assistant with specific instructions.';
    
    act(() => {
      result.current.updateSystemPrompt(customPrompt);
    });

    expect(result.current.systemPrompt).toBe(customPrompt);
    expect(result.current.customSystemPrompt).toBe(customPrompt);
  });

  it('should reset to selected personality prompt', () => {
    const { result } = renderHook(() => usePersonalities());

    // First, change to creative personality
    act(() => {
      result.current.handlePersonalityChange('creative');
    });

    const creativePrompt = result.current.systemPrompt;

    // Then update with custom prompt
    act(() => {
      result.current.updateSystemPrompt('Custom prompt override');
    });

    expect(result.current.systemPrompt).toBe('Custom prompt override');

    // Reset back to creative personality prompt
    act(() => {
      result.current.resetToSelectedPersonality();
    });

    expect(result.current.systemPrompt).toBe(creativePrompt);
    expect(result.current.customSystemPrompt).toBe(creativePrompt);
  });

  it('should handle invalid personality name gracefully', () => {
    const { result } = renderHook(() => usePersonalities());

    const initialPrompt = result.current.systemPrompt;

    act(() => {
      result.current.handlePersonalityChange('non-existent-personality');
    });

    // Should update selected personality but keep the same prompt
    expect(result.current.selectedPersonality).toBe('non-existent-personality');
    expect(result.current.systemPrompt).toBe(initialPrompt);
    expect(result.current.customSystemPrompt).toBe(initialPrompt);
  });

  it('should preserve custom prompt when changing personalities and then resetting', () => {
    const { result } = renderHook(() => usePersonalities());

    // Start with default
    expect(result.current.selectedPersonality).toBe('default');

    // Change to technical
    act(() => {
      result.current.handlePersonalityChange('technical');
    });

    // Customize the prompt
    act(() => {
      result.current.updateSystemPrompt('Technical assistant with extra skills');
    });

    // Change to another personality
    act(() => {
      result.current.handlePersonalityChange('creative');
    });

    // The prompt should now be creative's default
    expect(result.current.systemPrompt).toContain('creative assistant');

    // Go back to technical
    act(() => {
      result.current.handlePersonalityChange('technical');
    });

    // Should get technical's default prompt, not the customized one
    expect(result.current.systemPrompt).toContain('technical assistant');
    expect(result.current.systemPrompt).toContain('precise');
    expect(result.current.systemPrompt).not.toContain('extra skills');
  });

  it('should have correct personality descriptions', () => {
    const { result } = renderHook(() => usePersonalities());

    const personalities = result.current.personalities;
    
    expect(personalities.find(p => p.name === 'default')?.description).toBe('Standard assistant');
    expect(personalities.find(p => p.name === 'creative')?.description).toBe('A creative and inspiring assistant.');
    expect(personalities.find(p => p.name === 'technical')?.description).toBe('A technical and precise assistant.');
    expect(personalities.find(p => p.name === 'witty')?.description).toBe('A witty and sarcastic assistant.');
    expect(personalities.find(p => p.name === 'mentally-unstable')?.description).toBe('An unstable and unpredictable assistant.');
  });
});