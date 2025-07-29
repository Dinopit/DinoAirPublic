import {OfflineService} from '../../src/services/OfflineService';
import {ChatMessage, Conversation} from '../../src/types';

// Mock SQLite
jest.mock('react-native-sqlite-storage');

describe('OfflineService', () => {
  const mockMessage: ChatMessage = {
    id: 'test-message-1',
    content: 'Hello, DinoAir!',
    role: 'user',
    timestamp: new Date(),
    conversationId: 'test-conversation-1',
    synced: false,
  };

  const mockConversation: Conversation = {
    id: 'test-conversation-1',
    title: 'Test Conversation',
    messages: [mockMessage],
    createdAt: new Date(),
    updatedAt: new Date(),
    synced: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(OfflineService.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await OfflineService.initialize();
      await expect(OfflineService.initialize()).resolves.not.toThrow();
    });
  });

  describe('message operations', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
    });

    it('should save a message', async () => {
      await expect(OfflineService.saveMessage(mockMessage)).resolves.not.toThrow();
    });

    it('should get messages by conversation id', async () => {
      const messages = await OfflineService.getMessagesByConversationId('test-conversation-1');
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('conversation operations', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
    });

    it('should save a conversation', async () => {
      await expect(OfflineService.saveConversation(mockConversation)).resolves.not.toThrow();
    });

    it('should get all conversations', async () => {
      const conversations = await OfflineService.getConversations();
      expect(Array.isArray(conversations)).toBe(true);
    });
  });

  describe('sync operations', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
    });

    it('should get sync status', async () => {
      const status = await OfflineService.getSyncStatus();
      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('pendingMessages');
      expect(status).toHaveProperty('pendingArtifacts');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('isSyncing');
    });

    it('should mark items as synced', async () => {
      await expect(OfflineService.markAsSynced('message', 'test-message-1')).resolves.not.toThrow();
    });
  });
});