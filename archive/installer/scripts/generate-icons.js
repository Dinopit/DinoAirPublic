/**
 * Icon Generation Script for DinoAir
 * Creates all required icon formats from a base SVG
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

// Base SVG for DinoAir dinosaur icon
const dinoAirSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Circle -->
  <circle cx="256" cy="256" r="240" fill="#1a1a2e" stroke="#16213e" stroke-width="8"/>
  
  <!-- Gradient definitions -->
  <defs>
    <linearGradient id="dinoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2E7D32;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1B5E20;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#EE5A6F;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Dinosaur Body -->
  <g transform="translate(256, 280)">
    <!-- Main body -->
    <ellipse cx="0" cy="0" rx="120" ry="100" fill="url(#dinoGradient)" />
    
    <!-- Neck -->
    <path d="M -60 -30 Q -90 -100 -80 -140 Q -70 -160 -40 -150 L -20 -80 Z" 
          fill="url(#dinoGradient)" />
    
    <!-- Head -->
    <ellipse cx="-60" cy="-150" rx="45" ry="40" fill="url(#dinoGradient)" />
    
    <!-- Snout -->
    <path d="M -100 -150 Q -120 -145 -115 -130 L -90 -140 Z" 
          fill="url(#dinoGradient)" />
    
    <!-- Eye -->
    <circle cx="-55" cy="-155" r="8" fill="#fff" />
    <circle cx="-53" cy="-153" r="5" fill="#000" />
    
    <!-- Spikes along back -->
    <path d="M -40 -100 L -30 -120 L -20 -100 M 0 -80 L 10 -100 L 20 -80 M 40 -60 L 50 -80 L 60 -60" 
          fill="none" stroke="url(#accentGradient)" stroke-width="6" stroke-linecap="round" />
    
    <!-- Tail -->
    <path d="M 100 0 Q 140 20 160 60 Q 170 80 150 85 Q 140 70 130 40 Q 120 20 100 10"
          fill="url(#dinoGradient)" />
    
    <!-- Legs -->
    <rect x="-60" y="60" width="25" height="40" rx="10" fill="url(#dinoGradient)" />
    <rect x="-20" y="60" width="25" height="40" rx="10" fill="url(#dinoGradient)" />
    <rect x="20" y="60" width="25" height="40" rx="10" fill="url(#dinoGradient)" />
    <rect x="60" y="60" width="25" height="40" rx="10" fill="url(#dinoGradient)" />
    
    <!-- Belly highlight -->
    <ellipse cx="10" cy="20" rx="80" ry="60" fill="#4CAF50" opacity="0.3" />
  </g>
  
  <!-- "AI" Text -->
  <text x="256" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#4CAF50">
    DinoAir
  </text>
</svg>
`;

// Icon sizes for different platforms
const iconSizes = {
  windows: [16, 32, 48, 64, 128, 256],
  mac: [16, 32, 64, 128, 256, 512, 1024],
  linux: [512]
};

async function generateIcons() {
  console.log('🦕 Generating DinoAir icons...');
  
  // Create assets directory if it doesn't exist
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Save base SVG
  const svgPath = path.join(assetsDir, 'icon.svg');
  fs.writeFileSync(svgPath, dinoAirSVG);
  console.log('✅ Created base SVG');
  
  // Generate PNG files for all sizes
  const pngPromises = [];
  const allSizes = [...new Set([...iconSizes.windows, ...iconSizes.mac, ...iconSizes.linux])];
  
  for (const size of allSizes) {
    const pngPath = path.join(assetsDir, `icon-${size}x${size}.png`);
    pngPromises.push(
      sharp(Buffer.from(dinoAirSVG))
        .resize(size, size)
        .png()
        .toFile(pngPath)
        .then(() => console.log(`✅ Generated ${size}x${size} PNG`))
    );
  }
  
  await Promise.all(pngPromises);
  
  // Generate Windows ICO
  await generateWindowsIcon(assetsDir);
  
  // Generate macOS ICNS
  await generateMacIcon(assetsDir);
  
  // Copy largest PNG as main icon.png
  const mainIconPath = path.join(assetsDir, 'icon.png');
  fs.copyFileSync(
    path.join(assetsDir, 'icon-512x512.png'),
    mainIconPath
  );
  console.log('✅ Created main icon.png');
  
  console.log('\n🎉 All icons generated successfully!');
}

async function generateWindowsIcon(assetsDir) {
  try {
    // Check if ImageMagick is available
    try {
      execSync('magick -version', { stdio: 'ignore' });
      
      // Use ImageMagick to create ICO
      const pngFiles = iconSizes.windows.map(size => 
        path.join(assetsDir, `icon-${size}x${size}.png`)
      ).join(' ');
      
      const icoPath = path.join(assetsDir, 'icon.ico');
      execSync(`magick ${pngFiles} ${icoPath}`);
      console.log('✅ Generated Windows ICO (using ImageMagick)');
    } catch (e) {
      // Fallback: use png2ico if available
      try {
        execSync('png2ico --version', { stdio: 'ignore' });
        
        const pngFiles = iconSizes.windows.map(size => 
          path.join(assetsDir, `icon-${size}x${size}.png`)
        ).join(' ');
        
        const icoPath = path.join(assetsDir, 'icon.ico');
        execSync(`png2ico ${icoPath} ${pngFiles}`);
        console.log('✅ Generated Windows ICO (using png2ico)');
      } catch (e2) {
        console.log('⚠️  Could not generate ICO file - ImageMagick or png2ico required');
        console.log('   Install with: npm install -g png2ico');
      }
    }
  } catch (error) {
    console.error('Error generating Windows icon:', error);
  }
}

async function generateMacIcon(assetsDir) {
  try {
    // Create iconset directory
    const iconsetPath = path.join(assetsDir, 'icon.iconset');
    if (!fs.existsSync(iconsetPath)) {
      fs.mkdirSync(iconsetPath);
    }
    
    // Copy PNG files with correct naming for iconutil
    const macIconSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];
    
    for (const { size, name } of macIconSizes) {
      const srcPath = path.join(assetsDir, `icon-${size}x${size}.png`);
      const destPath = path.join(iconsetPath, name);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    
    // Try to use iconutil on macOS
    if (process.platform === 'darwin') {
      try {
        const icnsPath = path.join(assetsDir, 'icon.icns');
        execSync(`iconutil -c icns ${iconsetPath} -o ${icnsPath}`);
        console.log('✅ Generated macOS ICNS');
        
        // Clean up iconset directory
        fs.rmSync(iconsetPath, { recursive: true, force: true });
      } catch (e) {
        console.log('⚠️  Could not generate ICNS file - iconutil failed');
      }
    } else {
      console.log('⚠️  ICNS generation requires macOS with iconutil');
    }
  } catch (error) {
    console.error('Error generating macOS icon:', error);
  }
}

// Check if sharp is installed
try {
  require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.log('Please run: npm install sharp');
  process.exit(1);
}

// Run the generation
generateIcons().catch(console.error);