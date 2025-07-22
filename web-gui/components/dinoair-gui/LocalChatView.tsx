'use client';

import React, { useState, useCallback, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';
import { useModels } from '@/hooks/useModels';
import { usePersonalities } from '@/hooks/usePersonalities';
import { useArtifacts } from '@/hooks/useArtifacts';

// Lazy load components for code splitting
const ChatHeader = dynamic(() => import('./chat/ChatHeader'), {
  loading: () => <div className="h-16 bg-card border-b animate-pulse" />
});

const ChatSettings = dynamic(() => import('./chat/ChatSettings'), {
  loading: () => <div className="h-32 animate-pulse" />
});

const ChatMessages = dynamic(() => import('./chat/ChatMessages'), {
  loading: () => <div className="flex-grow animate-pulse" />
});

const ChatInput = dynamic(() => import('./chat/ChatInput'), {
  loading: () => <div className="h-20 bg-card border-t animate-pulse" />
});

const ArtifactNotifications = dynamic(() => import('./chat/ArtifactNotifications'), {
  loading: () => null
});

const LocalChatView = () => {
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom hooks
  const {
    messages,
    setMessages,
    isLoading,
    isStreaming,
    sendMessage,
    cancelStreaming,
    resetMessages
  } = useChat();

  const {
    conversations,
    activeConversationId,
    saveCurrentConversation,
    loadConversation,
    deleteConversation,
    startNewConversation
  } = useConversations();

  const { models, selectedModel, setSelectedModel } = useModels();

  const {
    personalities,
    selectedPersonality,
    systemPrompt,
    customSystemPrompt,
    handlePersonalityChange,
    resetToSelectedPersonality,
    updateSystemPrompt
  } = usePersonalities();

  const {
    artifactNotifications,
    createArtifactsFromCodeBlocks,
    dismissNotification
  } = useArtifacts();

  // Handle loading a conversation
  const handleLoadConversation = useCallback((conversationId: string) => {
    const conversation = loadConversation(conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setSelectedModel(conversation.model);
      updateSystemPrompt(conversation.systemPrompt);
    }
  }, [loadConversation, setMessages, setSelectedModel, updateSystemPrompt]);

  // Handle deleting a conversation
  const handleDeleteConversation = useCallback((conversationId: string) => {
    const wasActiveDeleted = deleteConversation(conversationId);
    if (wasActiveDeleted) {
      resetMessages();
    }
  }, [deleteConversation, resetMessages]);

  // Handle starting a new conversation
  const handleNewConversation = useCallback(() => {
    startNewConversation();
    resetMessages();
  }, [startNewConversation, resetMessages]);

  // Handle saving conversation
  const handleSaveConversation = useCallback(() => {
    const name = prompt('Enter conversation name:');
    if (name) {
      saveCurrentConversation(messages, selectedModel, systemPrompt || customSystemPrompt, name);
    }
  }, [messages, selectedModel, systemPrompt, customSystemPrompt, saveCurrentConversation]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      const response = await sendMessage(content, selectedModel, systemPrompt || customSystemPrompt);
      
      // Create artifacts if code blocks were detected
      if (response.artifacts) {
        createArtifactsFromCodeBlocks(response.artifacts);
      }

      // Auto-save conversation after successful response
      if (activeConversationId) {
        saveCurrentConversation(messages, selectedModel, systemPrompt || customSystemPrompt);
      }
    } catch (error) {
      // Error is already handled in the hook
      console.error('Error sending message:', error);
    }
  }, [
    sendMessage,
    selectedModel,
    systemPrompt,
    customSystemPrompt,
    createArtifactsFromCodeBlocks,
    activeConversationId,
    saveCurrentConversation,
    messages
  ]);

  return (
    <div className="flex flex-col h-full relative">
      <Suspense fallback={null}>
        <ArtifactNotifications
          notifications={artifactNotifications}
          onDismiss={dismissNotification}
        />
      </Suspense>

      <Suspense fallback={<div className="h-16 bg-card border-b animate-pulse" />}>
        <ChatHeader
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          models={models}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          onNewConversation={handleNewConversation}
          onSaveConversation={handleSaveConversation}
          conversations={conversations}
          onLoadConversation={handleLoadConversation}
          activeConversationId={activeConversationId}
          onDeleteConversation={handleDeleteConversation}
        />
      </Suspense>

      <div className="max-w-4xl mx-auto w-full px-4">
        <Suspense fallback={<div className="h-32 animate-pulse" />}>
          <ChatSettings
            showSettings={showSettings}
            selectedPersonality={selectedPersonality}
            personalities={personalities}
            customSystemPrompt={customSystemPrompt}
            onPersonalityChange={handlePersonalityChange}
            onSystemPromptChange={updateSystemPrompt}
            onResetToSelectedPersonality={resetToSelectedPersonality}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="flex-grow animate-pulse" />}>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
      </Suspense>

      <Suspense fallback={<div className="h-20 bg-card border-t animate-pulse" />}>
        <ChatInput
          isLoading={isLoading}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onCancelStreaming={cancelStreaming}
        />
      </Suspense>
    </div>
  );
};

export default LocalChatView;