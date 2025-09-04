import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

async function takeScreenshot() {
  console.log('🚀 Launching Puppeteer...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('🌐 Navigating to timeanddate.com...');
  await page.goto('https://www.timeanddate.com/', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  console.log('📸 Taking screenshot...');
  const screenshot = await page.screenshot({ 
    type: 'png', 
    encoding: 'base64',
    fullPage: false 
  });
  
  const base64Data = `data:image/png;base64,${screenshot}`;
  
  // Save to file
  writeFileSync('timeanddate-complete.txt', base64Data);
  
  console.log(`✅ Screenshot saved! Length: ${base64Data.length} characters`);
  console.log('📂 Complete base64 data saved to: timeanddate-complete.txt');
  
  await browser.close();
}

takeScreenshot().catch(console.error);
