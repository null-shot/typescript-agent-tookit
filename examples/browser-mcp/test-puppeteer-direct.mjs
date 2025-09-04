import puppeteer from 'puppeteer';

async function testPuppeteer() {
  try {
    console.log('🚀 Launching Puppeteer...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Browser launched successfully');
    
    const page = await browser.newPage();
    await page.goto('https://www.timeanddate.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded');
    
    const screenshot = await page.screenshot({ 
      type: 'png', 
      encoding: 'base64',
      fullPage: false 
    });
    
    console.log('✅ Screenshot taken! Length:', screenshot.length);
    console.log('📋 BASE64 SCREENSHOT DATA:');
    console.log('=' .repeat(80));
    console.log(`data:image/png;base64,${screenshot}`);
    console.log('=' .repeat(80));
    
    await browser.close();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPuppeteer();
