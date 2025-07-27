# DinoAir Enhanced Code Execution & Development Environment

A comprehensive development environment with secure code execution, multi-language support, and advanced development tools.

## Features

### 🚀 Multi-Language Code Execution
- **6 Programming Languages**: Python, JavaScript, Java, C++, Go, Rust
- **Secure Docker-based execution** with container isolation
- **Real-time output** and error handling
- **Configurable timeouts** and resource limits

### 📁 Project Management
- **Multi-file projects** with virtual file system
- **Language-specific templates** and examples
- **File operations**: create, read, update, delete
- **Project organization** by user and language

### 📦 Package Management
- **Language-specific dependency management**:
  - Python: `requirements.txt` with pip
  - JavaScript: `package.json` with npm
  - Java: `pom.xml` with Maven
  - Rust: `Cargo.toml` with cargo
- **Automatic dependency file generation**

### 🔒 Security Features
- **Docker container isolation** with no network access
- **Resource limits**: 512MB RAM, 0.5 CPU cores
- **Execution timeouts** (configurable, default 30s)
- **Code size limits** (100KB max)
- **Rate limiting** for API endpoints

## Quick Start

### 1. Start the Server
```bash
cd web-gui-node
npm install --ignore-scripts
node simple-server.js
```

### 2. Access the UI
Open http://localhost:3001 in your browser

### 3. API Usage

#### Execute Code
```bash
curl -X POST http://localhost:3001/api/code-execution/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello, World!\")"
  }'
```

#### Create Project
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Python Project",
    "language": "python"
  }'
```

#### Add File to Project
```bash
curl -X POST http://localhost:3001/api/projects/{PROJECT_ID}/files \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "utils.py",
    "content": "def hello():\n    return \"Hello from utils!\""
  }'
```

## API Endpoints

### Code Execution
- `POST /api/code-execution/execute` - Execute code
- `GET /api/code-execution/status/:id` - Check execution status
- `DELETE /api/code-execution/cancel/:id` - Cancel execution
- `GET /api/code-execution/languages` - List supported languages
- `GET /api/code-execution/examples` - Get code examples
- `GET /api/code-execution/health` - Service health check

### Project Management
- `POST /api/projects` - Create new project
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/files` - Create/update project files
- `GET /api/projects/:id/files/:name` - Read project file
- `DELETE /api/projects/:id/files/:name` - Delete project file
- `POST /api/projects/:id/dependencies` - Add project dependencies

## Architecture

### Core Components
- **CodeExecutionService**: Secure Docker-based code execution
- **VirtualFileSystem**: Project and file management
- **Enhanced REST API**: Complete CRUD operations
- **Security Middleware**: Authentication, rate limiting, validation

### Docker Integration
Each code execution runs in an isolated Docker container with:
- **No network access** for security
- **Limited resources** (512MB RAM, 0.5 CPU)
- **Read-only filesystem** with writable /tmp
- **Automatic cleanup** after execution

## Testing

### Run Basic Tests
```bash
node test-code-execution.js
```

### Run Enhanced System Tests
```bash
node test-enhanced-system.js
```

### Test Coverage
- ✅ Code execution (Python, JavaScript)
- ✅ Error handling and timeouts
- ✅ Project management
- ✅ File operations
- ✅ Security features
- ✅ Performance testing

## Security Considerations

1. **Container Isolation**: Each execution runs in a separate Docker container
2. **No Network Access**: Containers have no internet connectivity
3. **Resource Limits**: Memory and CPU usage is strictly limited
4. **Code Validation**: Input validation and size limits
5. **Rate Limiting**: API endpoints are rate-limited
6. **Timeout Protection**: Executions are automatically terminated after timeout

## Performance

- **Execution Speed**: ~200-300ms average per execution
- **Concurrent Support**: Multiple simultaneous executions
- **Resource Efficiency**: Automatic container cleanup
- **Scalability**: Horizontal scaling ready

## Integration with DinoAir

This code execution system integrates seamlessly with DinoAir's existing infrastructure:
- Uses existing Express.js API structure
- Compatible with DinoAir's authentication system
- Follows DinoAir's security and monitoring patterns
- Ready for production deployment

## Future Enhancements

- WebSocket support for real-time execution feedback
- Advanced debugging tools and breakpoints
- Code collaboration and sharing features
- Integration with version control systems
- Advanced performance profiling
- Support for additional programming languages

## License

This implementation is part of DinoAir and follows the same MIT license.