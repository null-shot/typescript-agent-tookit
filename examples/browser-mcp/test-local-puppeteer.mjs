import puppeteer from 'puppeteer';

async function testScreenshot() {
  console.log('🧪 Testing local Puppeteer screenshot...');
  
  try {
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('🌐 Navigating to test page...');
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
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
      console.log(`📋 Copy this to your Screenshot Viewer:\ndata:image/png;base64,${screenshot}`);
    } else {
      console.log('❌ FAILED: Screenshot too small, likely empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testScreenshot();
