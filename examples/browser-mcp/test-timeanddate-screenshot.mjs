import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WorkerSSEClientTransport } from '@nullshot/test-utils';

async function takeScreenshot() {
  console.log('📸 Taking screenshot of timeanddate.com...\n');
  
  try {
    const client = new Client({
      name: "timeanddate-screenshot-test",
      version: "1.0.0"
    });
    
    // Connect to the browser-mcp server
    const transport = new WorkerSSEClientTransport(new URL("http://127.0.0.1:8787/sse"));
    await client.connect(transport);
    
    console.log('✅ Connected to browser-mcp server');
    
    // Take screenshot of timeanddate.com
    const result = await client.callTool({
      name: "screenshot",
      arguments: {
        url: "https://www.timeanddate.com/",
        fullPage: false,
        format: "png",
        timeout: 30000
      }
    });
    
    console.log('\n🎯 SUCCESS! Screenshot captured!');
    console.log('\n📋 BASE64 SCREENSHOT DATA:');
    console.log('=' .repeat(80));
    
    // Extract the screenshot data from the response
    if (result.screenshot) {
      console.log(result.screenshot);
    } else if (result.content && result.content[0] && result.content[0].text) {
      const responseData = JSON.parse(result.content[0].text);
      if (responseData.screenshot) {
        console.log(responseData.screenshot);
      }
    }
    
    console.log('=' .repeat(80));
    console.log('\n✨ Copy the data above (starting with "data:image/png;base64,") and paste it into your screenshot viewer!');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your browser-mcp server is running with:');
    console.log('   pnpm run dev:unlimited');
  }
}

takeScreenshot().catch(console.error);
