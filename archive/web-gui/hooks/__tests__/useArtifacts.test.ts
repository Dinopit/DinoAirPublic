import { renderHook, act } from '@testing-library/react';
import { useArtifacts } from '../useArtifacts';

describe('useArtifacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useArtifacts());

    expect(result.current.artifactNotifications).toEqual([]);
  });

  it('should create artifacts from code blocks', () => {
    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'example.js', type: 'javascript', content: 'console.log("test");' },
      { name: 'styles.css', type: 'css', content: 'body { margin: 0; }' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    // Check notifications were created
    expect(result.current.artifactNotifications).toHaveLength(2);
    expect(result.current.artifactNotifications[0]).toBe('Created artifact: example.js');
    expect(result.current.artifactNotifications[1]).toBe('Created artifact: styles.css');

    // Check artifacts were saved to localStorage
    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    expect(savedArtifacts).toHaveLength(2);
    expect(savedArtifacts[0].name).toBe('example.js');
    expect(savedArtifacts[0].type).toBe('javascript');
    expect(savedArtifacts[0].content).toBe('console.log("test");');
    expect(savedArtifacts[1].name).toBe('styles.css');
  });

  it('should append to existing artifacts in localStorage', () => {
    // Pre-populate localStorage
    const existingArtifacts = [
      {
        id: 'existing-1',
        name: 'existing.js',
        type: 'javascript',
        content: 'const x = 1;',
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('dinoair-artifacts', JSON.stringify(existingArtifacts));

    const { result } = renderHook(() => useArtifacts());

    const newCodeBlocks = [
      { name: 'new.js', type: 'javascript', content: 'const y = 2;' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(newCodeBlocks);
    });

    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    expect(savedArtifacts).toHaveLength(2);
    expect(savedArtifacts[0].name).toBe('existing.js');
    expect(savedArtifacts[1].name).toBe('new.js');
  });

  it('should auto-dismiss notifications after 5 seconds', () => {
    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test.js', type: 'javascript', content: 'test' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    expect(result.current.artifactNotifications).toHaveLength(1);

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.artifactNotifications).toHaveLength(0);
  });

  it('should auto-dismiss notifications in order', () => {
    const { result } = renderHook(() => useArtifacts());

    // Create first notification
    act(() => {
      result.current.createArtifactsFromCodeBlocks([
        { name: 'first.js', type: 'javascript', content: 'first' },
      ]);
    });

    expect(result.current.artifactNotifications).toHaveLength(1);

    // Wait 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Create second notification
    act(() => {
      result.current.createArtifactsFromCodeBlocks([
        { name: 'second.js', type: 'javascript', content: 'second' },
      ]);
    });

    expect(result.current.artifactNotifications).toHaveLength(2);

    // Wait 3 more seconds (total 5 seconds for first notification)
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // First notification should be dismissed
    expect(result.current.artifactNotifications).toHaveLength(1);
    expect(result.current.artifactNotifications[0]).toBe('Created artifact: second.js');

    // Wait 2 more seconds (total 5 seconds for second notification)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.artifactNotifications).toHaveLength(0);
  });

  it('should manually dismiss notifications', () => {
    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test1.js', type: 'javascript', content: 'test1' },
      { name: 'test2.js', type: 'javascript', content: 'test2' },
      { name: 'test3.js', type: 'javascript', content: 'test3' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    expect(result.current.artifactNotifications).toHaveLength(3);

    // Dismiss the middle notification
    act(() => {
      result.current.dismissNotification(1);
    });

    expect(result.current.artifactNotifications).toHaveLength(2);
    expect(result.current.artifactNotifications[0]).toBe('Created artifact: test1.js');
    expect(result.current.artifactNotifications[1]).toBe('Created artifact: test3.js');
  });

  it('should generate unique IDs for artifacts', () => {
    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test.js', type: 'javascript', content: 'test' },
      { name: 'test.js', type: 'javascript', content: 'test' }, // Same name
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    expect(savedArtifacts).toHaveLength(2);
    expect(savedArtifacts[0].id).not.toBe(savedArtifacts[1].id);
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock localStorage.setItem to throw an error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test.js', type: 'javascript', content: 'test' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    // Should not throw, but log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to create artifacts:',
      expect.any(Error)
    );

    // Notifications should still be empty since operation failed
    expect(result.current.artifactNotifications).toEqual([]);

    // Restore
    localStorage.setItem = originalSetItem;
    consoleErrorSpy.mockRestore();
  });

  it('should handle corrupted localStorage data', () => {
    localStorage.setItem('dinoair-artifacts', 'invalid json');

    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test.js', type: 'javascript', content: 'test' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    // Should create new array with just the new artifact
    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    expect(savedArtifacts).toHaveLength(1);
    expect(savedArtifacts[0].name).toBe('test.js');
  });

  it('should handle non-array localStorage data', () => {
    localStorage.setItem('dinoair-artifacts', '{"not": "an array"}');

    const { result } = renderHook(() => useArtifacts());

    const codeBlocks = [
      { name: 'test.js', type: 'javascript', content: 'test' },
    ];

    act(() => {
      result.current.createArtifactsFromCodeBlocks(codeBlocks);
    });

    // Should create new array with just the new artifact
    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    expect(savedArtifacts).toHaveLength(1);
    expect(savedArtifacts[0].name).toBe('test.js');
  });

  it('should create artifacts with proper structure', () => {
    const { result } = renderHook(() => useArtifacts());

    const codeBlock = {
      name: 'component.tsx',
      type: 'typescript',
      content: 'export const Component = () => <div>Hello</div>;',
    };

    act(() => {
      result.current.createArtifactsFromCodeBlocks([codeBlock]);
    });

    const savedArtifacts = JSON.parse(localStorage.getItem('dinoair-artifacts') || '[]');
    const artifact = savedArtifacts[0];

    expect(artifact).toMatchObject({
      id: expect.any(String),
      name: 'component.tsx',
      type: 'typescript',
      content: 'export const Component = () => <div>Hello</div>;',
      createdAt: expect.any(String),
    });

    // Verify ID format
    expect(artifact.id).toMatch(/^\d+[a-z0-9]+$/);
    
    // Verify date is valid
    expect(new Date(artifact.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('should handle empty code blocks array', () => {
    const { result } = renderHook(() => useArtifacts());

    act(() => {
      result.current.createArtifactsFromCodeBlocks([]);
    });

    expect(result.current.artifactNotifications).toEqual([]);
    
    const savedArtifacts = localStorage.getItem('dinoair-artifacts');
    expect(savedArtifacts).toBeNull(); // localStorage not touched
  });
});
