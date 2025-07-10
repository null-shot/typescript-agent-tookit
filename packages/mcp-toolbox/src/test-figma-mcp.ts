import WebSocket, { WebSocketServer } from 'ws'

const PROXY_PORT = 6050
const proxyServer = new WebSocketServer({ 
  port: PROXY_PORT,
  host: '0.0.0.0',
  path: '/api/remote-container/ws' 
})

console.log(`🚀 Mock MCP Proxy listening on ws://localhost:${PROXY_PORT}/api/remote-container/ws`)
console.log('💡 Now start the server with: npm run dev')

// Track test progress
let testStep = 'initial'

proxyServer.on('connection', (ws) => {
  console.log('✅ Server connected to proxy')

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString())
    console.log('📨 Received:', JSON.stringify(message, null, 2))

    // Handle client ready message
    if (message.type === 'client_ready') {
      console.log('🤝 Client ready, sending add command for Figma MCP...')
      
      // Add Figma MCP server
      setTimeout(() => {
        const addCommand = {
          verb: 'add',
          data: {
            'unique-name': 'figma-context-mcp',
            command: 'npx',
            args: ['-y', 'figma-developer-mcp', '--figma-api-key=YOUR_KEY', '--stdio'],
            env: { FIGMA_API_KEY: 'YOUR_KEY' }
          }
        }
        console.log('📤 Sending add command...')
        ws.send(JSON.stringify(addCommand))
      }, 1000)
    }

    // Handle add response - both success and "already exists" cases
    if (message.verb === 'add') {
      if (message.success) {
        console.log('✅ Figma MCP server added successfully!')
      } else if (message.error && message.error.includes('already exists')) {
        console.log('✅ Figma MCP server already exists - continuing with existing server!')
      } else {
        console.error('❌ Failed to add Figma MCP server:', message.error)
        process.exit(1)
      }
      
      // In both success and "already exists" cases, continue with tools list
      setTimeout(() => {
        const listToolsRequest = {
          jsonrpc: "2.0",
          id: "list-tools-1",
          method: "tools/list",
          params: {}
        }
        console.log('📤 Requesting tools list...')
        ws.send(JSON.stringify(listToolsRequest))
      }, 2000)
    }

    // Handle tools list response
    if (message.result && message.result.tools) {
      console.log('🛠️  Available tools:')
      message.result.tools.forEach((tool: any) => {
        console.log(`  - ${tool.name}: ${tool.description}`)
      })
      
      // Call the first file
      setTimeout(() => {
        testStep = 'first-call'
        const callToolRequest = {
          jsonrpc: "2.0",
          id: "call-tool-1",
          method: "tools/call",
          params: {
            name: "figma-context-mcp__get_figma_data",
            arguments: {
              fileKey: "YOUR_FILE_KEY"
            }
          }
        }
        console.log('🔧 Calling get_figma_data tool for first file (pONnL3bbMmaw6l2rTkcYZP)...')
        ws.send(JSON.stringify(callToolRequest))
      }, 1000)
    }

    // Handle first tool call response
    if (message.result && message.id === "call-tool-1" && testStep === 'first-call') {
      console.log('🎯 First tool call result:')
      console.log(JSON.stringify(message.result, null, 2))
      
      console.log('\n✅ First file query completed successfully!')
      console.log('⏳ Waiting 15 seconds before querying second file to test continuous MCP activity...')
      
      // Wait 15 seconds then call the second file
      setTimeout(() => {
        testStep = 'second-call'
        const callToolRequest = {
          jsonrpc: "2.0",
          id: "call-tool-2",
          method: "tools/call",
          params: {
            name: "figma-context-mcp__get_figma_data",
            arguments: {
              fileKey: "YOUR_FILE_KEY"
            }
          }
        }
        console.log('🔧 Calling get_figma_data tool for second file (nsqM7alrx8QYDw3mjYt4qh)...')
        ws.send(JSON.stringify(callToolRequest))
      }, 15000) // 15 seconds delay
    }

    // Handle second tool call response
    if (message.result && message.id === "call-tool-2" && testStep === 'second-call') {
      console.log('🎯 Second tool call result:')
      console.log(JSON.stringify(message.result, null, 2))
      
      console.log('\n🎉 Both tool calls completed successfully!')
      console.log('✅ MCP continuous activity test passed!')
      process.exit(0)
    }

    // Handle errors (but not the "already exists" case which we handle above)
    if (message.error && message.id) {
      console.error('❌ Error:', message.error)
      if (message.id === "call-tool-1") {
        console.log('First tool call failed - you may need to provide a valid Figma file ID')
        process.exit(1)
      }
      if (message.id === "call-tool-2") {
        console.log('Second tool call failed - you may need to provide a valid Figma file ID')
        process.exit(1)
      }
    }
  })

  ws.on('close', () => {
    console.log('❌ Server disconnected')
  })
})

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy...')
  proxyServer.close()
  process.exit(0)
})