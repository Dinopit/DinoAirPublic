# Code Signing Documentation for DinoAir Installer

This document provides instructions for code signing the DinoAir installer on different platforms.

## Windows Code Signing

### Requirements
- Windows code signing certificate (EV certificate recommended for SmartScreen reputation)
- Certificate must be in PFX/P12 format

### Setup
1. Obtain a code signing certificate from a trusted Certificate Authority (CA) such as:
   - DigiCert
   - Sectigo (formerly Comodo)
   - GlobalSign

2. Set environment variables before building:
   ```cmd
   set WINDOWS_CERTIFICATE_FILE=path\to\your\certificate.pfx
   set WINDOWS_CERTIFICATE_PASSWORD=your_certificate_password
   ```

3. Build the installer:
   ```cmd
   npm run build:win
   ```

### Verification
After building, verify the signature:
```cmd
signtool verify /pa /v dist\DinoAir-Installer-*.exe
```

## macOS Code Signing and Notarization

### Requirements
- Apple Developer account ($99/year)
- Developer ID Application certificate
- Developer ID Installer certificate (optional)

### Setup
1. Install certificates in Keychain Access

2. Set environment variables:
   ```bash
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   export APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
   ```

3. For notarization, you'll also need:
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_ID_PASSWORD="app-specific-password"
   ```

4. Build the installer:
   ```bash
   npm run build:mac
   ```

### Verification
After building, verify the signature:
```bash
codesign --verify --deep --strict --verbose=2 "dist/DinoAir Installer.app"
spctl -a -t exec -vvv "dist/DinoAir Installer.app"
```

## Linux Code Signing

Linux doesn't require code signing, but you can sign packages with GPG for authenticity.

### Setup (Optional)
1. Generate a GPG key:
   ```bash
   gpg --gen-key
   ```

2. Sign the AppImage:
   ```bash
   gpg --armor --detach-sign dist/DinoAir-Installer-*.AppImage
   ```

## Environment Variables Summary

### Windows
- `WINDOWS_CERTIFICATE_FILE`: Path to PFX certificate file
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

### macOS
- `APPLE_TEAM_ID`: Your Apple Developer Team ID
- `APPLE_IDENTITY`: Full identity string for code signing
- `APPLE_ID`: Apple ID for notarization (optional)
- `APPLE_ID_PASSWORD`: App-specific password for notarization (optional)

## Testing Without Certificates

During development, you can build unsigned installers by not setting the environment variables. The build process will skip code signing steps.

## Important Notes

1. **Keep certificates secure**: Never commit certificates or passwords to version control
2. **Use CI/CD secrets**: Store certificate passwords as encrypted secrets in your CI/CD system
3. **Certificate expiration**: Monitor certificate expiration dates and renew before they expire
4. **Test on clean systems**: Always test signed installers on clean systems to ensure they work correctly

## Troubleshooting

### Windows
- If SmartScreen blocks the installer, it may need reputation building over time
- Ensure timestamp server is accessible during signing

### macOS
- If notarization fails, check the logs with: `xcrun altool --notarization-info <RequestUUID> -u <Apple ID>`
- Ensure all bundled binaries are also signed

### General
- Verify system time is correct (required for timestamping)
- Check certificate validity and trust chain
- Ensure no antivirus software is interfering with the signing process