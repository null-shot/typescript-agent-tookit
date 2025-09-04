# Testing Alternatives to Bypass Browser Rendering Quota

## 🚨 **Problem**: 10-Minute Daily Quota Limit

Cloudflare Browser Rendering has a 10-minute daily limit on the free tier, which severely limits development and testing.

## ✅ **Solutions Available**

### **1. 🖥️ Local Puppeteer Mode (Recommended)**

**Setup:**
```bash
# Install Puppeteer locally
npm install puppeteer

# Set environment variable to use local mode
export BROWSER_MODE=local_puppeteer

# Deploy with local testing mode
npm run deploy
```

**Benefits:**
- ✅ **Unlimited testing time**
- ✅ **Faster response times** (no network latency)
- ✅ **Full real browser functionality**
- ✅ **Perfect for development and testing**
- ✅ **Works with MCP Inspector**

**How it works:**
- Uses your locally installed Chrome/Chromium
- Bypasses Cloudflare Browser Rendering entirely
- Full Puppeteer API compatibility
- Real DOM rendering and JavaScript execution

### **2. ☁️ Cloudflare Puppeteer Mode (Alternative)**

**Setup:**
```bash
# Set environment variable
export BROWSER_MODE=cloudflare_puppeteer

# Deploy
npm run deploy
```

**Benefits:**
- ✅ **Unlimited local testing**
- ✅ **Uses Cloudflare's Puppeteer library**
- ✅ **Good for development**

### **3. 🧪 Mock Browser Mode (Development Only)**

**Setup:**
```bash
# Automatically enabled when no browser available
# OR force it with:
export BROWSER_MODE=mock

# Deploy
npm run deploy
```

**Benefits:**
- ✅ **No dependencies required**
- ✅ **Fast response times**
- ❌ **Returns mock data only** (not real extraction)
- ✅ **Good for MCP protocol testing**

## 🎯 **Recommended Setup for MCP Inspector Testing**

### **Step 1: Install Puppeteer**
```bash
cd examples/browser-mcp
npm install puppeteer
```

### **Step 2: Enable Local Mode**
Add to your `wrangler.jsonc`:
```json
{
  "vars": {
    "BROWSER_MODE": "local_puppeteer",
    "MAX_CONCURRENT_SESSIONS": "5",
    "SESSION_TIMEOUT_MS": "300000"
  }
}
```

### **Step 3: Deploy**
```bash
npm run deploy
```

### **Step 4: Test in MCP Inspector**
Now you can use MCP Inspector unlimited times with:
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "date_info": "body",
    "temperature": "body"
  },
  "timeout": 15000
}
```

## 📊 **Mode Comparison**

| Mode | Quota Limit | Speed | Real Browser | Best For |
|------|-------------|-------|--------------|----------|
| **Browser Rendering** | 10 min/day | Medium | ✅ Yes | Production |
| **Local Puppeteer** | ♾️ Unlimited | Fast | ✅ Yes | **Development** |
| **Cloudflare Puppeteer** | ♾️ Unlimited | Fast | ✅ Yes | Testing |
| **Mock Browser** | ♾️ Unlimited | Fastest | ❌ Mock | Protocol Testing |

## 🔄 **Switching Between Modes**

You can dynamically switch modes by changing the `BROWSER_MODE` environment variable:

```bash
# For unlimited local testing
wrangler secret put BROWSER_MODE --env production
# Enter: local_puppeteer

# For production with real Browser Rendering
wrangler secret put BROWSER_MODE --env production  
# Enter: production

# For mock testing
wrangler secret put BROWSER_MODE --env production
# Enter: mock
```

## 🎉 **Result**

With Local Puppeteer mode, you get:
- ✅ **Unlimited MCP Inspector testing**
- ✅ **Real browser extraction from HKO, httpbin, any site**
- ✅ **No quota worries during development**
- ✅ **Perfect for testing and demonstrations**

**Switch to `local_puppeteer` mode and test as much as you want!** 🚀
