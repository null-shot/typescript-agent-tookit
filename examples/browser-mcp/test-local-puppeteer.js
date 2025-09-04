const puppeteer = require('puppeteer');

async function testScreenshot() {
  console.log('🧪 Testing local Puppeteer screenshot...');
  
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('🌐 Navigating to test page...');
    await page.goto('https://httpbin.org/html', { waitUntil: 'networkidle2' });
    
    console.log('📸 Taking screenshot...');
    const screenshot = await page.screenshot({ 
      type: 'png', 
      encoding: 'base64',
      fullPage: false 
    });
    
    console.log('✅ Screenshot taken! Length:', screenshot.length);
    console.log('📋 First 100 chars:', screenshot.substring(0, 100));
    
    await browser.close();
    
    if (screenshot.length > 1000) {
      console.log('🎉 SUCCESS: Real screenshot captured!');
    } else {
      console.log('❌ FAILED: Screenshot too small, likely empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testScreenshot();
