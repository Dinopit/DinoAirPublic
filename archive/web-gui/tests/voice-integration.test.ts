import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useAudioRecording } from '../hooks/useAudioRecording';
import './voice-integration.setup';

describe('Voice Integration', () => {
  describe('useSpeechToText', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSpeechToText());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBe(null);
      expect(result.current.isSupported).toBe(true);
    });

    it('should provide control functions', () => {
      const { result } = renderHook(() => useSpeechToText());

      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
      expect(typeof result.current.resetTranscript).toBe('function');
      expect(typeof result.current.setLanguage).toBe('function');
    });

    it('should reset transcript when resetTranscript is called', () => {
      const { result } = renderHook(() => useSpeechToText());

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
      expect(result.current.error).toBe(null);
    });
  });

  describe('useTextToSpeech', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.voices).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should provide control functions', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.setVoice).toBe('function');
      expect(typeof result.current.setRate).toBe('function');
      expect(typeof result.current.setPitch).toBe('function');
      expect(typeof result.current.setVolume).toBe('function');
    });
  });

  describe('useAudioRecording', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAudioRecording());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isSupported).toBe(true);
      expect(result.current.audioBlob).toBe(null);
      expect(result.current.audioUrl).toBe(null);
      expect(result.current.duration).toBe(0);
      expect(result.current.error).toBe(null);
    });

    it('should provide control functions', () => {
      const { result } = renderHook(() => useAudioRecording());

      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.clearRecording).toBe('function');
      expect(typeof result.current.downloadRecording).toBe('function');
    });
  });
});
