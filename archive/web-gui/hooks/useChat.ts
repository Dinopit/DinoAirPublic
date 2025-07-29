import { useState, useRef, useCallback } from 'react';
import { Message } from './useConversations';
import { CodeBlockDetector } from '@/lib/utils/code-block-detector';
import { useOfflineStatus } from './useOfflineStatus';

interface ChatResponse {
  content: string;
  artifacts?: Array<{
    name: string;
    type: string;
    content: string;
  }> | undefined;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isOffline } = useOfflineStatus();

  const resetMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
        timestamp: new Date()
      }
    ]);
  }, []);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    model: string,
    systemPrompt: string
  ): Promise<ChatResponse> => {
    if (!content.trim() || isLoading) {
      throw new Error('Invalid message or already loading');
    }

    if (isOffline) {
      throw new Error('Cannot send messages while offline. Your message will be queued when you go back online.');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setIsStreaming(true);

    // Create assistant message with empty content that will be updated via streaming
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model,
          systemPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response from AI';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          errorMessage = `Error: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update the assistant message with accumulated content
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }

      // Check for code blocks and create artifacts
      const codeBlocks = CodeBlockDetector.detectCodeBlocks(accumulatedContent);
      const artifacts = codeBlocks.length > 0
        ? CodeBlockDetector.codeBlocksToArtifacts(codeBlocks)
        : undefined;

      return {
        content: accumulatedContent,
        artifacts
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't show error if it was cancelled
      if (error instanceof Error) {
        if (error.name !== 'AbortError') {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: `Error: ${error.message}` }
                : msg
            )
          );
        }
      } else {
        // Handle non-Error objects
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: `Error: An unexpected error occurred` }
              : msg
          )
        );
      }
      throw error;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  return {
    messages,
    setMessages,
    isLoading,
    isStreaming,
    sendMessage,
    cancelStreaming,
    resetMessages
  };
};
