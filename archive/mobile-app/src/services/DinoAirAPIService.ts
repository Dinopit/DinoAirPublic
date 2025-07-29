import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {io, Socket} from 'socket.io-client';
import {ChatMessage, Conversation, Artifact} from '../types';
import {OfflineService} from './OfflineService';

export class DinoAirAPIService {
  private static baseURL = 'http://localhost:3000'; // Default, can be configured
  private static socket: Socket | null = null;
  private static isInitialized = false;
  private static apiKey: string | null = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load configuration
      const storedBaseURL = await AsyncStorage.getItem('dinoair_base_url');
      if (storedBaseURL) {
        this.baseURL = storedBaseURL;
      }

      this.apiKey = await AsyncStorage.getItem('dinoair_api_key');
      
      // Initialize socket connection
      await this.initializeSocket();
      
      this.isInitialized = true;
      console.log('DinoAirAPIService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DinoAirAPIService:', error);
      // Don't throw - allow offline operation
    }
  }

  static async setConfiguration(baseURL: string, apiKey?: string): Promise<void> {
    this.baseURL = baseURL;
    await AsyncStorage.setItem('dinoair_base_url', baseURL);
    
    if (apiKey) {
      this.apiKey = apiKey;
      await AsyncStorage.setItem('dinoair_api_key', apiKey);
    }

    // Reconnect socket with new configuration
    if (this.socket) {
      this.socket.disconnect();
    }
    await this.initializeSocket();
  }

  private static async initializeSocket(): Promise<void> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
      this.socket = io(this.baseURL, {
        transports: ['websocket'],
        timeout: 5000,
        auth: this.apiKey ? {token: this.apiKey} : undefined,
      });

      this.socket.on('connect', () => {
        console.log('Connected to DinoAir server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from DinoAir server');
      });

      this.socket.on('message', (data: ChatMessage) => {
        // Handle incoming messages
        this.handleIncomingMessage(data);
      });

    } catch (error) {
      console.error('Socket connection failed:', error);
    }
  }

  private static async handleIncomingMessage(message: ChatMessage): Promise<void> {
    // Save to offline storage
    await OfflineService.saveMessage({...message, synced: true});
  }

  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  // Chat API methods
  static async sendMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      const response = await this.makeRequest('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          content: message.content,
          conversationId: message.conversationId,
          role: message.role,
        }),
      });

      const responseData = await response.json();
      const assistantMessage: ChatMessage = {
        ...responseData,
        timestamp: new Date(responseData.timestamp),
        synced: true,
      };

      // Save to offline storage
      await OfflineService.saveMessage(assistantMessage);
      await OfflineService.markAsSynced('message', message.id);

      return assistantMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      // Save to offline queue for later sync
      await OfflineService.saveMessage({...message, synced: false});
      throw error;
    }
  }

  static async getConversations(): Promise<Conversation[]> {
    try {
      const response = await this.makeRequest('/api/conversations');
      const conversations = await response.json();
      
      // Update local storage with synced conversations
      for (const conv of conversations) {
        await OfflineService.saveConversation({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          synced: true,
        });
      }

      return conversations;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      // Return offline conversations
      return await OfflineService.getConversations();
    }
  }

  static async createConversation(title: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.generateId(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false,
    };

    try {
      const response = await this.makeRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({title}),
      });

      const serverConversation = await response.json();
      const syncedConversation = {
        ...serverConversation,
        createdAt: new Date(serverConversation.createdAt),
        updatedAt: new Date(serverConversation.updatedAt),
        synced: true,
      };

      await OfflineService.saveConversation(syncedConversation);
      return syncedConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      // Save offline
      await OfflineService.saveConversation(conversation);
      return conversation;
    }
  }

  // Artifacts API methods
  static async getArtifacts(): Promise<Artifact[]> {
    try {
      const response = await this.makeRequest('/api/artifacts');
      const artifacts = await response.json();
      
      // Update local storage
      for (const artifact of artifacts) {
        await OfflineService.saveArtifact({
          ...artifact,
          createdAt: new Date(artifact.createdAt),
          synced: true,
        });
      }

      return artifacts;
    } catch (error) {
      console.error('Failed to get artifacts:', error);
      // Return empty array - artifacts will be loaded from offline storage by UI
      return [];
    }
  }

  static async saveArtifact(artifact: Artifact): Promise<Artifact> {
    try {
      const response = await this.makeRequest('/api/artifacts', {
        method: 'POST',
        body: JSON.stringify(artifact),
      });

      const serverArtifact = await response.json();
      const syncedArtifact = {
        ...serverArtifact,
        createdAt: new Date(serverArtifact.createdAt),
        synced: true,
      };

      await OfflineService.saveArtifact(syncedArtifact);
      return syncedArtifact;
    } catch (error) {
      console.error('Failed to save artifact:', error);
      // Save offline
      await OfflineService.saveArtifact({...artifact, synced: false});
      return artifact;
    }
  }

  // Sync methods
  static async syncPendingData(): Promise<void> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('No internet connection');
    }

    try {
      const syncQueue = await OfflineService.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          switch (item.type) {
            case 'message':
              await this.syncMessage(item.data);
              break;
            case 'conversation':
              await this.syncConversation(item.data);
              break;
            case 'artifact':
              await this.syncArtifact(item.data);
              break;
          }
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
          // Continue with next item
        }
      }

      // Clear sync queue after successful sync
      await OfflineService.clearSyncQueue();
      
      // Update last sync time
      await AsyncStorage.setItem('lastSync', new Date().toISOString());
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  private static async syncMessage(message: ChatMessage): Promise<void> {
    await this.sendMessage(message);
  }

  private static async syncConversation(conversation: Conversation): Promise<void> {
    const response = await this.makeRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(conversation),
    });

    const serverConversation = await response.json();
    await OfflineService.markAsSynced('conversation', conversation.id);
  }

  private static async syncArtifact(artifact: Artifact): Promise<void> {
    await this.saveArtifact(artifact);
  }

  // Health check
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Utility methods
  private static generateId(): string {
    return `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}