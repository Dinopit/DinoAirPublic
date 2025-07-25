# SD 1.5 Model Fix Documentation

**Date**: July 22, 2025  
**Issue**: BUG-005 (MEDIUM) - Missing SD 1.5 Model Required by Default Workflow  
**Status**: RESOLVED

## Summary

Fixed the missing SD 1.5 model issue that prevented the default SD 1.5 workflow from functioning in the free tier. The solution includes:

1. Added SD 1.5 model download capability to `download_models.py`
2. Updated the workflow to use the freely available model
3. Provided clear download options for users

## Changes Made

### 1. Updated download_models.py

Added support for downloading the official Stable Diffusion 1.5 model from RunwayML on HuggingFace:

```python
"v1-5-pruned-emaonly.safetensors": {
    "size": 4265380512,  # ~4.27GB
    "sha256": "6ce0161689b3853acaa03779ec93eafe75a02f4ced659bee03f50797806fa2fa",
    "mirrors": [
        {
            "name": "HuggingFace",
            "url": "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors",
            "headers": {}
        }
    ]
}
```

### 2. Updated FreeTierPacked/sd15-workflow.json

Changed the workflow to use the freely available SD 1.5 model instead of "dreamshaper_8.safetensors":
- **Before**: `"dreamshaper_8.safetensors"`
- **After**: `"v1-5-pruned-emaonly.safetensors"`

### 3. Enhanced Download Options

The download script now offers these options:
1. All models (SD 1.5 + SDXL)
2. SDXL models only (base + VAE)
3. SD 1.5 models only
4. Essential free tier models (SD 1.5 + SDXL VAE) - **Default**
5. Skip model download

## User Instructions

### For New Installations

1. Run `python download_models.py`
2. Select option 4 (default) for essential free tier models
3. The script will download:
   - SD 1.5 model (~3.97 GB)
   - SDXL VAE (~319 MB)

### For Existing Installations

Users who already have DinoAir installed can:

1. Update their `download_models.py` script with the latest version
2. Run `python download_models.py` and select option 3 to download only the SD 1.5 model
3. The SD 1.5 workflow will now work correctly

### Manual Download Option

If users prefer to download manually:
- **Model**: v1-5-pruned-emaonly.safetensors
- **Source**: https://huggingface.co/runwayml/stable-diffusion-v1-5/tree/main
- **Location**: Place in `ComfyUI/models/checkpoints/`

## Benefits

1. **Free Tier Compatibility**: Uses the official open-source SD 1.5 model
2. **Automated Download**: No manual steps required
3. **Workflow Ready**: SD 1.5 workflow works out-of-the-box after download
4. **User Choice**: Flexible download options based on user needs

## Notes

- The original bug report mentioned "v1-5-pruned-emaonly-fp16.safetensors" but the workflow actually expected "dreamshaper_8.safetensors"
- We chose to use the standard v1-5-pruned-emaonly.safetensors (FP32) as it's more widely compatible
- Users can still manually add other SD 1.5 compatible models if desired