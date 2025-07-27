export interface User {
  id: string;
  email: string;
  username: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  voiceEnabled: boolean;
  pushNotifications: boolean;
  offlineMode: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  conversationId: string;
  synced: boolean;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  synced: boolean;
  personality?: string;
}

export interface Artifact {
  id: string;
  type: 'image' | 'document' | 'code' | 'text';
  title: string;
  content: string;
  metadata: any;
  createdAt: Date;
  synced: boolean;
}

export interface SyncStatus {
  lastSync: Date | null;
  pendingMessages: number;
  pendingArtifacts: number;
  isOnline: boolean;
  isSyncing: boolean;
}

export interface VoiceRecording {
  id: string;
  filePath: string;
  duration: number;
  transcription?: string;
  timestamp: Date;
}

export interface CameraCapture {
  id: string;
  uri: string;
  type: 'photo' | 'document';
  ocrText?: string;
  timestamp: Date;
}

export interface NotificationPayload {
  type: 'message' | 'sync' | 'system';
  title: string;
  body: string;
  data?: any;
}