'use client';

import React, { useState } from 'react';
import { VoiceControls } from '../../components/ui/voice-controls';
import { VoiceSettings } from '../../components/ui/voice-settings';
import { VoiceInput } from '../../components/dinoair-gui/chat/VoiceInput';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

export default function VoiceDemoPage() {
  const [messages, setMessages] = useState<
    Array<{ id: string; content: string; role: 'user' | 'assistant' }>
  >([]);
  const [lastMessage, setLastMessage] = useState('');
  const { speak } = useTextToSpeech();

  const handleSendMessage = (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user' as const,
    };

    // Simulate AI response
    const aiResponse = {
      id: (Date.now() + 1).toString(),
      content: `I received your message: "${message}". This is a demo response from DinoAir's voice integration system.`,
      role: 'assistant' as const,
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setLastMessage(aiResponse.content);
  };

  const handleAudioMessage = (audioBlob: Blob) => {
    const audioMessage = {
      id: Date.now().toString(),
      content: `[Audio message - ${Math.round(audioBlob.size / 1024)}KB]`,
      role: 'user' as const,
    };

    setMessages((prev) => [...prev, audioMessage]);
  };

  const handleNewChat = () => {
    setMessages([]);
    setLastMessage('');
  };

  const testTTS = () => {
    speak(
      "Hello! This is DinoAir's voice integration system. I can speak text aloud, recognize your voice commands, and process audio messages."
    );
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">🦕 DinoAir Voice Integration Demo</h1>
          <p className="text-lg text-muted-foreground">
            Advanced voice capabilities including speech-to-text, text-to-speech, voice commands,
            and audio messages
          </p>
          <button
            onClick={testTTS}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Test Text-to-Speech
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Input Demo */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Voice Input & Commands</h2>
            <div className="border rounded-lg p-6 bg-card">
              <VoiceInput
                onSendMessage={handleSendMessage}
                onAudioMessage={handleAudioMessage}
                onNewChat={handleNewChat}
                lastMessage={lastMessage}
              />
            </div>
          </div>

          {/* Voice Settings Demo */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Voice Settings</h2>
            <div className="border rounded-lg p-6 bg-card max-h-96 overflow-y-auto">
              <VoiceSettings />
            </div>
          </div>

          {/* Simple Voice Controls */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Basic Voice Controls</h2>
            <div className="border rounded-lg p-6 bg-card">
              <VoiceControls
                onTranscriptChange={(transcript) => {
                  if (transcript.trim()) {
                    handleSendMessage(transcript);
                  }
                }}
                onAudioMessage={handleAudioMessage}
              />
            </div>
          </div>

          {/* Message History */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Conversation History</h2>
            <div className="border rounded-lg p-6 bg-card max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No messages yet. Try using voice input or type a message!
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-8'
                          : 'bg-muted mr-8'
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {message.role === 'user' ? 'You' : 'DinoAir'}
                      </div>
                      <div>{message.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold mb-4">✨ Voice Features Implemented</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium">🎤 Speech-to-Text</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Continuous voice recognition</li>
                <li>• Interim results display</li>
                <li>• Multi-language support (14 languages)</li>
                <li>• Browser-native Web Speech API</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">🔊 Text-to-Speech</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Natural voice synthesis</li>
                <li>• Customizable voice, rate, pitch</li>
                <li>• Auto-read AI responses</li>
                <li>• Pause/resume controls</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">🗣️ Voice Commands</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "DinoAir new chat"</li>
                <li>• "DinoAir save conversation"</li>
                <li>• "DinoAir clear chat"</li>
                <li>• Fuzzy matching with 70% accuracy</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">🎵 Audio Messages</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Record voice messages</li>
                <li>• Duration tracking</li>
                <li>• Audio compression</li>
                <li>• Download recordings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Browser Support */}
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-semibold mb-4">🌐 Browser Support</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-green-100 rounded-lg">
              <div className="font-medium">Chrome</div>
              <div className="text-green-600">Full Support</div>
            </div>
            <div className="text-center p-2 bg-green-100 rounded-lg">
              <div className="font-medium">Edge</div>
              <div className="text-green-600">Full Support</div>
            </div>
            <div className="text-center p-2 bg-yellow-100 rounded-lg">
              <div className="font-medium">Safari</div>
              <div className="text-yellow-600">Partial Support</div>
            </div>
            <div className="text-center p-2 bg-red-100 rounded-lg">
              <div className="font-medium">Firefox</div>
              <div className="text-red-600">Limited Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
