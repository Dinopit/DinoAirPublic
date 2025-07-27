import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ChatMessage, Conversation, Artifact, SyncStatus} from '../types';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

export class OfflineService {
  private static db: SQLite.SQLiteDatabase | null = null;
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabase({
        name: 'DinoAir.db',
        location: 'default',
      });

      await this.createTables();
      this.isInitialized = true;
      console.log('OfflineService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineService:', error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createConversationsTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        personality TEXT
      );
    `;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        synced INTEGER DEFAULT 0,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
      );
    `;

    const createArtifactsTable = `
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        priority INTEGER DEFAULT 1
      );
    `;

    await this.db.executeSql(createConversationsTable);
    await this.db.executeSql(createMessagesTable);
    await this.db.executeSql(createArtifactsTable);
    await this.db.executeSql(createSyncQueueTable);
  }

  // Conversation methods
  static async saveConversation(conversation: Conversation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO conversations 
      (id, title, created_at, updated_at, synced, personality)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      conversation.id,
      conversation.title,
      conversation.createdAt.getTime(),
      conversation.updatedAt.getTime(),
      conversation.synced ? 1 : 0,
      conversation.personality || null,
    ]);
  }

  static async getConversations(): Promise<Conversation[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = 'SELECT * FROM conversations ORDER BY updated_at DESC';
    const [results] = await this.db.executeSql(sql);

    const conversations: Conversation[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      const messages = await this.getMessagesByConversationId(row.id);
      
      conversations.push({
        id: row.id,
        title: row.title,
        messages,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        synced: row.synced === 1,
        personality: row.personality,
      });
    }

    return conversations;
  }

  // Message methods
  static async saveMessage(message: ChatMessage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO messages 
      (id, conversation_id, content, role, timestamp, synced, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      message.id,
      message.conversationId,
      message.content,
      message.role,
      message.timestamp.getTime(),
      message.synced ? 1 : 0,
      JSON.stringify(message.metadata || {}),
    ]);

    // Add to sync queue if not synced
    if (!message.synced) {
      await this.addToSyncQueue('message', 'create', message);
    }
  }

  static async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC';
    const [results] = await this.db.executeSql(sql, [conversationId]);

    const messages: ChatMessage[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      messages.push({
        id: row.id,
        conversationId: row.conversation_id,
        content: row.content,
        role: row.role,
        timestamp: new Date(row.timestamp),
        synced: row.synced === 1,
        metadata: JSON.parse(row.metadata || '{}'),
      });
    }

    return messages;
  }

  // Artifact methods
  static async saveArtifact(artifact: Artifact): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO artifacts 
      (id, type, title, content, metadata, created_at, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      artifact.id,
      artifact.type,
      artifact.title,
      artifact.content,
      JSON.stringify(artifact.metadata),
      artifact.createdAt.getTime(),
      artifact.synced ? 1 : 0,
    ]);

    if (!artifact.synced) {
      await this.addToSyncQueue('artifact', 'create', artifact);
    }
  }

  // Sync queue methods
  private static async addToSyncQueue(type: string, action: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT INTO sync_queue (type, action, data, created_at, priority)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(sql, [
      type,
      action,
      JSON.stringify(data),
      Date.now(),
      1,
    ]);
  }

  static async getSyncQueue(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = 'SELECT * FROM sync_queue ORDER BY priority DESC, created_at ASC';
    const [results] = await this.db.executeSql(sql);

    const queue: any[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      queue.push({
        id: row.id,
        type: row.type,
        action: row.action,
        data: JSON.parse(row.data),
        createdAt: new Date(row.created_at),
        priority: row.priority,
      });
    }

    return queue;
  }

  static async clearSyncQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.executeSql('DELETE FROM sync_queue');
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    const lastSyncStr = await AsyncStorage.getItem('lastSync');
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
    
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected || false;

    const queue = await this.getSyncQueue();
    const pendingMessages = queue.filter(item => item.type === 'message').length;
    const pendingArtifacts = queue.filter(item => item.type === 'artifact').length;

    return {
      lastSync,
      pendingMessages,
      pendingArtifacts,
      isOnline,
      isSyncing: false,
    };
  }

  static async markAsSynced(type: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    let table: string;
    switch (type) {
      case 'conversation':
        table = 'conversations';
        break;
      case 'message':
        table = 'messages';
        break;
      case 'artifact':
        table = 'artifacts';
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    await this.db.executeSql(`UPDATE ${table} SET synced = 1 WHERE id = ?`, [id]);
  }
}