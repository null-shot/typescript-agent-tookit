#!/usr/bin/env node

/**
 * Simple test script to demonstrate unlimited local Puppeteer mode
 */

console.log('🚀 Testing Local Puppeteer Implementation...\n');

// Test the LocalPuppeteerManager directly
async function testLocalPuppeteer() {
  try {
    // Dynamic import of our LocalPuppeteerManager
    const { LocalPuppeteerManager } = await import('./src/local-puppeteer-manager.js');
    
    // Check if Puppeteer is available
    const isAvailable = await LocalPuppeteerManager.isAvailable();
    console.log(`✅ Puppeteer availability: ${isAvailable ? 'Available' : 'Not available'}`);
    
    if (!isAvailable) {
      console.log('💡 Install Puppeteer for unlimited testing: npm install puppeteer');
      return;
    }
    
    // Create a mock environment
    const mockEnv = {
      SESSION_TIMEOUT_MS: '300000',
      MAX_CONCURRENT_SESSIONS: '5'
    };
    
    // Test LocalPuppeteerManager
    console.log('\n📊 Testing LocalPuppeteerManager...');
    const browserManager = new LocalPuppeteerManager(mockEnv);
    
    // Test session creation
    const sessionId = `test_${Date.now()}`;
    const options = {
      url: 'https://httpbin.org/html',
      viewport: { width: 1280, height: 720 },
      timeout: 30000
    };
    
    console.log(`Creating session: ${sessionId}`);
    const page = await browserManager.createSession(sessionId, options);
    
    // Test basic operations
    const title = await page.title();
    const url = page.url();
    
    console.log(`✅ Page title: ${title}`);
    console.log(`✅ Page URL: ${url}`);
    
    // Test session management
    const sessions = await browserManager.listSessions();
    console.log(`✅ Active sessions: ${sessions.length}`);
    
    // Get browser info
    const browserInfo = await browserManager.getBrowserInfo();
    console.log(`✅ Browser type: ${browserInfo.type}`);
    console.log(`✅ Session count: ${browserInfo.sessionCount}`);
    
    // Cleanup
    await browserManager.closeSession(sessionId);
    await browserManager.cleanup();
    
    console.log('\n🎉 Local Puppeteer test completed successfully!');
    console.log('💡 This demonstrates unlimited browser automation without quota limits.');
    
  } catch (error) {
    console.error('❌ Error testing LocalPuppeteerManager:', error.message);
    
    if (error.message.includes('npm install puppeteer')) {
      console.log('\n💡 To enable unlimited testing:');
      console.log('   npm install puppeteer');
      console.log('   pnpm run dev:unlimited');
    }
  }
}

testLocalPuppeteer().catch(console.error);
