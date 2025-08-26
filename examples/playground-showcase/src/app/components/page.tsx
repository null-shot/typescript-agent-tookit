"use client";

import { useState } from "react";
import {
  PlaygroundProvider,
  ChatContainer,
  MCPServerDirectory,
  ModelSelector,
  PlaygroundHeader,
  LocalToolboxStatusBadge,
} from "@null-shot/playground";
import "@null-shot/playground/styles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ComponentsPage() {
  const [selectedTab, setSelectedTab] = useState("chat");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Component Showcase</h1>
            <p className="text-lg text-muted-foreground">
              Explore individual playground components and see how they work
            </p>
          </div>

          <PlaygroundProvider
            config={{
              mcpProxyUrl: "http://localhost:6050",
              mcpProxyWsUrl: "ws://localhost:6050/client/ws",
              theme: "dark",
            }}
            imageAssets={{
              defaultAvatar: "/images/default-avatar.png",
              badgeLightBg: "/images/badge_light_bg.png",
              gears: "/images/gears.png",
              cursorLogo: "/images/cursor-logo.svg",
              ellipse: "/images/ellipse.svg",
            }}
          >
            <Tabs
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat">Chat Components</TabsTrigger>
                <TabsTrigger value="mcp">MCP Management</TabsTrigger>
                <TabsTrigger value="models">Model Selection</TabsTrigger>
                <TabsTrigger value="playground">Playground UI</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chat Container</CardTitle>
                    <CardDescription>
                      Full-featured chat interface with message history and
                      streaming support
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg h-96">
                      <ChatContainer />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-secondary rounded-md p-4 overflow-x-auto">
                        <pre className="text-sm">
                          <code>{`import { ChatContainer } from '@null-shot/playground'

<ChatContainer 
  className="h-96"
  showHeader={true}
  enableStreaming={true}
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Real-time message streaming</li>
                        <li>• Message history management</li>
                        <li>• Typing indicators</li>
                        <li>• Customizable themes</li>
                        <li>• File attachment support</li>
                        <li>• Markdown rendering</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="mcp" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>MCP Server Directory</CardTitle>
                    <CardDescription>
                      Manage and configure your MCP servers with real-time
                      status updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg h-96 p-4">
                      <MCPServerDirectory />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-secondary rounded-md p-4 overflow-x-auto">
                        <pre className="text-sm">
                          <code>{`import { MCPServerDirectory } from '@null-shot/playground'

<MCPServerDirectory 
  enableSearch={true}
  showStatus={true}
  allowManagement={true}
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Server status monitoring</li>
                        <li>• Configuration management</li>
                        <li>• WebSocket connection status</li>
                        <li>• Server discovery</li>
                        <li>• Error handling and recovery</li>
                        <li>• Real-time updates</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="models" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Model Selector</CardTitle>
                    <CardDescription>
                      Select and configure AI models for your chat interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg p-4">
                      <ModelSelector />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-secondary rounded-md p-4 overflow-x-auto">
                        <pre className="text-sm">
                          <code>{`import { ModelSelector } from '@null-shot/playground'

<ModelSelector 
  providers={['openai', 'anthropic']}
  showAdvancedOptions={true}
  onModelChange={handleModelChange}
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Multiple AI provider support</li>
                        <li>• Model parameter configuration</li>
                        <li>• API key management</li>
                        <li>• Temperature and token controls</li>
                        <li>• Custom model support</li>
                        <li>• Usage tracking</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="playground" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Playground Header</CardTitle>
                    <CardDescription>
                      Header component with gears icon, status indicators, and
                      installation functionality
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border border-border rounded-lg p-4 bg-[#14161D]">
                      <PlaygroundHeader
                        isToolboxInstalled={false}
                        toolboxStatus="disconnected"
                        onInstallClick={() => console.log("Install clicked")}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status Indicators</CardTitle>
                    <CardDescription>
                      Status badges for local toolbox connection state
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Online:</span>
                          <LocalToolboxStatusBadge status="online" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Offline:</span>
                          <LocalToolboxStatusBadge status="offline" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Cannot Connect:</span>
                          <LocalToolboxStatusBadge status="cannot_connect" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Disconnected:</span>
                          <LocalToolboxStatusBadge status="disconnected" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-secondary rounded-md p-4 overflow-x-auto">
                        <pre className="text-sm">
                          <code>{`import { 
  PlaygroundHeader, 
  LocalToolboxStatusBadge,
  DockerInstallModal 
} from '@null-shot/playground'

<PlaygroundHeader 
  isToolboxInstalled={isInstalled}
  toolboxStatus={status}
  onInstallClick={handleInstall}
/>

<LocalToolboxStatusBadge 
  status="online" 
  showTooltip={true} 
/>`}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Local toolbox status monitoring</li>
                        <li>• Docker installation management</li>
                        <li>• Visual status indicators</li>
                        <li>• Interactive installation flow</li>
                        <li>• Responsive design</li>
                        <li>• Themed components</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </PlaygroundProvider>
        </div>
      </div>
    </div>
  );
}
