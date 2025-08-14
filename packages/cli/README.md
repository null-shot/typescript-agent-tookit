# Nullshot CLI

A TypeScript CLI tool for managing Model Context Protocol (MCP) servers with Cloudflare Workers and Durable Objects.

## Features

- 🔧 **Automated Installation**: Install MCP servers from GitHub repositories
- 📦 **Package Manager Detection**: Supports npm, yarn, and pnpm
- ⚙️ **Cloudflare Integration**: Configures wrangler.jsonc for Workers deployment
- 🔍 **Dry Run Mode**: Preview changes before execution
- ✅ **Schema Validation**: Type-safe configuration with JSON Schema
- 🧹 **PUT Semantics**: Automatically removes servers not in config
- 📝 **JSONC Support**: Configuration with comments

## Installation

```bash
npm install -g @xava-labs/nullshot
# or
yarn global add @xava-labs/nullshot
# or  
pnpm add -g @xava-labs/nullshot
```

## Quick Start

1. **Initialize configuration**:
```bash
nullshot init
```

2. **Edit `mcp.jsonc`** with your servers:
```jsonc
{
  "servers": {
    "filesystem": {
      "source": "github:modelcontextprotocol/servers#filesystem",
      "command": "npx -y @modelcontextprotocol/server-filesystem",
      "env": [
        { "name": "ALLOWED_DIRS", "value": "/tmp,/home/user/docs" }
      ]
    },
    "github": {
      "source": "github:modelcontextprotocol/servers#github", 
      "command": "npx -y @modelcontextprotocol/server-github",
      "env": [
        { "name": "GITHUB_PERSONAL_ACCESS_TOKEN" }
      ]
    }
  }
}
```

3. **Install servers**:
```bash
nullshot install
```

## Configuration

The `mcp.jsonc` file defines your MCP servers:

```jsonc
{
  "servers": {
    "<serverName>": {
      "source": "string",      // NPM-style URL (github:user/repo#branch)
      "command": "string",     // Startup command
      "env": [                 // Optional environment variables
        {
          "name": "string",
          "value": "string"    // Optional - reads from process.env if omitted
        }
      ],
      "auth": {               // Optional authentication
        "headers": {
          "API_KEY": "$API_KEY"
        }
      }
    }
  }
}
```

### Source URL Formats

- `github:modelcontextprotocol/servers#filesystem`
- `github:user/repo#branch`
- `@scope/package@version`
- `https://github.com/user/repo.git#tag`
## Commands

### `nullshot install`

Install MCP servers from configuration file.

```bash
nullshot install [options]

Options:
  --skip-package-update    Skip updating package.json dependencies
  --skip-wrangler-update   Skip updating wrangler.jsonc configuration
  --dry-run               Show what would be done without making changes
  -v, --verbose           Enable verbose logging
  -c, --config <path>     Path to config file (default: mcp.jsonc)
```

### `nullshot list`

List currently installed MCP servers.

```bash
nullshot list [options]

Options:
  --format <type>         Output format: table|json (default: table)
```

### `nullshot validate`

Validate MCP configuration file.

```bash
nullshot validate
```

### `nullshot init`

Initialize a new MCP configuration file.

```bash
nullshot init [options]

Options:
  --force                 Overwrite existing configuration file
```

## Examples

### Basic Installation

```bash
# Initialize with default servers
nullshot init

# Install all configured servers
nullshot install

# Preview changes without executing
nullshot install --dry-run
```

### Custom Configuration

```jsonc
{
  "servers": {
    "slack": {
      "source": "github:modelcontextprotocol/servers#slack",
      "command": "npx -y @modelcontextprotocol/server-slack",
      "env": [
        { "name": "SLACK_BOT_TOKEN" },
        { "name": "SLACK_TEAM_ID", "value": "T1234567890" }
      ]
    },
    "postgres": {
      "source": "github:modelcontextprotocol/servers#postgres", 
      "command": "npx -y @modelcontextprotocol/server-postgres",
      "env": [
        { "name": "POSTGRES_CONNECTION_STRING" }
      ]
    },
    "custom": {
      "source": "github:myorg/custom-mcp-server#main",
      "command": "node dist/index.js",
      "auth": {
        "headers": {
          "Authorization": "Bearer $CUSTOM_API_TOKEN"
        }
      }
    }
  }
}
```

### Cloudflare Workers Integration

After running `nullshot install`, your `wrangler.jsonc` will be updated:

```jsonc
{
  "name": "mcp-worker",
  "compatibility_date": "2025-06-26",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      { "name": "McpAgent_filesystem", "class_name": "McpAgent" },
      { "name": "McpAgent_github", "class_name": "McpAgent" }
    ]
  },
  "services": [
    { "name": "MCP_FILESYSTEM", "service": "filesystem", "environment": "production" },
    { "name": "MCP_GITHUB", "service": "github", "environment": "production" }
  ],
  "vars": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_...",
    "ALLOWED_DIRS": "/tmp,/home/user/docs"
  }
}
```

### Package Manager Detection

The CLI automatically detects your package manager:

1. Checks `package.json` `packageManager` field
2. Looks for lock files (`yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`)
3. Falls back to npm

### Development Workflow

```bash
# Validate configuration
nullshot validate

# Preview installation
nullshot install --dry-run

# Install with verbose output
nullshot install --verbose

# List installed servers
nullshot list

# List in JSON format
nullshot list --format json
```

## Project Structure

```
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── config/
│   │   └── config-manager.ts # Configuration management
│   ├── package/
│   │   └── package-manager.ts # Package installation logic
│   ├── wrangler/
│   │   └── wrangler-manager.ts # Cloudflare Workers config
│   └── utils/
│       ├── dry-run.ts        # Dry run functionality
│       ├── errors.ts         # Error handling
│       └── logger.ts         # Logging utilities
├── __tests__/                # Vitest test suite
├── mcp.jsonc                 # MCP server configuration
├── wrangler.jsonc           # Cloudflare Workers configuration  
└── package.json
```

## Development

### Setup

```bash
git clone <repository>
cd nullshot-cli
npm install
```

### Scripts

```bash
npm run build          # Build TypeScript
npm run test           # Run tests with Vitest
npm run test:coverage  # Run tests with coverage
npm run lint           # ESLint
npm run dev            # Development mode
```

### Testing

The project uses Vitest with comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Error Handling

The CLI provides helpful error messages and suggestions:

```bash
❌ Configuration file not found: mcp.jsonc
💡 Run 'nullshot init' to create a new configuration file

❌ Invalid configuration: servers.test: missing required property 'command'
💡 Check your configuration file against the schema
```

## Environment Variables

Set these in your environment or CI/CD:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
export SLACK_BOT_TOKEN=xoxb-...
export POSTGRES_CONNECTION_STRING=postgresql://...
```

## Troubleshooting

### Common Issues

**Configuration validation errors**:
- Check JSON syntax and required fields
- Server names must match pattern `^[a-zA-Z][a-zA-Z0-9_-]*$`

**Package installation failures**:
- Verify GitHub repository exists and is accessible
- Check network connectivity and authentication

**Wrangler configuration issues**:
- Ensure `wrangler.jsonc` has write permissions
- Verify Cloudflare account setup

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
nullshot install --verbose --dry-run
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

## License

MIT License - see LICENSE file for details.