# DinoAir Plugin System

The DinoAir Plugin System provides a powerful, secure, and extensible way to add custom functionality to DinoAir. This comprehensive system allows developers to create plugins that can interact with chat messages, register commands, store data, and extend the user interface.

## 🌟 Features

- **Secure Sandbox Environment**: All plugins run in a restricted sandbox with validated code execution
- **Rich Plugin API**: Comprehensive API for chat integration, UI commands, and data storage
- **Plugin Registry**: Built-in marketplace for discovering and installing plugins
- **Development Tools**: Complete development environment with validation and testing
- **Lifecycle Management**: Full plugin lifecycle support (install/uninstall/enable/disable)
- **Permission System**: Granular permissions for different plugin capabilities
- **Hot Loading**: Install and test plugins without restarting the application

## 🚀 Quick Start

### For Users - Installing Plugins

1. **Open Plugin Manager**: Navigate to the Plugins tab in DinoAir or visit `/plugins`
2. **Browse Registry**: Explore featured plugins in the Plugin Registry tab
3. **Install Plugin**: Click "Install" on any plugin you want to add
4. **Manage Plugins**: Enable/disable or uninstall plugins from the Installed Plugins tab

### For Developers - Creating Plugins

1. **Open Plugin Developer**: Go to the Plugin Developer tab
2. **Choose Example**: Load an example plugin or start from scratch
3. **Write Plugin Code**: Implement your plugin using the Plugin API
4. **Validate & Test**: Use the validation tools to check your code
5. **Install & Test**: Install your plugin to see it in action

## 📚 Plugin API Reference

### Core Plugin Structure

Every plugin must implement the `PluginInstance` interface:

```javascript
class MyPlugin {
  // Called when plugin is loaded
  async onLoad(api) {
    this.api = api;
    // Initialize your plugin
  }
  
  // Called when plugin is unloaded
  async onUnload() {
    // Clean up resources
  }
  
  // Called when plugin is enabled
  async onEnable() {
    // Resume operations
  }
  
  // Called when plugin is disabled
  async onDisable() {
    // Pause operations
  }
}

module.exports = MyPlugin;
```

### Plugin API Methods

#### Chat Integration
- `api.onChatMessage(callback)` - Listen for user messages
- `api.onChatResponse(callback)` - Listen for AI responses
- `api.sendChatMessage(message)` - Send a message to the chat

#### UI Integration
- `api.registerCommand(command)` - Register a command in the UI
- `api.showNotification(notification)` - Show notifications to users

#### Data Storage
- `api.storage.get(key)` - Retrieve stored data
- `api.storage.set(key, value)` - Store data persistently
- `api.storage.remove(key)` - Remove stored data

#### Logging
- `api.logger.log(...args)` - Log information
- `api.logger.error(...args)` - Log errors
- `api.logger.warn(...args)` - Log warnings

### Plugin Manifest

Every plugin requires a manifest with metadata:

```json
{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "A plugin that does amazing things",
  "author": "Your Name",
  "homepage": "https://github.com/yourname/my-plugin",
  "permissions": ["chat", "commands", "storage"],
  "main": "// Plugin code here",
  "config": {
    // Default configuration
  }
}
```

#### Required Fields
- **id**: Unique identifier (lowercase, alphanumeric, hyphens only)
- **name**: Human-readable plugin name
- **version**: Semantic version (x.y.z format)
- **description**: Brief description of functionality
- **author**: Plugin author name
- **main**: Plugin code as JavaScript string

#### Permission Types
- **chat**: Access to chat messages and responses
- **commands**: Register UI commands and shortcuts
- **storage**: Access to plugin-specific storage
- **ui**: Modify UI elements and show notifications
- **network**: Make external HTTP requests (restricted)

## 🛡️ Security Guidelines

### Code Restrictions

The following patterns are not allowed in plugin code:

- `eval()` and `Function()` constructors
- Direct DOM manipulation outside provided APIs
- Access to `document.cookie` or `localStorage` (use plugin storage API)
- File system access or protocol handlers
- Modification of global objects or prototypes

### Best Practices

1. **Validate Input**: Always validate user input and external data
2. **Use Plugin APIs**: Use provided APIs instead of direct browser APIs
3. **Handle Errors**: Implement proper error handling and logging
4. **Resource Management**: Clean up resources in `onUnload()`
5. **Permission Principle**: Request only necessary permissions

