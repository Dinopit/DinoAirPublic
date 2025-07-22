// Example DinoAir Plugin
// This demonstrates how to create a plugin for DinoAir

import { PluginInstance, PluginAPI, PluginManifest } from './plugin-manager';

// Plugin manifest - this would normally be in a separate JSON file
export const examplePluginManifest: PluginManifest = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'A simple example plugin that adds a custom chat command',
  author: 'DinoAir Team',
  homepage: 'https://github.com/dinoair/example-plugin',
  permissions: ['chat', 'commands', 'notifications'],
  main: '', // This will be filled with the compiled plugin code
  config: {
    prefix: '!',
    commands: {
      hello: {
        description: 'Says hello',
        enabled: true
      },
      time: {
        description: 'Shows current time',
        enabled: true
      },
      joke: {
        description: 'Tells a random joke',
        enabled: true
      }
    }
  }
};

// Example plugin implementation
export default class ExamplePlugin implements PluginInstance {
  private api: PluginAPI | null = null;
  private commands: Map<string, () => void> = new Map();

  async onLoad(api: PluginAPI) {
    this.api = api;
    api.logger.log('Example plugin loaded!');

    // Register commands
    this.registerCommands();

    // Listen for chat messages
    api.onChatMessage(async (message) => {
      if (message.role === 'user') {
        // Check if message starts with our prefix
        const prefix = this.getConfig('prefix', '!');
        if (message.content.startsWith(prefix)) {
          const command = message.content.slice(prefix.length).split(' ')[0];
          await this.handleCommand(command, message);
        }
      }
    });

    // Listen for chat responses
    api.onChatResponse((response) => {
      // Count tokens in response
      const tokenCount = Math.ceil(response.content.length / 4);
      const savedCount = this.api?.storage.get('totalTokens') || 0;
      this.api?.storage.set('totalTokens', savedCount + tokenCount);
    });

    // Show welcome notification
    api.showNotification({
      type: 'success',
      title: 'Example Plugin',
      message: 'Plugin loaded successfully! Type !help for commands.',
      duration: 5000
    });
  }

  async onUnload() {
    this.api?.logger.log('Example plugin unloaded');
    this.commands.clear();
  }

  async onEnable() {
    this.api?.logger.log('Example plugin enabled');
  }

  async onDisable() {
    this.api?.logger.log('Example plugin disabled');
  }

  private registerCommands() {
    if (!this.api) return;

    // Help command
    this.api.registerCommand({
      id: 'help',
      name: 'Plugin Help',
      description: 'Show plugin commands',
      shortcut: 'Ctrl+Shift+H',
      action: () => this.showHelp()
    });

    // Stats command
    this.api.registerCommand({
      id: 'stats',
      name: 'Plugin Stats',
      description: 'Show plugin statistics',
      action: () => this.showStats()
    });
  }

  private async handleCommand(command: string, message: any) {
    const config = this.getConfig('commands', {});
    
    switch (command.toLowerCase()) {
      case 'help':
        await this.showHelp();
        break;
        
      case 'hello':
        if (config.hello?.enabled) {
          await this.api?.sendChatMessage('Hello! I\'m the Example Plugin. How can I help you today?');
        }
        break;
        
      case 'time':
        if (config.time?.enabled) {
          const now = new Date();
          await this.api?.sendChatMessage(`The current time is: ${now.toLocaleString()}`);
        }
        break;
        
      case 'joke':
        if (config.joke?.enabled) {
          const jokes = [
            'Why do programmers prefer dark mode? Because light attracts bugs!',
            'Why do Java developers wear glasses? Because they don\'t C#!',
            'How many programmers does it take to change a light bulb? None, that\'s a hardware problem!',
            'Why did the developer go broke? Because he used up all his cache!',
            'What\'s a programmer\'s favorite hangout place? The Foo Bar!'
          ];
          const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
          await this.api?.sendChatMessage(randomJoke);
        }
        break;
        
      case 'stats':
        await this.showStats();
        break;
        
      default:
        await this.api?.sendChatMessage(`Unknown command: ${command}. Type !help for available commands.`);
    }
  }

  private async showHelp() {
    const prefix = this.getConfig('prefix', '!');
    const commands = this.getConfig('commands', {});
    
    let helpText = '📚 **Example Plugin Commands**\n\n';
    helpText += `Use ${prefix} followed by:\n\n`;
    
    for (const [cmd, config] of Object.entries(commands)) {
      if ((config as any).enabled) {
        helpText += `• **${cmd}** - ${(config as any).description}\n`;
      }
    }
    
    helpText += `• **help** - Show this help message\n`;
    helpText += `• **stats** - Show plugin statistics\n`;
    
    await this.api?.sendChatMessage(helpText);
  }

  private async showStats() {
    const totalTokens = this.api?.storage.get('totalTokens') || 0;
    const commandCount = this.api?.storage.get('commandCount') || 0;
    
    const stats = `📊 **Plugin Statistics**\n\n` +
      `• Total tokens processed: ${totalTokens}\n` +
      `• Commands executed: ${commandCount}\n` +
      `• Plugin version: ${examplePluginManifest.version}`;
    
    await this.api?.sendChatMessage(stats);
  }

  private getConfig(key: string, defaultValue: any = null) {
    return examplePluginManifest.config?.[key] || defaultValue;
  }
}

// Function to convert the plugin to a string that can be stored in the manifest
export function getPluginCode(): string {
  // In a real scenario, this would be the compiled/bundled plugin code
  // For this example, we'll return a simplified version
  return `
    class ExamplePlugin {
      constructor() {
        this.api = null;
      }
      
      async onLoad(api) {
        this.api = api;
        api.logger.log('Example plugin loaded!');
        
        // Register help command
        api.registerCommand({
          id: 'plugin-help',
          name: 'Plugin Help',
          description: 'Show example plugin help',
          action: () => {
            api.sendChatMessage('Example Plugin Commands:\\n!hello - Say hello\\n!time - Show time\\n!joke - Tell a joke');
          }
        });
        
        // Listen for chat messages
        api.onChatMessage(async (message) => {
          if (message.role === 'user' && message.content.startsWith('!')) {
            const command = message.content.slice(1).split(' ')[0];
            
            switch (command) {
              case 'hello':
                await api.sendChatMessage('Hello from the Example Plugin!');
                break;
              case 'time':
                await api.sendChatMessage('Current time: ' + new Date().toLocaleString());
                break;
              case 'joke':
                const jokes = [
                  'Why do programmers prefer dark mode? Because light attracts bugs!',
                  'Why do Java developers wear glasses? Because they don\\'t C#!'
                ];
                await api.sendChatMessage(jokes[Math.floor(Math.random() * jokes.length)]);
                break;
            }
          }
        });
        
        api.showNotification({
          type: 'success',
          title: 'Example Plugin',
          message: 'Plugin loaded! Type !hello to test.'
        });
      }
      
      async onUnload() {
        this.api?.logger.log('Example plugin unloaded');
      }
    }
    
    module.exports = ExamplePlugin;
  `;
}

// Helper function to create the full manifest with code
export function createExamplePluginManifest(): PluginManifest {
  return {
    ...examplePluginManifest,
    main: getPluginCode()
  };
}