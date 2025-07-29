import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Message } from './useConversations';
import { CodeBlockDetector } from '@/lib/utils/code-block-detector';
import { useOfflineStatus } from './useOfflineStatus';

interface ChatResponse {
  content: string;
  artifacts?:
    | Array<{
        name: string;
        type: string;
        content: string;
      }>
    | undefined;
}

interface ChatConfig {
  maxMessages?: number;
  apiTimeout?: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: Required<ChatConfig> = {
  maxMessages: 100, // Limit message history to prevent memory issues
  apiTimeout: 30000, // 30 seconds
  maxRetries: 3,
};

export const useOptimizedChat = (config: ChatConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: '1',
      role: 'assistant',
      content:
        'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to prevent stale closures and memory leaks
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);
  const lastMessageIdRef = useRef<string>('1');

  const { isOffline } = useOfflineStatus();

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoize the initial message to prevent recreation
  const initialMessage = useMemo(
    () => ({
      id: '1',
      role: 'assistant' as const,
      content:
        'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
      timestamp: new Date(),
    }),
    []
  );

  const resetMessages = useCallback(() => {
    setMessages([initialMessage]);
    setError(null);
    lastMessageIdRef.current = '1';
  }, [initialMessage]);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  // Memory-optimized message management
  const addMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];

        // Limit message history to prevent memory issues
        if (newMessages.length > finalConfig.maxMessages) {
          // Keep the first message (welcome) and remove old messages
          return [newMessages[0], ...newMessages.slice(-finalConfig.maxMessages + 1)];
        }

        return newMessages;
      });
      lastMessageIdRef.current = message.id;
    },
    [finalConfig.maxMessages]
  );

  const updateLastMessage = useCallback((update: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === lastMessageIdRef.current ? { ...msg, ...update } : msg))
    );
  }, []);

  // Optimized API call with retry logic and memory management
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: string[],
      useStreaming: boolean = true
    ): Promise<ChatResponse | null> => {
      if (isOffline) {
        setError('You are currently offline. Please check your connection.');
        return null;
      }

      if (!content.trim()) {
        return null;
      }

      // Cancel any existing requests
      cancelStreaming();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setIsStreaming(useStreaming);
      setError(null);
      retryCountRef.current = 0;

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachments,
      };
      addMessage(userMessage);

      // Create placeholder for assistant response
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: useStreaming,
      };
      addMessage(assistantMessage);

      const makeRequest = async (): Promise<ChatResponse | null> => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

          const requestBody = {
            message: content,
            conversation_history: messages.slice(-10), // Limit history sent to API
            streaming: useStreaming,
            ...(attachments && { attachments }),
          };

          const response = await fetch('/api/v1/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey && { 'X-API-Key': apiKey }),
            },
            body: JSON.stringify(requestBody),
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

          if (useStreaming && response.body) {
            return handleStreamingResponse(response.body, assistantMessageId);
          } else {
            const data = await response.json();
            updateLastMessage({
              content: data.content || 'No response received',
              isStreaming: false,
              artifacts: data.artifacts,
            });
            return data;
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return null; // Request was cancelled
          }

          console.error('Chat API error:', error);

          // Retry logic with exponential backoff
          if (
            retryCountRef.current < finalConfig.maxRetries &&
            !abortControllerRef.current?.signal.aborted
          ) {
            retryCountRef.current++;
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);

            await new Promise((resolve) => setTimeout(resolve, delay));
            return makeRequest();
          }

          const errorMessage = error.message || 'An unexpected error occurred';
          setError(errorMessage);
          updateLastMessage({
            content: `Error: ${errorMessage}`,
            isStreaming: false,
            isError: true,
          });
          return null;
        } finally {
          setIsLoading(false);
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      };

      return makeRequest();
    },
    [isOffline, messages, cancelStreaming, addMessage, updateLastMessage, finalConfig.maxRetries]
  );

  // Optimized streaming response handler
  const handleStreamingResponse = useCallback(
    async (body: ReadableStream<Uint8Array>, messageId: string): Promise<ChatResponse> => {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let artifacts: any[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.content) {
                  accumulatedContent += data.content;
                  updateLastMessage({
                    content: accumulatedContent,
                    isStreaming: true,
                  });
                }

                if (data.artifacts) {
                  artifacts = [...artifacts, ...data.artifacts];
                }

                if (data.done) {
                  updateLastMessage({
                    content: accumulatedContent,
                    isStreaming: false,
                    artifacts: artifacts.length > 0 ? artifacts : undefined,
                  });
                  return { content: accumulatedContent, artifacts };
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return { content: accumulatedContent, artifacts };
    },
    [updateLastMessage]
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      messages,
      isLoading,
      isStreaming,
      error,
      sendMessage,
      resetMessages,
      cancelStreaming,
      isOffline,
      messageCount: messages.length,
      canSendMessage: !isLoading && !isOffline && messages.length < finalConfig.maxMessages,
    }),
    [
      messages,
      isLoading,
      isStreaming,
      error,
      sendMessage,
      resetMessages,
      cancelStreaming,
      isOffline,
      finalConfig.maxMessages,
    ]
  );
};
