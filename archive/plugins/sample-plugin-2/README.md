# Audio Transcriber

Professional-grade audio transcription plugin for DinoAir with real-time processing, multi-language support, and advanced speaker identification capabilities.

## Features

### Real-time Transcription
- Live audio transcription with minimal latency
- Continuous speech recognition
- Automatic punctuation and capitalization
- Confidence scoring for each transcribed segment

### Multi-language Support
- Support for 50+ languages including:
  - English (US, UK, AU)
  - Spanish (ES, MX, AR)
  - French (FR, CA)
  - German, Italian, Portuguese
  - Chinese (Mandarin, Cantonese)
  - Japanese, Korean, Arabic
  - And many more...

### Speaker Identification
- Automatic speaker diarization
- Up to 10 speakers per session
- Speaker labeling and color coding
- Voice profile learning for improved accuracy

### Timestamp Generation
- Precise word-level timestamps
- Sentence and paragraph segmentation
- Customizable timestamp formats
- Sync with video files

### Export Options
- Plain text (.txt)
- Subtitle formats (.srt, .vtt, .ass)
- JSON with metadata
- Microsoft Word (.docx)
- PDF with formatting

## Installation

1. Download the plugin by clicking "Install Plugin"
2. Extract the ZIP file to your DinoAir plugins directory
3. Restart DinoAir
4. Grant microphone permissions when prompted
5. The plugin will appear in the Audio Processing menu

## Quick Start

### Live Transcription
1. Go to **Plugins > Audio Processing > Audio Transcriber**
2. Select your microphone from the input device dropdown
3. Choose your primary language
4. Click "Start Recording" to begin live transcription
5. Speak clearly into your microphone
6. Click "Stop Recording" when finished

### File Transcription
1. Click "Load Audio File" in the plugin interface
2. Select your audio file (MP3, WAV, M4A, FLAC supported)
3. Choose the audio language
4. Click "Transcribe" to process the file
5. Review and edit the transcription
6. Export in your preferred format

## Configuration

### Language Settings
```json
{
  "primaryLanguage": "en-US",
  "secondaryLanguages": ["es-ES", "fr-FR"],
  "autoDetectLanguage": true,
  "languageSwitchSensitivity": 0.8
}
```

### Speaker Settings
```json
{
  "speakerDiarization": true,
  "maxSpeakers": 5,
  "speakerLabels": ["Speaker 1", "Speaker 2", "Interviewer", "Guest"],
  "voiceProfileLearning": true
}
```

### Export Settings
```json
{
  "defaultFormat": "srt",
  "timestampPrecision": "word",
  "includeConfidenceScores": false,
  "paragraphBreakThreshold": 3.0
}
```

## Supported Audio Formats

### Input Formats
- **WAV**: Uncompressed, high quality
- **MP3**: Compressed, widely compatible
- **M4A**: Apple's compressed format
- **FLAC**: Lossless compression
- **OGG**: Open-source compressed format

### Audio Requirements
- **Sample Rate**: 16kHz minimum, 44.1kHz recommended
- **Bit Depth**: 16-bit minimum, 24-bit recommended
- **Channels**: Mono or stereo
- **Duration**: Up to 6 hours per file

## Advanced Features

### Custom Vocabulary
Add domain-specific terms to improve accuracy:
1. Go to Settings > Custom Vocabulary
2. Add technical terms, names, or jargon
3. Specify pronunciation hints if needed
4. Save and restart transcription

### Noise Reduction
- Automatic background noise filtering
- Wind noise suppression
- Echo cancellation
- Adjustable sensitivity levels

### Batch Processing
- Process multiple audio files simultaneously
- Queue management system
- Progress tracking and notifications
- Automatic file organization

## Troubleshooting

### Common Issues

**Poor transcription accuracy**
- Ensure clear audio quality (minimal background noise)
- Speak at a moderate pace with clear pronunciation
- Check microphone positioning and levels
- Add custom vocabulary for technical terms

**Microphone not detected**
- Check system audio permissions
- Restart DinoAir after granting permissions
- Test microphone in system settings
- Try different USB ports for external microphones

**Export failures**
- Verify write permissions to output directory
- Check available disk space
- Ensure output format is supported
- Try exporting smaller segments

**Language detection issues**
- Manually select the correct language
- Disable auto-detection for mixed-language content
- Update language models in plugin settings

## Performance Optimization

### System Requirements
- **CPU**: Intel i5 or AMD Ryzen 5 (minimum)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 200MB for plugin + 1GB for language models
- **Network**: Internet connection for initial setup and updates

### Performance Tips
- Close unnecessary applications during transcription
- Use wired headphones/microphones for better audio quality
- Process shorter audio segments for faster results
- Enable hardware acceleration if available

## API Integration

The plugin provides a REST API for integration with other applications:

```javascript
// Start transcription
POST /api/transcribe/start
{
  "language": "en-US",
  "speakerDiarization": true,
  "realTime": true
}

// Get transcription results
GET /api/transcribe/results/{sessionId}

// Export transcription
POST /api/transcribe/export
{
  "sessionId": "abc123",
  "format": "srt",
  "includeTimestamps": true
}
```

## Support and Community

- **Documentation**: https://docs.dinoair.com/plugins/audio-transcriber
- **GitHub Repository**: https://github.com/dinopit/audio-transcriber
- **Issue Tracker**: https://github.com/dinopit/audio-transcriber/issues
- **Community Forum**: https://community.dinoair.com/audio-transcriber
- **Discord Channel**: #audio-transcriber

## License

Licensed under the Apache License 2.0. See LICENSE file for full terms.

## Changelog

### v2.1.3 (2024-12-10)
- Fixed speaker identification accuracy issues
- Added support for 5 new languages
- Improved real-time transcription latency
- Bug fixes for export functionality

### v2.1.0 (2024-11-15)
- Added custom vocabulary support
- Introduced batch processing
- Enhanced noise reduction algorithms
- New API endpoints for third-party integration

### v2.0.0 (2024-09-30)
- Complete rewrite with improved AI models
- Added speaker diarization
- Multi-language support expanded to 50+ languages
- New export formats and customization options