## 🔧 REST API Endpoints

The plugin system provides a comprehensive REST API:

### Plugin Management
- `GET /api/v1/plugins` - List plugins and endpoints
- `POST /api/v1/plugins` - Validate plugin manifest

### Plugin Installation
- `POST /api/v1/plugins/install` - Install plugin with validation

### Plugin Registry
- `GET /api/v1/plugins/registry` - Browse plugin marketplace
- `GET /api/v1/plugins/registry/[id]` - Download specific plugin

### Documentation
- `GET /api/v1/plugins/docs` - Plugin development documentation

All endpoints require authentication and follow rate limiting policies.

## 📖 Examples

### Hello World Plugin

```javascript
class HelloWorldPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user' && message.content === '!hello') {
        await api.sendChatMessage('Hello World from my plugin!');
      }
    });
    
    api.showNotification({
      type: 'success',
      title: 'Hello World Plugin',
      message: 'Plugin loaded! Type !hello to test.'
    });
  }
}

module.exports = HelloWorldPlugin;
```

### Message Counter Plugin

```javascript
class MessageCounterPlugin {
  async onLoad(api) {
    this.api = api;
    
    api.registerCommand({
      id: 'show-stats',
      name: 'Show Message Stats',
      description: 'Display message statistics',
      action: () => {
        const count = api.storage.get('messageCount') || 0;
        api.sendChatMessage(`Total messages: ${count}`);
      }
    });
    
    api.onChatMessage(async (message) => {
      if (message.role === 'user') {
        const count = (api.storage.get('messageCount') || 0) + 1;
        api.storage.set('messageCount', count);
        
        if (message.content === '!stats') {
          await api.sendChatMessage(`Message count: ${count}`);
        }
      }
    });
  }
}

module.exports = MessageCounterPlugin;
```

## 🏗️ Architecture

### Plugin Execution Environment

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Plugin Code   │────▶│  Plugin Manager │────▶│   Plugin API    │
│   (Sandboxed)   │     │  (Validation)   │     │ (Event System)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Code Validator │     │   Permission    │     │   Storage API   │
│  (Security)     │     │     System      │     │  (Isolated)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Components

- **Plugin Manager**: Handles plugin lifecycle and event coordination
- **Code Validator**: Ensures plugin code is safe to execute
- **Permission System**: Controls what plugins can access
- **Storage API**: Provides isolated storage for each plugin
- **Event System**: Enables communication between plugins and DinoAir

## 🧪 Testing

### Manual Testing

1. **Create Test Plugin**: Use the Plugin Developer to create a simple test plugin
2. **Validate Code**: Use the validation tools to check for issues
3. **Install & Test**: Install the plugin and test its functionality
4. **Check Logs**: Monitor console output for any errors or warnings

### Automated Testing

The plugin system includes comprehensive test coverage:

```bash
# Run plugin API tests
npm test app/api/v1/plugins/__tests__/

# Run all tests
npm test
```

## 🔮 Roadmap

### Planned Features

- **Visual Plugin Builder**: Drag-and-drop plugin creation interface
- **Plugin Templates**: Pre-built templates for common plugin types
- **Plugin Marketplace**: Public marketplace for sharing plugins
- **Plugin Analytics**: Usage analytics and performance monitoring
- **Advanced Permissions**: More granular permission controls
- **Plugin Dependencies**: Support for plugin dependencies and libraries

### Contributing

We welcome contributions to the plugin system! Areas where help is needed:

- **Example Plugins**: Create more example plugins for different use cases
- **Documentation**: Improve and expand documentation
- **Testing**: Add more comprehensive tests
- **Security**: Enhance security validation and sandboxing
- **Performance**: Optimize plugin loading and execution

## 📞 Support

### Getting Help

- **Documentation**: Check the comprehensive API documentation
- **Examples**: Browse the example plugins in the Plugin Developer
- **Issues**: Report bugs or request features on GitHub
- **Community**: Join our Discord for plugin development discussions

### Reporting Security Issues

If you discover a security vulnerability in the plugin system, please report it to: security@dinoair.dev

---

**DinoAir Plugin System** - Empowering users and developers to extend DinoAir with custom functionality while maintaining security and performance.