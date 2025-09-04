#!/usr/bin/env node

// Debug script to test Puppeteer availability
console.log('🔍 Testing Puppeteer availability...');

try {
  console.log('1. Testing direct puppeteer import...');
  const puppeteerModule = await import('puppeteer');
  const puppeteer = puppeteerModule.default || puppeteerModule;
  console.log('✅ Puppeteer imported successfully');
  console.log('   - Has launch function:', typeof puppeteer.launch === 'function');
  
  console.log('2. Testing browser launch...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 10000
  });
  console.log('✅ Browser launched successfully');
  
  console.log('3. Testing page creation...');
  const page = await browser.newPage();
  console.log('✅ Page created successfully');
  
  console.log('4. Testing navigation...');
  await page.goto('https://httpbin.org/html', { 
    waitUntil: 'domcontentloaded',
    timeout: 10000 
  });
  console.log('✅ Navigation successful');
  
  console.log('5. Testing screenshot...');
  const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
  console.log(`✅ Screenshot taken: ${screenshot.length} characters`);
  
  await browser.close();
  console.log('✅ All tests passed - Puppeteer is fully functional!');
  
} catch (error) {
  console.error('❌ Puppeteer test failed:', error.message);
  console.error('   Stack:', error.stack);
}
