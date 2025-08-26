'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, Code, Zap, Settings, Terminal } from 'lucide-react'

const examples = [
  {
    title: 'Basic Integration',
    description: 'Simple setup with default configuration',
    href: '/examples/basic',
    icon: Code,
    code: `import { PlaygroundProvider, Playground } from '@null-shot/playground'

function App() {
  return (
    <PlaygroundProvider config={{ mcpProxyUrl: 'http://localhost:6050' }}>
      <Playground />
    </PlaygroundProvider>
  )
}`
  },
  {
    title: 'Custom MCP Proxy',
    description: 'Using a custom MCP proxy URL and WebSocket endpoint',
    href: '/examples/custom-proxy',
    icon: Settings,
    code: `<PlaygroundProvider 
  config={{
    mcpProxyUrl: 'https://my-mcp-proxy.example.com',
    mcpProxyWsUrl: 'wss://my-mcp-proxy.example.com/ws'
  }}
>
  <Playground />
</PlaygroundProvider>`
  },
  {
    title: 'Component Composition',
    description: 'Using individual components to build custom layouts',
    href: '/examples/composition',
    icon: Zap,
    code: `import { ChatContainer, MCPServerDirectory } from '@null-shot/playground'

function CustomLayout() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ChatContainer />
      <MCPServerDirectory />
    </div>
  )
}`
  },
  {
    title: 'Full Playground Interface',
    description: 'Complete playground with header, toolbox management, and modal flows',
    href: '/examples/full-playground',
    icon: Terminal,
    code: `import { 
  PlaygroundProvider, 
  PlaygroundHeader,
  ChatContainer,
  MCPServerDirectory,
  DockerInstallModal,
  useConfigurableMcpServerManager
} from '@null-shot/playground'

function FullPlayground() {
  const [isDockerModalOpen, setIsDockerModalOpen] = useState(false)
  const [isToolboxInstalled, setIsToolboxInstalled] = useState(false)
  const [toolboxStatus, setToolboxStatus] = useState('disconnected')
  
  const { connected, connect } = useConfigurableMcpServerManager()

  return (
    <PlaygroundProvider config={{ /* your config */ }}>
      <main className="flex h-screen">
        <div className="flex-1 flex flex-col p-6">
          <PlaygroundHeader 
            isToolboxInstalled={isToolboxInstalled}
            toolboxStatus={toolboxStatus}
            onInstallClick={() => setIsDockerModalOpen(true)}
          />
          <MCPServerDirectory />
        </div>
        <div className="w-96 border-l">
          <ChatContainer />
        </div>
      </main>
      
      <DockerInstallModal
        isOpen={isDockerModalOpen}
        onClose={() => setIsDockerModalOpen(false)}
        onInstallationComplete={() => setIsToolboxInstalled(true)}
      />
    </PlaygroundProvider>
  )
}`
  },
  {
    title: 'Using MCP Server Manager Hook',
    description: 'Direct access to MCP server management functionality',
    href: '/examples/server-manager',
    icon: Settings,
    code: `import { 
  PlaygroundProvider,
  useConfigurableMcpServerManager 
} from '@null-shot/playground'

function ServerManager() {
  const {
    servers,
    connected,
    loading,
    addServer,
    deleteServer,
    refreshServers
  } = useConfigurableMcpServerManager()

  const handleAddServer = async () => {
    await addServer({
      uniqueName: 'my-server',
      command: 'npx',
      args: ['my-mcp-server'],
      env: { API_KEY: 'your-key' }
    })
  }

  return (
    <div>
      <button onClick={handleAddServer}>Add Server</button>
      <ul>
        {servers.map(server => (
          <li key={server.uniqueName}>{server.uniqueName}</li>
        ))}
      </ul>
    </div>
  )
}`
  }
]

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Integration Examples</h1>
            <p className="text-lg text-muted-foreground">
              Learn how to integrate playground components into your applications
            </p>
          </div>

          <div className="grid gap-8">
            {examples.map((example, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <example.icon className="h-6 w-6 text-primary" />
                    <CardTitle>{example.title}</CardTitle>
                  </div>
                  <CardDescription>{example.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-secondary rounded-md p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{example.code}</code>
                    </pre>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Copy and paste this code into your React application
                    </div>
                    <Link
                      href={example.href}
                      className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      View Live Example
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Card className="p-8">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Check out our documentation and community resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://github.com/cloudflare/typescript-agent-vibework"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    View Documentation
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                  <Link
                    href="/playground"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Try Full Playground
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 