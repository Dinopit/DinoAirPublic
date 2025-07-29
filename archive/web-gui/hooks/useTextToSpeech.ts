'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice | null;
  language?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: Partial<TextToSpeechOptions>) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  error: string | null;
}

export const useTextToSpeech = (options: TextToSpeechOptions = {}): UseTextToSpeechReturn => {
  const { rate = 1, pitch = 1, volume = 1, voice = null, language = 'en-US' } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(voice);
  const [currentRate, setCurrentRate] = useState(rate);
  const [currentPitch, setCurrentPitch] = useState(pitch);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Set default voice to the first one matching the language or first available
      if (!currentVoice && availableVoices.length > 0) {
        const defaultVoice =
          availableVoices.find((v) => v.lang.startsWith(language.split('-')[0])) ||
          availableVoices[0];
        setCurrentVoice(defaultVoice);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, language, currentVoice]);

  // Monitor speech synthesis state
  useEffect(() => {
    if (!isSupported) return;

    const checkSpeaking = () => {
      setIsSpeaking(speechSynthesis.speaking);
      setIsPaused(speechSynthesis.paused);
    };

    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, speakOptions: Partial<TextToSpeechOptions> = {}) => {
      if (!isSupported) {
        setError('Text-to-speech not supported in this browser');
        return;
      }

      if (!text.trim()) {
        setError('No text provided to speak');
        return;
      }

      // Cancel any current speech
      speechSynthesis.cancel();

      try {
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.rate = speakOptions.rate ?? currentRate;
        utterance.pitch = speakOptions.pitch ?? currentPitch;
        utterance.volume = speakOptions.volume ?? currentVolume;
        utterance.voice = speakOptions.voice ?? currentVoice;
        utterance.lang = language;

        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          setError(null);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
        };

        utterance.onerror = (event) => {
          setError(`Speech synthesis error: ${event.error}`);
          setIsSpeaking(false);
          setIsPaused(false);
          utteranceRef.current = null;
        };

        utterance.onpause = () => {
          setIsPaused(true);
        };

        utterance.onresume = () => {
          setIsPaused(false);
        };

        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      } catch (err) {
        setError('Failed to initialize speech synthesis');
      }
    },
    [isSupported, currentRate, currentPitch, currentVolume, currentVoice, language]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking && !isPaused) {
      speechSynthesis.pause();
    }
  }, [isSupported, isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isSupported && isSpeaking && isPaused) {
      speechSynthesis.resume();
    }
  }, [isSupported, isSpeaking, isPaused]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  const setRate = useCallback((rate: number) => {
    setCurrentRate(Math.max(0.1, Math.min(10, rate)));
  }, []);

  const setPitch = useCallback((pitch: number) => {
    setCurrentPitch(Math.max(0, Math.min(2, pitch)));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setCurrentVolume(Math.max(0, Math.min(1, volume)));
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    error,
  };
};
