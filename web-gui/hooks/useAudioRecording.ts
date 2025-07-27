'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AudioRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  maxDuration?: number; // in milliseconds
}

interface UseAudioRecordingReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  downloadRecording: (filename?: string) => void;
}

export const useAudioRecording = (options: AudioRecorderOptions = {}): UseAudioRecordingReturn => {
  const {
    mimeType = 'audio/webm',
    audioBitsPerSecond = 128000,
    maxDuration = 300000, // 5 minutes default
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'navigator' in window &&
    'mediaDevices' in navigator;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording not supported in this browser');
      return;
    }

    if (isRecording) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'audio/webm',
        audioBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        setError(`Recording error: ${event.error}`);
        setIsRecording(false);
      };

      startTimeRef.current = Date.now();
      setDuration(0);
      setError(null);

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);

        // Auto-stop if max duration reached
        if (elapsed >= maxDuration) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 100);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to start recording: ${err.message}`);
      } else {
        setError('Failed to start recording: Unknown error');
      }
    }
  }, [isSupported, isRecording, mimeType, audioBitsPerSecond, maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
  }, [audioUrl]);

  const downloadRecording = useCallback(
    (filename = 'recording.webm') => {
      if (audioBlob && audioUrl) {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [audioBlob, audioUrl]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    isSupported,
    audioBlob,
    audioUrl,
    duration,
    error,
    startRecording,
    stopRecording,
    clearRecording,
    downloadRecording,
  };
};
