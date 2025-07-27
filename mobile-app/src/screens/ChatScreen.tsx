import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Vibration,
} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {ChatMessage, Conversation} from '../types';
import {DinoAirAPIService} from '../services/DinoAirAPIService';
import {OfflineService} from '../services/OfflineService';
import {v4 as uuidv4} from 'uuid';

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Create or load current conversation
      const conversation = await DinoAirAPIService.createConversation('New Chat');
      setCurrentConversation(conversation);
      
      // Load messages
      const conversationMessages = await OfflineService.getMessagesByConversationId(conversation.id);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !currentConversation) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      content: inputText.trim(),
      role: 'user',
      timestamp: new Date(),
      conversationId: currentConversation.id,
      synced: false,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Save user message
      await OfflineService.saveMessage(userMessage);

      // Send to API and get response
      const assistantMessage = await DinoAirAPIService.sendMessage(userMessage);
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message is already saved offline, will sync later
      Alert.alert('Offline Mode', 'Message saved offline and will sync when connection is available.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            Vibration.vibrate(100);
          },
        },
      ]
    );
  };

  // Shake gesture to clear
  const shakeGesture = Gesture.Pan()
    .onEnd((event) => {
      const {velocityX, velocityY} = event;
      const shakeThreshold = 1000;
      
      if (Math.abs(velocityX) > shakeThreshold || Math.abs(velocityY) > shakeThreshold) {
        clearChat();
      }
    });

  const renderMessage = (message: ChatMessage, index: number) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.role === 'user' ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      <Text style={styles.messageText}>{message.content}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
        {!message.synced && (
          <Icon name="sync-disabled" size={16} color="#ff9500" />
        )}
      </View>
    </View>
  );

  return (
    <GestureDetector gesture={shakeGesture}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {currentConversation?.title || 'Chat'}
          </Text>
          <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
            <Icon name="clear" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>
                Start a conversation with DinoAir
              </Text>
              <Text style={styles.emptySubtext}>
                Your messages work offline and sync automatically
              </Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>DinoAir is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#666"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Icon name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
  messageContainer: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen;