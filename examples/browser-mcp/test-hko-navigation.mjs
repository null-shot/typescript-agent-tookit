#!/usr/bin/env node

// Test navigation to HKO website directly with Puppeteer
import puppeteer from 'puppeteer';

async function testHKONavigation() {
  console.log('🧪 Testing navigation to HKO website with local Puppeteer...');
  
  let browser = null;
  let page = null;
  
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      timeout: 30000
    });
    
    console.log('📄 Creating new page...');
    page = await browser.newPage();
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('🌐 Navigating to HKO website...');
    const startTime = Date.now();
    
    // Try with different timeout and wait conditions
    await page.goto('https://www.hko.gov.hk/en/gts/time/clock_e.html', {
      waitUntil: 'domcontentloaded', // Less strict than networkidle2
      timeout: 60000 // 60 second timeout
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Navigation completed in ${loadTime}ms`);
    
    // Get page title to verify it loaded
    const title = await page.title();
    console.log('📋 Page title:', title);
    
    // Get page URL to verify redirect handling
    const currentUrl = page.url();
    console.log('🔗 Current URL:', currentUrl);
    
    // Take a screenshot to verify content loaded
    console.log('📸 Taking screenshot...');
    const screenshot = await page.screenshot({ 
      type: 'png',
      fullPage: false // Just viewport
    });
    
    console.log(`📊 Screenshot size: ${screenshot.length} bytes`);
    console.log('✅ HKO navigation test completed successfully!');
    
  } catch (error) {
    console.error('❌ HKO navigation failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Timeout suggestions:');
      console.log('  - HKO website might be slow or blocking automated browsers');
      console.log('  - Network connectivity issues');
      console.log('  - Try with different waitUntil conditions');
    }
  } finally {
    if (page) {
      console.log('🧹 Closing page...');
      await page.close();
    }
    if (browser) {
      console.log('🧹 Closing browser...');
      await browser.close();
    }
  }
}

testHKONavigation();
