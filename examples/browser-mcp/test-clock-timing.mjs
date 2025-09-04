#!/usr/bin/env node

/**
 * Test script to demonstrate timing issues with the HKO clock
 * This shows the difference between different wait strategies
 */

import puppeteer from '@cloudflare/puppeteer';

const url = 'https://www.hko.gov.hk/en/gts/time/clock_e.html';

async function testClockTiming() {
  console.log('🧪 Testing HKO Clock Timing Issues');
  console.log('=' .repeat(50));
  
  // Mock browser for local testing
  const mockBrowser = {
    newPage: async () => ({
      setViewport: async () => {},
      goto: async (url, options) => {
        console.log(`📍 Navigating to: ${url}`);
        console.log(`⏱️  Wait strategy: ${options?.waitUntil || 'load'}`);
        console.log(`⏰ Timeout: ${options?.timeout || 30000}ms`);
        
        // Simulate different loading times
        const waitTime = options?.waitUntil === 'networkidle2' ? 3000 : 
                        options?.waitUntil === 'networkidle0' ? 5000 : 
                        options?.waitUntil === 'load' ? 2000 : 1000;
        
        console.log(`⏳ Simulating ${waitTime}ms wait...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        console.log('✅ Navigation complete');
      },
      screenshot: async (options) => {
        console.log(`📸 Taking screenshot (${options?.type || 'png'})`);
        return 'mock-base64-data';
      },
      title: async () => 'Web Clock｜Hong Kong Observatory(HKO)｜Time Services',
      url: () => url,
      close: async () => console.log('🔒 Page closed')
    }),
    close: async () => console.log('🔒 Browser closed')
  };

  const page = await mockBrowser.newPage();
  
  console.log('\n🔍 Test 1: domcontentloaded (current default)');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.screenshot({ type: 'png' });
  console.log('❌ Clock likely not loaded yet (JavaScript still executing)');
  
  console.log('\n🔍 Test 2: networkidle2 (better for dynamic content)');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.screenshot({ type: 'png' });
  console.log('✅ Clock more likely to be loaded (network activity settled)');
  
  console.log('\n🔍 Test 3: networkidle0 (most thorough)');
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ type: 'png' });
  console.log('✅ Clock should definitely be loaded (no network activity)');
  
  await page.close();
  await mockBrowser.close();
  
  console.log('\n💡 Recommendations:');
  console.log('1. Change default waitUntil from "domcontentloaded" to "networkidle2"');
  console.log('2. Add explicit wait for clock element before screenshot');
  console.log('3. Consider adding a small delay after navigation for dynamic content');
  console.log('\n🔧 The clock issue is likely due to JavaScript loading after DOM ready');
}

testClockTiming().catch(console.error);
