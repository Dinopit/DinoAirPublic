const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const tests = {
    checkDependencies: {
        name: 'Check Dependencies',
        run: async () => {
            console.log('Checking package.json exists...');
            const packagePath = path.join(__dirname, '..', 'package.json');
            if (!fs.existsSync(packagePath)) {
                throw new Error('package.json not found');
            }
            
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            console.log('✓ Package name:', pkg.name);
            console.log('✓ Version:', pkg.version);
            
            // Check required files
            const requiredFiles = ['main.js', 'preload.js', 'renderer.js', 'index.html', 'styles.css'];
            for (const file of requiredFiles) {
                const filePath = path.join(__dirname, '..', file);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Required file missing: ${file}`);
                }
                console.log(`✓ ${file} exists`);
            }
        }
    },
    
    testHardwareDetection: {
        name: 'Test Hardware Detection Mock',
        run: async () => {
            console.log('Testing hardware detection logic...');
            const os = require('os');
            
            const mockHardware = {
                cpu: {
                    name: os.cpus()[0].model,
                    cores: os.cpus().length,
                    threads: os.cpus().length
                },
                ram: {
                    total_gb: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
                    available_gb: Math.round(os.freemem() / (1024 * 1024 * 1024))
                },
                gpu: {
                    devices: [],
                    cuda_available: false,
                    total_vram_gb: 0
                },
                system: {
                    platform: os.platform(),
                    release: os.release(),
                    arch: os.arch()
                }
            };
            
            console.log('✓ CPU:', mockHardware.cpu.name);
            console.log('✓ Cores:', mockHardware.cpu.cores);
            console.log('✓ RAM:', mockHardware.ram.total_gb, 'GB');
            console.log('✓ Platform:', mockHardware.system.platform);
        }
    },
    
    testRecommendationLogic: {
        name: 'Test Recommendation Logic',
        run: async () => {
            console.log('Testing recommendation logic...');
            
            const testCases = [
                {
                    name: 'High-end GPU system',
                    hardware: { ram: { total_gb: 32 }, gpu: { devices: ['NVIDIA RTX 4090'], total_vram_gb: 24 } },
                    expected: { tier: 'premium', mode: 'pro' }
                },
                {
                    name: 'Mid-range GPU system',
                    hardware: { ram: { total_gb: 16 }, gpu: { devices: ['NVIDIA GTX 1660'], total_vram_gb: 6 } },
                    expected: { tier: 'standard', mode: 'standard' }
                },
                {
                    name: 'CPU-only system',
                    hardware: { ram: { total_gb: 16 }, gpu: { devices: [], total_vram_gb: 0 } },
                    expected: { tier: 'basic', mode: 'easy' }
                },
                {
                    name: 'Low-end system',
                    hardware: { ram: { total_gb: 8 }, gpu: { devices: [], total_vram_gb: 0 } },
                    expected: { tier: 'minimal', mode: 'easy' }
                }
            ];
            
            for (const testCase of testCases) {
                const result = getRecommendations(testCase.hardware);
                console.log(`\n✓ ${testCase.name}:`);
                console.log(`  Tier: ${result.tier} (expected: ${testCase.expected.tier})`);
                console.log(`  Mode: ${result.recommendedMode} (expected: ${testCase.expected.mode})`);
                
                if (result.tier !== testCase.expected.tier || result.recommendedMode !== testCase.expected.mode) {
                    throw new Error(`Recommendation mismatch for ${testCase.name}`);
                }
            }
        }
    },
    
    testElectronApp: {
        name: 'Test Electron App Launch',
        run: async () => {
            console.log('Testing Electron app launch (5 second timeout)...');
            
            return new Promise((resolve, reject) => {
                const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 
                    process.platform === 'win32' ? 'electron.cmd' : 'electron');
                
                const appPath = path.join(__dirname, '..');
                
                console.log('Launching Electron from:', appPath);
                const child = spawn(electronPath, [appPath, '--test-mode'], {
                    stdio: 'pipe',
                    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
                });
                
                let output = '';
                child.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                child.stderr.on('data', (data) => {
                    output += data.toString();
                });
                
                // Give it 5 seconds to start
                setTimeout(() => {
                    child.kill();
                    if (output.includes('Error') || output.includes('error')) {
                        reject(new Error('Electron app failed to start properly'));
                    } else {
                        console.log('✓ Electron app launched successfully');
                        resolve();
                    }
                }, 5000);
                
                child.on('error', (err) => {
                    reject(new Error(`Failed to launch Electron: ${err.message}`));
                });
            });
        }
    }
};

// Helper function for recommendations (mirrors main.js logic)
function getRecommendations(hardware) {
    const totalRam = hardware.ram.total_gb;
    const hasGpu = hardware.gpu.devices.length > 0;
    
    let tier, recommendedModel, mode;
    
    if (hasGpu && hardware.gpu.total_vram_gb >= 8) {
        tier = 'premium';
        recommendedModel = 'sdxl-turbo';
        mode = 'pro';
    } else if (hasGpu && hardware.gpu.total_vram_gb >= 4) {
        tier = 'standard';
        recommendedModel = 'sd-1.5';
        mode = 'standard';
    } else if (totalRam >= 16) {
        tier = 'basic';
        recommendedModel = 'sd-1.5-cpu';
        mode = 'easy';
    } else {
        tier = 'minimal';
        recommendedModel = 'sd-1.5-mini';
        mode = 'easy';
    }
    
    return {
        tier,
        recommendedModel,
        recommendedMode: mode
    };
}

// Run tests
async function runTests() {
    console.log('=== DinoAir Installer Test Suite ===\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const [key, test] of Object.entries(tests)) {
        console.log(`\nRunning: ${test.name}`);
        console.log('-'.repeat(40));
        
        try {
            await test.run();
            console.log(`\n✅ ${test.name} PASSED`);
            passed++;
        } catch (error) {
            console.error(`\n❌ ${test.name} FAILED:`, error.message);
            failed++;
        }
    }
    
    console.log('\n' + '='.repeat(40));
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(40));
    
    if (failed > 0) {
        process.exit(1);
    }
}

// Check if Electron needs to be installed first
function checkElectronInstalled() {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        console.log('\n⚠️  Dependencies not installed. Please run:');
        console.log('   cd installer && npm install\n');
        process.exit(1);
    }
}

// Main
if (require.main === module) {
    checkElectronInstalled();
    runTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests };