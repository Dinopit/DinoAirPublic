'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Play, Pause } from 'lucide-react';
import { Button } from './button';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useAudioRecording } from '../../hooks/useAudioRecording';

interface VoiceControlsProps {
  onTranscriptChange?: (transcript: string) => void;
  onAudioMessage?: (audioBlob: Blob) => void;
  className?: string;
  compact?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onTranscriptChange,
  onAudioMessage,
  className = '',
  compact = false,
}) => {
  const [mode, setMode] = useState<'stt' | 'recording'>('stt');

  const {
    isListening: isListeningSTT,
    transcript,
    interimTranscript,
    error: sttError,
    isSupported: sttSupported,
    startListening: startSTT,
    stopListening: stopSTT,
    resetTranscript,
  } = useSpeechToText();

  const {
    isSpeaking,
    isPaused,
    isSupported: ttsSupported,
    cancel: cancelTTS,
    pause: pauseTTS,
    resume: resumeTTS,
  } = useTextToSpeech();

  const {
    isRecording,
    audioBlob,
    duration,
    error: recordingError,
    isSupported: recordingSupported,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecording();

  React.useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript);
      setTranscriptConsumed(true);
    }
  }, [transcript, onTranscriptChange]);

  React.useEffect(() => {
    if (transcriptConsumed) {
      resetTranscript();
      setTranscriptConsumed(false);
    }
  }, [transcriptConsumed, resetTranscript]);

  React.useEffect(() => {
    if (audioBlob && onAudioMessage) {
      onAudioMessage(audioBlob);
      clearRecording();
    }
  }, [audioBlob, onAudioMessage, clearRecording]);

  const handleMicClick = () => {
    if (mode === 'stt') {
      if (isListeningSTT) {
        stopSTT();
      } else {
        startSTT();
      }
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  const handleTTSControl = () => {
    if (isSpeaking) {
      if (isPaused) {
        resumeTTS();
      } else {
        pauseTTS();
      }
    } else {
      cancelTTS();
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const isAnySupported = sttSupported || ttsSupported || recordingSupported;
  const hasError = sttError || recordingError;

  if (!isAnySupported) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Voice features not supported in this browser
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Microphone button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMicClick}
          disabled={!sttSupported && !recordingSupported}
          className={`p-2 ${
            isListeningSTT || isRecording
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'hover:bg-gray-100'
          }`}
          title={mode === 'stt' ? 'Speech to text' : 'Record audio message'}
        >
          {isListeningSTT || isRecording ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {/* TTS control */}
        {ttsSupported && isSpeaking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTTSControl}
            className="p-2"
            title={isPaused ? 'Resume speech' : 'Pause speech'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        )}

        {/* Recording duration */}
        {isRecording && (
          <span className="text-xs text-red-600 font-mono">{formatDuration(duration)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode selector */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'stt' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('stt')}
          disabled={!sttSupported}
        >
          Speech to Text
        </Button>
        <Button
          variant={mode === 'recording' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('recording')}
          disabled={!recordingSupported}
        >
          Voice Message
        </Button>
      </div>

      {/* Main controls */}
      <div className="flex items-center gap-3">
        {/* Microphone button */}
        <Button
          variant={isListeningSTT || isRecording ? 'destructive' : 'outline'}
          onClick={handleMicClick}
          disabled={mode === 'stt' ? !sttSupported : !recordingSupported}
          className="flex items-center gap-2"
        >
          {isListeningSTT || isRecording ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              {mode === 'stt' ? 'Listen' : 'Record'}
            </>
          )}
        </Button>

        {/* TTS controls */}
        {ttsSupported && isSpeaking && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTTSControl}
              className="flex items-center gap-2"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelTTS}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="space-y-2">
        {/* Live transcript */}
        {isListeningSTT && (transcript || interimTranscript) && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm font-medium text-blue-800">
              {transcript && <span className="text-blue-900">{transcript}</span>}
              {interimTranscript && (
                <span className="text-blue-600 italic">{interimTranscript}</span>
              )}
            </div>
          </div>
        )}

        {/* Recording status */}
        {isRecording && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-800">Recording audio message...</span>
              <span className="text-sm text-red-600 font-mono">{formatDuration(duration)}</span>
            </div>
          </div>
        )}

        {/* TTS status */}
        {isSpeaking && (
          <div className="p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {isPaused ? 'Speech paused' : 'Speaking...'}
              </span>
            </div>
          </div>
        )}

        {/* Errors */}
        {hasError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{sttError || recordingError}</p>
          </div>
        )}

        {/* Listening indicator */}
        {isListeningSTT && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">Listening for speech...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
