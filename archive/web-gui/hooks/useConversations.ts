import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: string;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Load conversations from localStorage
  const loadConversations = useCallback(() => {
    try {
      const stored = localStorage.getItem('dinoair-conversations');
      if (stored) {
        const parsed = JSON.parse(stored);
        const conversations = parsed.map((conv: Partial<Conversation> & {
          createdAt: string;
          updatedAt: string;
          messages: Array<Partial<Message> & { timestamp: string }>
        }) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg) => ({
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

  // Save current conversation
  const saveCurrentConversation = useCallback((
    messages: Message[],
    selectedModel: string,
    systemPrompt: string,
    name?: string
  ) => {
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
  }, [activeConversationId, conversations, saveConversations]);

  // Load a conversation
  const loadConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversationId(conversationId);
      return conversation;
    }
    return null;
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      const filtered = conversations.filter(c => c.id !== conversationId);
      saveConversations(filtered);
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        return true; // Signal that active conversation was deleted
      }
    }
    return false;
  }, [conversations, activeConversationId, saveConversations]);

  // New conversation
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    activeConversationId,
    saveCurrentConversation,
    loadConversation,
    deleteConversation,
    startNewConversation
  };
};