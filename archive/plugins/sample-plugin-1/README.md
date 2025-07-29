# Image Enhancer Pro

Advanced AI-powered image enhancement plugin for DinoAir that provides professional-grade image processing capabilities.

## Features

### AI-Powered Noise Reduction
- Intelligent noise detection and removal
- Preserves image details while reducing artifacts
- Works with both digital and scanned images

### 4x Image Upscaling
- Deep learning-based super-resolution
- Maintains sharp edges and fine details
- Supports various image formats (JPEG, PNG, TIFF, WebP)

### Automatic Color Correction
- Histogram equalization
- White balance adjustment
- Saturation and contrast optimization

### Batch Processing
- Process multiple images simultaneously
- Queue management system
- Progress tracking and notifications

### Real-time Preview
- Live preview of enhancements
- Before/after comparison view
- Adjustable enhancement parameters

## Installation

1. Click the "Install Plugin" button to download the plugin package
2. Extract the downloaded ZIP file to your DinoAir plugins directory
3. Restart DinoAir to load the plugin
4. The plugin will appear in the Image Processing menu

## Usage

1. Open an image in DinoAir
2. Navigate to **Plugins > Image Processing > Image Enhancer Pro**
3. Select your desired enhancement options:
   - **Noise Reduction**: Adjust the strength slider (0-100)
   - **Upscaling**: Choose scale factor (2x, 3x, or 4x)
   - **Color Correction**: Enable automatic or manual adjustment
4. Click "Preview" to see the results
5. Click "Apply" to process the image

## System Requirements

- **RAM**: Minimum 8GB, recommended 16GB
- **GPU**: CUDA-compatible GPU recommended for faster processing
- **Storage**: 50MB free space for plugin files
- **OS**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18.04+

## Configuration

The plugin can be configured through the settings panel:

```json
{
  "noiseReduction": {
    "defaultStrength": 50,
    "algorithm": "deep-learning"
  },
  "upscaling": {
    "defaultScale": 2,
    "preserveAspectRatio": true
  },
  "colorCorrection": {
    "autoMode": true,
    "preserveSkinTones": true
  }
}
```

## Troubleshooting

### Common Issues

**Plugin not loading**
- Ensure DinoAir is restarted after installation
- Check that the plugin files are in the correct directory
- Verify system requirements are met

**Slow processing**
- Enable GPU acceleration in settings
- Reduce batch size for large images
- Close other resource-intensive applications

**Poor enhancement results**
- Adjust noise reduction strength
- Try different upscaling algorithms
- Check input image quality and format

## Support

For technical support and feature requests:
- GitHub Issues: https://github.com/dinopit/image-enhancer-pro/issues
- Documentation: https://docs.dinoair.com/plugins/image-enhancer-pro
- Community Forum: https://community.dinoair.com

## License

This plugin is licensed under the MIT License. See LICENSE file for details.

## Changelog

### v1.2.0 (2024-12-15)
- Added real-time preview functionality
- Improved GPU acceleration performance
- Fixed memory leak in batch processing
- Added support for WebP format

### v1.1.0 (2024-11-20)
- Introduced automatic color correction
- Enhanced noise reduction algorithm
- Added progress tracking for batch operations

### v1.0.0 (2024-10-01)
- Initial release
- Basic image enhancement features
- 2x and 4x upscaling support
