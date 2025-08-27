// Test script to inspect CRUD MCP tools
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function testCRUDTools() {
  try {
    console.log("Testing CRUD MCP server...");
    console.log("Creating SSE transport...");
    const transport = new SSEClientTransport(new URL("http://127.0.0.1:8788"));
    
    console.log("Creating client...");
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    console.log("Connecting to CRUD server...");
    await client.connect(transport);

    console.log("Listing CRUD tools...");
    const tools = await client.listTools();
    console.log("CRUD Available tools:", JSON.stringify(tools, null, 2));

    console.log("Getting tool info for create_todo...");
    const createTodoTool = tools.tools.find(t => t.name === 'create_todo');
    if (createTodoTool) {
      console.log("create_todo tool schema:", JSON.stringify(createTodoTool, null, 2));
    } else {
      console.log("create_todo tool not found!");
    }

    await client.close();
  } catch (error) {
    console.error("CRUD Test failed:", error);
  }
}

testCRUDTools(); 