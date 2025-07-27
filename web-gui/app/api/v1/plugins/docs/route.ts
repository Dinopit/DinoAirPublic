import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { withApiAuth } from '@/lib/middleware/api-auth';

// GET: Plugin development documentation and SDK information
async function getPluginDocs(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'overview';

    const docs = {
      overview: {
        title: 'DinoAir Plugin System Overview',
        content: `
# DinoAir Plugin System

The DinoAir Plugin System allows developers to extend DinoAir's functionality with custom plugins that can:

- Listen to chat messages and responses
- Register custom commands and UI elements
- Store plugin-specific data
- Show notifications to users
- Access a secure sandbox environment

## Quick Start

1. Create a plugin manifest with required metadata
2. Implement the plugin class with lifecycle methods
3. Use the Plugin API to interact with DinoAir
4. Test your plugin in the development environment
5. Publish to the DinoAir Plugin Registry

## Security

All plugins run in a secure sandbox environment with:
- Code validation and security scanning
- Restricted access to browser APIs
- Permission-based access control
- Resource usage monitoring
        `,
        examples: [
          'Basic plugin structure',
          'Chat message handling',
          'Command registration',
          'Data storage'
        ]
      },

      api: {
        title: 'Plugin API Reference',
        content: `
# Plugin API Reference

## Plugin Lifecycle Methods

### onLoad(api: PluginAPI)
Called when the plugin is loaded. Use this to initialize your plugin and register event handlers.

### onUnload()
Called when the plugin is unloaded. Clean up any resources here.

### onEnable()
Called when the plugin is enabled. Resume normal operations.

### onDisable()
Called when the plugin is disabled. Pause operations but don't clean up.

## Plugin API Methods

### Chat Integration
- \`api.onChatMessage(callback)\` - Listen for chat messages
- \`api.onChatResponse(callback)\` - Listen for AI responses
- \`api.sendChatMessage(message)\` - Send a message to chat

### UI Integration
- \`api.registerCommand(command)\` - Register a UI command
- \`api.showNotification(notification)\` - Show user notification

### Data Storage
- \`api.storage.get(key)\` - Get stored data
- \`api.storage.set(key, value)\` - Store data
- \`api.storage.remove(key)\` - Remove stored data

### Logging
- \`api.logger.log(...args)\` - Log information
- \`api.logger.error(...args)\` - Log errors
- \`api.logger.warn(...args)\` - Log warnings
        `,
        examples: [
          'Event handling',
          'Command registration',
          'Storage operations',
          'Error handling'
        ]
      },

      manifest: {
        title: 'Plugin Manifest Format',
        content: `
# Plugin Manifest Format

Every plugin must include a manifest.json file with the following structure:

\`\`\`json
{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A plugin that does amazing things",
  "author": "Your Name",
  "homepage": "https://github.com/yourname/my-plugin",
  "permissions": ["chat", "commands", "storage"],
  "main": "...", // Plugin code as string
  "config": {
    // Default configuration
  }
}
\`\`\`

## Required Fields

- **id**: Unique identifier (lowercase, alphanumeric, hyphens)
- **name**: Human-readable plugin name
- **version**: Semantic version (x.y.z)
- **description**: Brief description of functionality
- **author**: Plugin author name
- **main**: Plugin code as JavaScript string

## Optional Fields

- **homepage**: Project homepage or repository URL
- **permissions**: Array of required permissions
- **config**: Default configuration object

## Permissions

- **chat**: Access to chat messages and responses
- **commands**: Register UI commands
- **storage**: Access to plugin storage
- **network**: Make external HTTP requests (restricted)
- **ui**: Modify UI elements
        `,
        examples: [
          'Complete manifest example',
          'Permission usage',
          'Configuration schema',
          'Version management'
        ]
      },

      security: {
        title: 'Plugin Security Guidelines',
        content: `
# Plugin Security Guidelines

## Code Restrictions

The following patterns are not allowed in plugin code:

- \`eval()\` and \`Function()\` constructors
- Direct DOM manipulation outside provided APIs
- Access to \`document.cookie\` or \`localStorage\` (except via plugin storage API)
- File system access or protocol handlers
- Modification of global objects

## Best Practices

1. **Validate Input**: Always validate user input and external data
2. **Use Plugin APIs**: Use provided APIs instead of direct browser APIs
3. **Handle Errors**: Implement proper error handling and logging
4. **Resource Management**: Clean up resources in onUnload()
5. **Permission Principle**: Request only necessary permissions

## Sandbox Environment

Plugins run in a restricted environment that:

- Prevents access to sensitive browser APIs
- Isolates plugin storage and configuration
- Monitors resource usage and performance
- Validates code before execution
- Provides secure communication channels

## Reporting Security Issues

If you discover a security vulnerability in the plugin system, please report it to: security@dinoair.dev
        `,
        examples: [
          'Secure coding patterns',
          'Input validation',
          'Error handling',
          'Resource cleanup'
        ]
      },

      examples: {
        title: 'Plugin Examples',
        content: `
# Plugin Examples

## Basic Chat Command Plugin

\`\`\`javascript
class BasicPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user' && message.content === '!hello') {
        await api.sendChatMessage('Hello from my plugin!');
      }
    });
  }
}

module.exports = BasicPlugin;
\`\`\`

## Data Storage Plugin

\`\`\`javascript
class CounterPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.registerCommand({
      id: 'show-count',
      name: 'Show Count',
      action: () => {
        const count = api.storage.get('count') || 0;
        api.sendChatMessage(\`Current count: \${count}\`);
      }
    });
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user') {
        const count = (api.storage.get('count') || 0) + 1;
        api.storage.set('count', count);
      }
    });
  }
}
\`\`\`

## Advanced Plugin with Configuration

\`\`\`javascript
class WeatherPlugin {
  async onLoad(api) {
    this.api = api;
    this.config = api.storage.get('config') || {
      apiKey: '',
      defaultLocation: 'New York'
    };
    
    api.registerCommand({
      id: 'weather-config',
      name: 'Weather Settings',
      action: () => this.showConfig()
    });
    
    api.onChatMessage(async (message) => {
      if (message.content.startsWith('!weather ')) {
        const location = message.content.slice(9);
        await this.getWeather(location || this.config.defaultLocation);
      }
    });
  }
  
  async getWeather(location) {
    // Weather API call implementation
    this.api.sendChatMessage(\`Weather for \${location}: Sunny, 72°F\`);
  }
  
  showConfig() {
    this.api.sendChatMessage(
      \`Weather plugin settings:\\n\` +
      \`Default location: \${this.config.defaultLocation}\`
    );
  }
}
\`\`\`
        `,
        examples: [
          'Hello world plugin',
          'Command registration',
          'Event handling',
          'Configuration management'
        ]
      }
    };

    const requestedSection = docs[section as keyof typeof docs];
    
    if (!requestedSection) {
      return NextResponse.json(
        { error: 'Documentation section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      section,
      title: requestedSection.title,
      content: requestedSection.content,
      examples: requestedSection.examples,
      availableSections: Object.keys(docs),
      lastUpdated: '2024-01-25T00:00:00Z'
    });

  } catch (error) {
    console.error('Get plugin docs error:', error);
    return NextResponse.json(
      { error: 'Failed to get plugin documentation' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getPluginDocs);
