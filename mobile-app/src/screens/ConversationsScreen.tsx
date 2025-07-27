import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Conversation} from '../types';
import {OfflineService} from '../services/OfflineService';
import {DinoAirAPIService} from '../services/DinoAirAPIService';

const ConversationsScreen: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      // Try to load from server first, fallback to offline
      let convs = await DinoAirAPIService.getConversations();
      if (convs.length === 0) {
        convs = await OfflineService.getConversations();
      }
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Load from offline storage
      const offlineConvs = await OfflineService.getConversations();
      setConversations(offlineConvs);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const renderConversation = ({item}: {item: Conversation}) => (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.conversationHeader}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.conversationMeta}>
          {!item.synced && (
            <Icon name="sync-disabled" size={16} color="#ff9500" />
          )}
          <Text style={styles.conversationDate}>
            {item.updatedAt.toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      {item.messages.length > 0 && (
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.messages[item.messages.length - 1].content}
        </Text>
      )}
      
      <View style={styles.conversationFooter}>
        <Text style={styles.messageCount}>
          {item.messages.length} messages
        </Text>
        {item.personality && (
          <Text style={styles.personality}>{item.personality}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="history" size={64} color="#333" />
      <Text style={styles.emptyText}>No conversations yet</Text>
      <Text style={styles.emptySubtext}>
        Start chatting to see your conversation history
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={conversations.length === 0 ? {flex: 1} : {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  conversationItem: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCount: {
    fontSize: 12,
    color: '#666',
  },
  personality: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#003366',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ConversationsScreen;