# @xava-labs/playground

A comprehensive React component library for building MCP (Model Context Protocol) server management interfaces and AI chat experiences.

## Installation

```bash
npm install @xava-labs/playground
# or
yarn add @xava-labs/playground
```

## Usage

### Complete Playground Component

The easiest way to get started is with the complete playground component:

```tsx
import { PlaygroundProvider, Playground } from '@xava-labs/playground';
import '@xava-labs/playground/styles';

function App() {
  return (
    <PlaygroundProvider 
      config={{
        mcpProxyUrl: 'http://localhost:6050',
        mcpProxyWsUrl: 'ws://localhost:6050/client/ws',
        theme: 'dark',
        defaultModelConfig: {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4'
        }
      }}
    >
      <Playground />
    </PlaygroundProvider>
  );
}
```

### Individual Components

You can also use individual components for more customized integrations:

```tsx
import { 
  PlaygroundProvider, 
  ChatContainer, 
  MCPServerDirectory, 
  ModelSelector,
  useConfigurableMcpServerManager 
} from '@xava-labs/playground';

function CustomInterface() {
  return (
    <PlaygroundProvider config={{ /* your config */ }}>
      <div className="flex h-screen">
        <div className="w-1/3">
          <MCPServerDirectory 
            onServerToggle={(server, enabled) => {
              console.log(`${server.name} ${enabled ? 'enabled' : 'disabled'}`);
            }}
          />
        </div>
        <div className="flex-1">
          <ChatContainer title="Custom Chat" />
        </div>
        <div className="w-1/4">
          <ModelSelector onModelChange={(config) => console.log(config)} />
        </div>
      </div>
    </PlaygroundProvider>
  );
}
```

### Using Hooks

Access MCP server management functionality directly:

```tsx
import { useConfigurableMcpServerManager, PlaygroundProvider } from '@xava-labs/playground';

function ServerManager() {
  const {
    servers,
    connected,
    loading,
    addServer,
    deleteServer,
    refreshServers
  } = useConfigurableMcpServerManager();

  const handleAddServer = async () => {
    await addServer({
      uniqueName: 'my-server',
      command: 'npx',
      args: ['my-mcp-server'],
      env: { API_KEY: 'your-key' }
    });
  };

  return (
    <div>
      <button onClick={handleAddServer}>Add Server</button>
      <ul>
        {servers.map(server => (
          <li key={server.uniqueName}>{server.uniqueName}</li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <PlaygroundProvider config={{ /* config */ }}>
      <ServerManager />
    </PlaygroundProvider>
  );
}
```

## Configuration

### PlaygroundConfig

```typescript
interface PlaygroundConfig {
  // Required: MCP Proxy URLs
  mcpProxyUrl: string;           // HTTP URL for MCP proxy
  mcpProxyWsUrl: string;         // WebSocket URL for real-time updates
  
  // Optional: API configuration
  apiBaseUrl?: string;           // Base URL for API calls (default: '/api')
  
  // Optional: Default model configuration
  defaultModelConfig?: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
  };
  
  // Optional: UI configuration
  theme?: 'dark' | 'light';      // Default: 'dark'
  enabledFeatures?: {
    chat?: boolean;              // Default: true
    mcpServerDirectory?: boolean; // Default: true
    modelSelector?: boolean;     // Default: true
  };
}
```

### Environment Variables

The playground supports the following environment variables:

```bash
# MCP Registry Configuration
NEXT_PUBLIC_MCP_REGISTRY_URL=https://mcp-registry.nullshot.ai/latest.json  # Default registry URL
NEXT_PUBLIC_MCP_PROXY_URL=http://localhost:6050                             # MCP proxy HTTP URL
NEXT_PUBLIC_MCP_PROXY_WS_URL=ws://localhost:6050/client/ws                  # MCP proxy WebSocket URL

# API Keys (for model providers)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

The `NEXT_PUBLIC_MCP_REGISTRY_URL` environment variable allows you to override the default MCP registry URL. This is useful for:
- Using a custom/private MCP registry
- Testing with a local registry during development
- Using alternative registry endpoints

### Playground Component Props

```typescript
interface PlaygroundProps {
  className?: string;
  style?: React.CSSProperties;
  layout?: 'horizontal' | 'vertical';  // Default: 'horizontal'
  showModelSelector?: boolean;         // Default: true
  showMCPDirectory?: boolean;          // Default: true
  showChat?: boolean;                  // Default: true
}
```

## Setting Up MCP Proxy

The playground requires an MCP proxy server to manage MCP servers. You can use the `@xava-labs/mcp-proxy` package:

```bash
# Install the proxy
npm install @xava-labs/mcp-proxy

# Run the proxy
npx wrangler dev --port 6050
```

Or set up your own proxy that implements the WebSocket protocol expected by the playground components.

## Styling

The package includes default styles that can be imported:

```tsx
import '@xava-labs/playground/styles';
```

The components use Tailwind CSS classes. Make sure your project has Tailwind CSS configured, or the components may not display correctly.

## Examples

### Complete MCP Development Environment

```tsx
import { PlaygroundProvider, Playground } from '@xava-labs/playground';
import '@xava-labs/playground/styles';

export default function MCPDevelopmentEnvironment() {
  return (
    <PlaygroundProvider
      config={{
        mcpProxyUrl: process.env.NEXT_PUBLIC_MCP_PROXY_URL || 'http://localhost:6050',
        mcpProxyWsUrl: process.env.NEXT_PUBLIC_MCP_PROXY_WS_URL || 'ws://localhost:6050/client/ws',
        theme: 'dark',
        defaultModelConfig: {
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          model: 'claude-3-5-sonnet-20241022'
        }
      }}
    >
      <Playground
        layout="horizontal"
        showModelSelector={true}
        showMCPDirectory={true}
        showChat={true}
      />
    </PlaygroundProvider>
  );
}
```

### Custom Chat Interface

```tsx
import { 
  PlaygroundProvider, 
  ChatContainer, 
  useConfigurableMcpServerManager 
} from '@xava-labs/playground';

function CustomChat() {
  const { servers, connected } = useConfigurableMcpServerManager();
  
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-100 p-4">
        Connected Servers: {servers.length} | Status: {connected ? 'Connected' : 'Disconnected'}
      </div>
      <div className="flex-1">
        <ChatContainer 
          title="Custom MCP Chat"
          showHeader={true}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PlaygroundProvider config={{ /* your config */ }}>
      <CustomChat />
    </PlaygroundProvider>
  );
}
```

## API Reference

### Components

- `PlaygroundProvider` - Configuration provider component
- `Playground` - Complete playground interface
- `ChatContainer` - AI chat interface
- `MCPServerDirectory` - MCP server management UI
- `ModelSelector` - AI model selection interface
- `MCPServerItem` - Individual server item component
- UI components: `Button`, `Drawer`, `Sheet`, `Label`, `Textarea`

### Hooks

- `usePlaygroundConfig()` - Access playground configuration
- `useConfigurableMcpServerManager()` - MCP server management

### Types

- `PlaygroundConfig` - Configuration interface
- `McpServer` - MCP server data structure
- `PlaygroundProps` - Playground component props

## Requirements

- React 18+ or 19+
- A running MCP proxy server
- Tailwind CSS for styling

## Development

See the main repository for development setup instructions.

## License

MIT License - see LICENSE file for details.
