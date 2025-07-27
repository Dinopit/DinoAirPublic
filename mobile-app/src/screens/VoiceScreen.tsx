import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-community/voice';
import Tts from 'react-native-tts';
import {VoiceRecording} from '../types';
import {v4 as uuidv4} from 'uuid';

const VoiceScreen: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);

  useEffect(() => {
    // Initialize Voice
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    // Initialize TTS
    Tts.addEventListener('tts-start', onTtsStart);
    Tts.addEventListener('tts-finish', onTtsFinish);
    Tts.addEventListener('tts-cancel', onTtsCancel);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Tts.removeAllListeners();
    };
  }, []);

  const onSpeechStart = () => {
    console.log('Speech recognition started');
  };

  const onSpeechEnd = () => {
    console.log('Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechResults = (event: any) => {
    const results = event.value;
    if (results && results.length > 0) {
      setTranscription(results[0]);
    }
  };

  const onSpeechError = (event: any) => {
    console.error('Speech recognition error:', event.error);
    Alert.alert('Speech Recognition Error', event.error?.message || 'Unknown error');
    setIsListening(false);
  };

  const onTtsStart = () => {
    setIsPlaying(true);
  };

  const onTtsFinish = () => {
    setIsPlaying(false);
  };

  const onTtsCancel = () => {
    setIsPlaying(false);
  };

  const startListening = async () => {
    try {
      setTranscription('');
      setIsListening(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      Alert.alert('Error', 'Failed to start voice recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  };

  const saveRecording = () => {
    if (!transcription.trim()) {
      Alert.alert('Error', 'No transcription to save');
      return;
    }

    const recording: VoiceRecording = {
      id: uuidv4(),
      filePath: '', // Would be actual audio file path in real implementation
      duration: 0, // Would be actual duration
      transcription,
      timestamp: new Date(),
    };

    setRecordings(prev => [recording, ...prev]);
    setTranscription('');
    Alert.alert('Saved', 'Voice recording saved successfully');
  };

  const playText = async (text: string) => {
    try {
      if (isPlaying) {
        await Tts.stop();
        return;
      }
      await Tts.speak(text);
    } catch (error) {
      console.error('Failed to play text:', error);
      Alert.alert('Error', 'Failed to play text');
    }
  };

  const sendToChat = () => {
    if (!transcription.trim()) {
      Alert.alert('Error', 'No text to send');
      return;
    }

    // TODO: Integrate with chat functionality
    Alert.alert('Send to Chat', `Would send: "${transcription}"`);
  };

  const clearTranscription = () => {
    setTranscription('');
  };

  const renderRecording = (recording: VoiceRecording, index: number) => (
    <View key={recording.id} style={styles.recordingItem}>
      <View style={styles.recordingHeader}>
        <Text style={styles.recordingTime}>
          {recording.timestamp.toLocaleTimeString()}
        </Text>
        <TouchableOpacity
          onPress={() => playText(recording.transcription || '')}
          style={styles.playButton}
        >
          <Icon name={isPlaying ? 'stop' : 'play-arrow'} size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.recordingText} numberOfLines={3}>
        {recording.transcription}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Voice Assistant</Text>
        <Text style={styles.headerSubtitle}>
          Speak naturally or tap to start recording
        </Text>
      </View>

      {/* Main Voice Control */}
      <View style={styles.voiceContainer}>
        <TouchableOpacity
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
          onPress={isListening ? stopListening : startListening}
          onLongPress={startListening}
        >
          <Icon
            name={isListening ? 'mic-off' : 'mic'}
            size={48}
            color={isListening ? '#ff3b30' : '#007AFF'}
          />
        </TouchableOpacity>
        
        <Text style={styles.voiceStatus}>
          {isListening ? 'Listening...' : 'Tap to speak'}
        </Text>
      </View>

      {/* Transcription Display */}
      {transcription ? (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
          
          <View style={styles.transcriptionActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => playText(transcription)}
            >
              <Icon name={isPlaying ? 'stop' : 'volume-up'} size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isPlaying ? 'Stop' : 'Play'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={sendToChat}>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={saveRecording}>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={clearTranscription}
            >
              <Icon name="clear" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Voice Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Voice Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="language" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Language: English (US)</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="record-voice-over" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Voice Speed: Normal</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Icon name="assistant" size={24} color="#007AFF" />
          <Text style={styles.settingText}>Assistant Integration</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Recent Recordings */}
      {recordings.length > 0 && (
        <View style={styles.recordingsContainer}>
          <Text style={styles.recordingsTitle}>Recent Recordings</Text>
          {recordings.slice(0, 5).map(renderRecording)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  voiceButtonActive: {
    borderColor: '#ff3b30',
    backgroundColor: '#330000',
  },
  voiceStatus: {
    fontSize: 16,
    color: '#666',
  },
  transcriptionContainer: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  transcriptionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 16,
  },
  transcriptionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#ff3b30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  settingsContainer: {
    margin: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  recordingsContainer: {
    margin: 20,
  },
  recordingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  recordingItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingTime: {
    fontSize: 12,
    color: '#666',
  },
  playButton: {
    padding: 4,
  },
  recordingText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
});

export default VoiceScreen;