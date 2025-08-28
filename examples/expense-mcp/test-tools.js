// Test script to inspect MCP tools
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function testMCPTools() {
  try {
    console.log("Creating SSE transport...");
    const transport = new SSEClientTransport(new URL("http://127.0.0.1:8787"));
    
    console.log("Creating client...");
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    console.log("Connecting to server...");
    await client.connect(transport);

    console.log("Listing tools...");
    const tools = await client.listTools();
    console.log("Available tools:", JSON.stringify(tools, null, 2));

    console.log("Getting tool info for submitExpense...");
    const submitExpenseTool = tools.tools.find(t => t.name === 'submitExpense');
    if (submitExpenseTool) {
      console.log("submitExpense tool schema:", JSON.stringify(submitExpenseTool, null, 2));
    } else {
      console.log("submitExpense tool not found!");
    }

    console.log("Testing submitExpense call...");
    try {
      const result = await client.callTool({
        name: "submitExpense",
        arguments: {
          user: "Test User",
          amount: 100.50,
          description: "Test expense"
        }
      });
      console.log("submitExpense result:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error calling submitExpense:", error);
    }

    await client.close();
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testMCPTools(); 