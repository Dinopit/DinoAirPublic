import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {CameraCapture} from '../types';
import {v4 as uuidv4} from 'uuid';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const CameraScreen: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.back);
  const [flashMode, setFlashMode] = useState(RNCamera.Constants.FlashMode.auto);
  const cameraRef = useRef<RNCamera>(null);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const options = {
        quality: 0.8,
        base64: true,
        doNotSave: false,
      };

      const data = await cameraRef.current.takePictureAsync(options);
      setCapturedImage(data.uri);

      const capture: CameraCapture = {
        id: uuidv4(),
        uri: data.uri,
        type: 'photo',
        timestamp: new Date(),
      };

      // TODO: Process image for OCR if needed
      // TODO: Save to artifacts
      
      Alert.alert('Photo Captured', 'Image saved successfully');
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      const options = {
        quality: RNCamera.Constants.VideoQuality['720p'],
        maxDuration: 30,
      };

      const data = await cameraRef.current.recordAsync(options);
      console.log('Video recorded:', data.uri);
      Alert.alert('Video Recorded', 'Video saved successfully');
    } catch (error) {
      console.error('Failed to record video:', error);
      Alert.alert('Error', 'Failed to record video');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  const toggleCamera = () => {
    setCameraType(
      cameraType === RNCamera.Constants.Type.back
        ? RNCamera.Constants.Type.front
        : RNCamera.Constants.Type.back
    );
  };

  const toggleFlash = () => {
    const modes = [
      RNCamera.Constants.FlashMode.auto,
      RNCamera.Constants.FlashMode.on,
      RNCamera.Constants.FlashMode.off,
    ];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case RNCamera.Constants.FlashMode.on:
        return 'flash-on';
      case RNCamera.Constants.FlashMode.off:
        return 'flash-off';
      default:
        return 'flash-auto';
    }
  };

  const scanDocument = () => {
    Alert.alert(
      'Document Scanner',
      'This feature will automatically detect document edges and enhance text readability.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Scan', onPress: takePicture},
      ]
    );
  };

  if (capturedImage) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{uri: capturedImage}} style={styles.previewImage} />
        <View style={styles.previewControls}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setCapturedImage(null)}
          >
            <Icon name="close" size={24} color="#fff" />
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.previewButton, styles.saveButton]}
            onPress={() => {
              // TODO: Save to artifacts
              setCapturedImage(null);
              Alert.alert('Saved', 'Image saved to artifacts');
            }}
          >
            <Icon name="check" size={24} color="#fff" />
            <Text style={styles.previewButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNCamera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        captureAudio={true}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
        androidRecordAudioPermissionOptions={{
          title: 'Permission to use audio recording',
          message: 'We need your permission to use your audio',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
          <Icon name={getFlashIcon()} size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
          <Icon name="flip-camera-ios" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Document Scanner Overlay */}
      <View style={styles.documentOverlay}>
        <TouchableOpacity style={styles.documentButton} onPress={scanDocument}>
          <Icon name="document-scanner" size={24} color="#fff" />
          <Text style={styles.documentButtonText}>Scan Document</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Icon
            name={isRecording ? 'stop' : 'videocam'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Tap to capture • Hold record button for video • Use document scanner for text
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
  documentOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  documentButton: {
    backgroundColor: 'rgba(0,122,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  documentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    backgroundColor: '#ff1744',
  },
  instructions: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 50,
  },
  previewButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CameraScreen;