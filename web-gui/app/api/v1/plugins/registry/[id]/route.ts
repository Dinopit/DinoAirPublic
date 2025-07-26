import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { createExamplePluginManifest } from '@/lib/plugins/example-plugin';

// GET: Download a specific plugin from registry
async function downloadPlugin(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const pluginId = params.id;

    // For demo purposes, we'll return the example plugin
    // In production, this would fetch from a database or file system
    if (pluginId === 'example-plugin') {
      const manifest = createExamplePluginManifest();
      
      return NextResponse.json({
        success: true,
        manifest,
        downloadedAt: new Date().toISOString()
      });
    }

    // Mock other plugins for demonstration
    const mockPlugins: Record<string, any> = {
      'weather-plugin': {
        id: 'weather-plugin',
        name: 'Weather Assistant',
        version: '2.1.0',
        description: 'Get weather information in chat with customizable locations and alerts',
        author: 'WeatherDev',
        homepage: 'https://github.com/weatherdev/dinoair-weather',
        permissions: ['network', 'storage'],
        main: `
          class WeatherPlugin {
            constructor() {
              this.api = null;
            }
            
            async onLoad(api) {
              this.api = api;
              api.logger.log('Weather plugin loaded!');
              
              api.registerCommand({
                id: 'weather',
                name: 'Get Weather',
                description: 'Get current weather for a location',
                action: () => {
                  api.sendChatMessage('Weather plugin: Please use "!weather [city]" to get weather information.');
                }
              });
              
              api.onChatMessage(async (message) => {
                if (message.role === 'user' && message.content.startsWith('!weather ')) {
                  const location = message.content.slice(9).trim();
                  if (location) {
                    await api.sendChatMessage(\`Weather for \${location}: Sunny, 72°F (demo response)\`);
                  } else {
                    await api.sendChatMessage('Please specify a location: !weather [city]');
                  }
                }
              });
              
              api.showNotification({
                type: 'success',
                title: 'Weather Plugin',
                message: 'Type !weather [city] to get weather info'
              });
            }
            
            async onUnload() {
              this.api?.logger.log('Weather plugin unloaded');
            }
          }
          
          module.exports = WeatherPlugin;
        `,
        config: {
          apiKey: '',
          defaultLocation: 'New York',
          units: 'imperial'
        }
      },
      'code-formatter': {
        id: 'code-formatter',
        name: 'Code Formatter',
        version: '1.5.2',
        description: 'Automatically format code blocks in chat responses with syntax highlighting',
        author: 'CodeTools',
        homepage: 'https://github.com/codetools/dinoair-formatter',
        permissions: ['ui'],
        main: `
          class CodeFormatterPlugin {
            constructor() {
              this.api = null;
            }
            
            async onLoad(api) {
              this.api = api;
              api.logger.log('Code formatter plugin loaded!');
              
              api.registerCommand({
                id: 'format-code',
                name: 'Format Code',
                description: 'Format the last code block',
                shortcut: 'Ctrl+Shift+F',
                action: () => {
                  api.sendChatMessage('Code formatting applied to recent messages (demo)');
                }
              });
              
              api.onChatResponse((response) => {
                if (response.content.includes('\`\`\`')) {
                  api.logger.log('Code block detected, formatting applied');
                }
              });
              
              api.showNotification({
                type: 'info',
                title: 'Code Formatter',
                message: 'Automatic code formatting is now active'
              });
            }
            
            async onUnload() {
              this.api?.logger.log('Code formatter plugin unloaded');
            }
          }
          
          module.exports = CodeFormatterPlugin;
        `,
        config: {
          autoFormat: true,
          languages: ['javascript', 'typescript', 'python', 'java', 'cpp']
        }
      }
    };

    const plugin = mockPlugins[pluginId];
    if (!plugin) {
      return NextResponse.json(
        { error: 'Plugin not found in registry' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      manifest: plugin,
      downloadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Download plugin error:', error);
    return NextResponse.json(
      { error: 'Failed to download plugin' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(downloadPlugin);
