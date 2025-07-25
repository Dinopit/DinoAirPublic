'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { CodeBlockDetector } from '@/lib/utils/code-block-detector';
import { apiClient } from '@/lib/api/enhanced-client';
import { toast } from '@/lib/stores/toast-store';
import { usePersonalities, useCurrentPersonality } from '@/lib/stores/personality-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Artifact {
  id: string;
  name: string;
  type: string;
  content: string;
  createdAt: Date;
}

interface Model {
  name: string;
  size: number;
  digest: string;
  modified: string;
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: string;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

// Memoized message component for better performance
const MessageItem = memo<{ message: Message }>(({ message }) => (
  <div
    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[70%] p-3 rounded-lg ${
        message.role === 'user'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      }`}
    >
      <p className="whitespace-pre-wrap">{message.content}</p>
      <p className="text-xs opacity-70 mt-1">
        {message.timestamp.toLocaleTimeString()}
      </p>
    </div>
  </div>
));

MessageItem.displayName = 'MessageItem';

// Memoized loading indicator
const LoadingIndicator = memo(() => (
  <div className="flex justify-start">
    <div className="bg-muted text-foreground p-3 rounded-lg">
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

const LocalChatView = memo(() => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen:7b-chat-v1.5-q4_K_M');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [artifactNotifications, setArtifactNotifications] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use centralized personality store
  const { personalities, loading: personalitiesLoading } = usePersonalities();
  const { currentPersonality, setCurrentPersonality } = useCurrentPersonality();
  
  // Initialize system prompt from current personality
  const systemPrompt = useMemo(() => 
    customSystemPrompt || currentPersonality?.systemPrompt || 'You are a helpful AI assistant.',
    [customSystemPrompt, currentPersonality]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (artifactNotifications.length > 0) {
      const timer = setTimeout(() => {
        setArtifactNotifications(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [artifactNotifications]);

  // Load models and conversations on mount
  useEffect(() => {
    fetchModels();
    loadConversations();
    // Personalities will be fetched automatically by the store if needed
  }, []);

  // Load conversations from localStorage
  const loadConversations = useCallback(() => {
    try {
      const stored = localStorage.getItem('dinoair-conversations');
      if (stored) {
        const parsed = JSON.parse(stored);
        const conversations = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Save conversations to localStorage
  const saveConversations = useCallback((updatedConversations: Conversation[]) => {
    try {
      localStorage.setItem('dinoair-conversations', JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }, []);

  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      const response = await apiClient.get<{ models: Model[] }>('/ollama/models', {
        retryConfig: {
          maxAttempts: 2,
          initialDelay: 500
        },
        context: {
          endpoint: '/api/ollama/models',
          method: 'GET'
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      if (response.data?.models) {
        setModels(response.data.models);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      toast.warning(
        'Failed to load AI models',
        'Using default model. Make sure Ollama is running.',
        {
          actions: [
            {
              label: 'Retry',
              onClick: () => {
                fetchModels();
              }
            }
          ]
        }
      );
    }
  }, []);

  // Save current conversation
  const saveCurrentConversation = useCallback((name?: string) => {
    const conversationName = name || `Conversation ${new Date().toLocaleString()}`;
    const conversation: Conversation = {
      id: activeConversationId || Date.now().toString(),
      name: conversationName,
      messages: messages,
      model: selectedModel,
      systemPrompt: systemPrompt,
      createdAt: activeConversationId ?
        conversations.find(c => c.id === activeConversationId)?.createdAt || new Date() :
        new Date(),
      updatedAt: new Date()
    };

    const updatedConversations = activeConversationId
      ? conversations.map(c => c.id === activeConversationId ? conversation : c)
      : [...conversations, conversation];

    saveConversations(updatedConversations);
    setActiveConversationId(conversation.id);
  }, [activeConversationId, conversations, messages, selectedModel, systemPrompt, saveConversations]);

  // Load a conversation
  const loadConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setSelectedModel(conversation.model);
      setCustomSystemPrompt(conversation.systemPrompt);
      setActiveConversationId(conversationId);
    }
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      const filtered = conversations.filter(c => c.id !== conversationId);
      saveConversations(filtered);
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
          timestamp: new Date()
        }]);
      }
    }
  }, [conversations, activeConversationId, saveConversations]);

  // New conversation
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Welcome to DinoAir Free Tier! I can help you with AI-powered conversations and image generation. How can I assist you today?',
      timestamp: new Date()
    }]);
  }, []);

  // Handle personality selection
  const handlePersonalityChange = useCallback((personalityId: string) => {
    const personality = personalities.find(p => p.id === personalityId);
    if (personality) {
      setCurrentPersonality(personality);
      setCustomSystemPrompt(personality.systemPrompt || '');
    }
  }, [personalities, setCurrentPersonality]);

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  // Create artifacts from code blocks
  const createArtifactsFromCodeBlocks = useCallback((artifactInfos: { name: string; type: string; content: string }[]) => {
    try {
      // Load existing artifacts
      const stored = localStorage.getItem('dinoair-artifacts');
      let existingArtifacts: Artifact[] = [];
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          existingArtifacts = Array.isArray(parsed) ? parsed : [];
        } catch {
          existingArtifacts = [];
        }
      }

      // Create new artifacts
      const newArtifacts: Artifact[] = artifactInfos.map(info => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: info.name,
        type: info.type,
        content: info.content,
        createdAt: new Date()
      }));

      // Save artifacts
      const allArtifacts = [...existingArtifacts, ...newArtifacts];
      localStorage.setItem('dinoair-artifacts', JSON.stringify(allArtifacts));

      // Show notifications
      const notifications = newArtifacts.map(artifact =>
        `Created artifact: ${artifact.name}`
      );
      setArtifactNotifications(prev => [...prev, ...notifications]);
    } catch (error) {
      console.error('Failed to create artifacts:', error);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
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
      // Use fetch directly for streaming response
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          personality: currentPersonality?.id || 'default',
          systemPrompt: systemPrompt,
          stream: true
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
          // If parsing JSON fails, use status text
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
      if (codeBlocks.length > 0) {
        const artifacts = CodeBlockDetector.codeBlocksToArtifacts(codeBlocks);
        createArtifactsFromCodeBlocks(artifacts);
      }

      // Auto-save conversation after successful response
      if (activeConversationId) {
        saveCurrentConversation();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Don't show error if it was cancelled
      if (error.name !== 'AbortError') {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        
        // Update the message to show error
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: `Error: ${errorMessage}` }
              : msg
          )
        );
        
        // Show toast notification for error
        toast.error(
          'Failed to send message',
          errorMessage,
          {
            actions: [
              {
                label: 'Retry',
                onClick: () => {
                  // Remove the error message and retry
                  setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
                  setInputValue(userMessage.content);
                }
              }
            ]
          }
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, messages, selectedModel, currentPersonality, systemPrompt, activeConversationId, saveCurrentConversation, createArtifactsFromCodeBlocks]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Memoize active conversation name
  const activeConversationName = useMemo(() => 
    conversations.find(c => c.id === activeConversationId)?.name,
    [conversations, activeConversationId]
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Artifact Notifications */}
      {artifactNotifications.length > 0 && (
        <div className="absolute top-4 right-4 z-50 space-y-2">
          {artifactNotifications.map((notification, index) => (
            <div
              key={index}
              className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in flex items-center gap-2"
              style={{
                animation: 'fadeIn 0.3s ease-in-out',
                animationDelay: `${index * 0.1}s`
              }}
            >
              <span>📄</span>
              <span className="text-sm">{notification}</span>
              <button
                onClick={() => setArtifactNotifications(prev => prev.filter((_, i) => i !== index))}
                className="ml-2 text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Header with controls */}
      <div className="border-b bg-card p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 items-center">
              {/* Model Selection */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background text-foreground"
              >
                <option value="qwen:7b-chat-v1.5-q4_K_M">Qwen 7B (Default)</option>
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-2 border rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
              >
                ⚙️ Settings
              </button>
            </div>

            <div className="flex gap-2">
              {/* Conversation Management */}
              <button
                onClick={startNewConversation}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                New Chat
              </button>
              <button
                onClick={() => {
                  const name = prompt('Enter conversation name:');
                  if (name) saveCurrentConversation(name);
                }}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Save Chat
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) loadConversation(e.target.value);
                }}
                className="px-3 py-2 border rounded-lg bg-background text-foreground"
              >
                <option value="">Load Conversation...</option>
                {conversations.map((conv) => (
                  <option key={conv.id} value={conv.id}>
                    {conv.name} ({conv.messages.length} messages)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-3">System Prompt Configuration</h3>
              
              {/* Personality Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Personality</label>
                {personalitiesLoading ? (
                  <div className="w-full px-3 py-2 border rounded-lg bg-background text-muted-foreground">
                    Loading personalities...
                  </div>
                ) : (
                  <select
                    value={currentPersonality?.id || 'default'}
                    onChange={(e) => handlePersonalityChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
                  >
                    {personalities.map((personality) => (
                      <option key={personality.id} value={personality.id}>
                        {personality.name} - {personality.description || 'No description'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Custom System Prompt */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">System Prompt</label>
                <textarea
                  value={customSystemPrompt || currentPersonality?.systemPrompt || ''}
                  onChange={(e) => {
                    setCustomSystemPrompt(e.target.value);
                  }}
                  className="w-full h-32 p-3 border rounded-lg bg-background text-foreground resize-none"
                  placeholder="Enter custom system prompt..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentPersonality) {
                      setCustomSystemPrompt(currentPersonality.systemPrompt || '');
                    }
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reset to Selected Personality
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Close Settings
                </button>
              </div>
            </div>
          )}

          {/* Active Conversation Info */}
          {activeConversationId && (
            <div className="mt-2 text-sm text-muted-foreground">
              Active: {activeConversationName}
              <button
                onClick={() => deleteConversation(activeConversationId)}
                className="ml-2 text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          {isLoading && !isStreaming && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-3 border rounded-lg resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={1}
              disabled={isLoading}
            />
            {isStreaming ? (
              <button
                onClick={cancelStreaming}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

LocalChatView.displayName = 'LocalChatView';

export default LocalChatView;
