'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Mic, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './button';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

interface VoiceSettingsProps {
  className?: string;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [autoReadResponses, setAutoReadResponses] = useState(false);
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);

  const {
    voices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    speak,
    isSupported: ttsSupported,
  } = useTextToSpeech();

  // Available languages for speech recognition
  const supportedLanguages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko-KR', name: 'Korean (South Korea)' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)' },
    { code: 'ru-RU', name: 'Russian (Russia)' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
  ];

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('dinoair-voice-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setSelectedLanguage(settings.language || 'en-US');
        setAutoReadResponses(settings.autoReadResponses || false);
        setVoiceCommandsEnabled(settings.voiceCommandsEnabled || false);
        setSelectedVoice(settings.selectedVoice || '');
        setSpeechRate(settings.speechRate || 1);
        setSpeechPitch(settings.speechPitch || 1);
        setSpeechVolume(settings.speechVolume || 1);
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    const settings = {
      language: selectedLanguage,
      autoReadResponses,
      voiceCommandsEnabled,
      selectedVoice,
      speechRate,
      speechPitch,
      speechVolume,
    };
    localStorage.setItem('dinoair-voice-settings', JSON.stringify(settings));
  };

  // Apply TTS settings when they change
  useEffect(() => {
    if (selectedVoice && voices.length > 0) {
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) {
        setVoice(voice);
      }
    }
    setRate(speechRate);
    setPitch(speechPitch);
    setVolume(speechVolume);
    saveSettings();
  }, [
    selectedVoice,
    speechRate,
    speechPitch,
    speechVolume,
    voices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  ]);

  // Save other settings
  useEffect(() => {
    saveSettings();
  }, [selectedLanguage, autoReadResponses, voiceCommandsEnabled]);

  const testVoice = () => {
    speak('Hello! This is a test of the text-to-speech feature in DinoAir.');
  };

  const resetToDefaults = () => {
    setSelectedLanguage('en-US');
    setAutoReadResponses(false);
    setVoiceCommandsEnabled(false);
    setSelectedVoice('');
    setSpeechRate(1);
    setSpeechPitch(1);
    setSpeechVolume(1);
  };

  if (
    !ttsSupported &&
    typeof window !== 'undefined' &&
    !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  ) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-md ${className}`}>
        <p className="text-sm text-yellow-800">
          Voice features are not supported in this browser. Please try Chrome, Edge, or Safari for
          voice functionality.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Voice Settings</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h4 className="text-md font-medium">General</h4>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-read responses */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto-read AI responses</label>
                <p className="text-xs text-muted-foreground">
                  Automatically read AI responses aloud
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoReadResponses}
                onChange={(e) => setAutoReadResponses(e.target.checked)}
                className="rounded"
              />
            </div>

            {/* Voice commands */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Voice commands</label>
                <p className="text-xs text-muted-foreground">
                  Enable voice commands like &quot;DinoAir new chat&quot;
                </p>
              </div>
              <input
                type="checkbox"
                checked={voiceCommandsEnabled}
                onChange={(e) => setVoiceCommandsEnabled(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>

          {/* Text-to-Speech Settings */}
          {ttsSupported && (
            <div className="space-y-4">
              <h4 className="text-md font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Text-to-Speech
              </h4>

              {/* Voice Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Voice</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Default voice</option>
                  {voices
                    .filter((voice) => voice.lang.startsWith(selectedLanguage.split('-')[0]))
                    .map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                </select>
              </div>

              {/* Speech Rate */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Speech Rate: {speechRate.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Speech Pitch */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Speech Pitch: {speechPitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Speech Volume */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Speech Volume: {Math.round(speechVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={speechVolume}
                  onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Test voice */}
              <Button onClick={testVoice} variant="outline" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Test Voice
              </Button>
            </div>
          )}

          {/* Voice Commands Help */}
          {voiceCommandsEnabled && (
            <div className="space-y-4">
              <h4 className="text-md font-medium flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Voice Commands
              </h4>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Available commands (prefix with &quot;DinoAir&quot;):</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>&quot;new chat&quot; - Start a new conversation</li>
                  <li>&quot;save conversation&quot; - Save current chat</li>
                  <li>&quot;clear chat&quot; - Clear conversation history</li>
                  <li>&quot;open settings&quot; - Open settings panel</li>
                  <li>&quot;close settings&quot; - Close settings panel</li>
                </ul>
              </div>
            </div>
          )}

          {/* Reset button */}
          <div className="pt-4 border-t">
            <Button onClick={resetToDefaults} variant="outline" className="w-full">
              Reset to Defaults
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
