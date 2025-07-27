/**
 * Simple test to verify voice integration functionality
 */

// Mock browser APIs for testing environment
const mockSpeechRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1,
  start: jest.fn(),
  stop: jest.fn(),
  onstart: null,
  onresult: null,
  onerror: null,
  onend: null,
};

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  speaking: false,
  paused: false,
  onvoiceschanged: null,
};

const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
};

// Setup global mocks
Object.defineProperty(window, 'SpeechRecognition', {
  value: jest.fn(() => mockSpeechRecognition),
  writable: true,
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: jest.fn(() => mockSpeechRecognition),
  writable: true,
});

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(window, 'MediaRecorder', {
  value: jest.fn(() => mockMediaRecorder),
  writable: true,
});

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() =>
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }],
      })
    ),
  },
  writable: true,
});

export {};
