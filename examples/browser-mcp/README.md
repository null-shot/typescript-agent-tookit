# Browser Rendering MCP Server

A comprehensive Model Context Protocol (MCP) server that demonstrates Cloudflare Browser Rendering capabilities for web scraping, automation, and data extraction tasks.

## ⚠️ IMPORTANT: Browser Rendering Quota Limits

**🚨 Cloudflare Browser Rendering has quota limits that apply to ALL usage:**

- **Free Plan:** 10 minutes/day
- **Pro Plan:** 1000 minutes/month
- **Business/Enterprise:** Higher limits available

- ✅ **Development (`pnpm dev`)** → Uses quota
- ✅ **Production deployment** → Uses quota  
- ✅ **Local development (`wrangler dev`)** → **STILL uses quota!**
- ⚠️ **No unlimited local testing available** - all browser automation counts against your daily limit

**Quota Behavior:**
- **Daily Reset:** Quota resets every 24 hours (typically midnight UTC)
- **Account-Wide:** Shared across all workers in your Cloudflare account
- **Error Message:** `"Browser Rendering quota exceeded"` or `"Browser time limit exceeded for today"`

**Development Strategy:**
- Use quota sparingly during development
- Save quota for final testing and demos
- Consider using mock data for iterative development

## Features

### 🌐 Browser Automation Tools
- **navigate** - Navigate to URLs with customizable options (viewport, user agent, wait conditions)
- **screenshot** - Capture full page or element screenshots in multiple formats
- **extract_text** - Extract text content using CSS selectors or full page
- **extract_links** - Extract all links with filtering options (internal/external, text matching)
- **close_session** - Manage browser session lifecycle

### 📊 Session & Data Management
- **Browser Sessions** - Persistent browser sessions with metadata tracking
- **Page Cache** - R2-based caching of page content with TTL management
- **Extraction History** - Durable Object SQLite storage of all scraping results
- **Extraction Patterns** - Reusable extraction patterns for different websites



## Quick Start

### 1. Installation

```bash
cd examples/browser-mcp
pnpm install
```

### 2. Account Configuration

#### **Step 1: Get Your Account ID**
```bash
# Check your account details
wrangler whoami
```
Note the **Account ID** from the output.

#### **Step 2: Update wrangler.jsonc**
Update `wrangler.jsonc` with your account ID:

```jsonc
{
  "account_id": "your-account-id-here"
}
```

### 3. Register Workers.dev Subdomain (Required)

⚠️ **Before running `pnpm dev`, you MUST register a workers.dev subdomain:**

#### 🔍 **Why Subdomain Registration is Required:**

**Wrangler Dev Modes:**

**`wrangler dev` (Local Mode)**
- **Runtime:** Local Workerd runtime on your machine
- **Bindings:** Mock/simulated bindings (limited functionality)
- **Browser Rendering:** ❌ **Not available** - no MYBROWSER binding
- **Speed:** ⚡ Faster startup, instant deploys
- **Use Case:** Basic testing without external services

**`wrangler dev --remote` (Remote Mode)**
- **Runtime:** Cloudflare's edge runtime (real environment)
- **Bindings:** ✅ **Real bindings** - Durable Objects, Browser Rendering, R2, etc.
- **Browser Rendering:** ✅ **Available** - real MYBROWSER binding
- **Speed:** 🐌 Slower startup, requires workers.dev subdomain
- **Use Case:** Full testing with real Cloudflare services

#### 🎯 **For Browser MCP:**
**You MUST use `--remote` because:**
- Browser Rendering only works in remote mode
- Local mode has no MYBROWSER binding
- Your tools need real Cloudflare services

#### 📋 **Step-by-Step Subdomain Registration:**

1. **Open Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com/
   - Login with your Cloudflare account

2. **Navigate to Workers**
   - **Left panel:** Click **"Compute (Workers)"**
   - **Main area:** Click **"Get Started"** for **"Start with Hello World"** option

3. **Register Your Subdomain**
   - **Choose a subdomain** like `yourname.workers.dev` (free)
   - **Complete the setup** process

4. **Verification**
   - **No config changes needed** - Wrangler automatically detects your registered subdomain
   - **Ready to run:** `pnpm dev` will now work without the subdomain error

**Alternative:** Use a deployed worker URL for testing (see Production Deployment section)

### 5. Pre-Development Checklist

✅ **Before running `pnpm dev`, ensure you have completed:**

1. ✅ **Cloudflare Account** - Registered and logged in with `wrangler login`
2. ✅ **Workers.dev Subdomain** - Registered via Compute (Workers) → Get Started → Hello World
3. ✅ **Account ID** - Added to `wrangler.jsonc` (get with `wrangler whoami`)
4. ✅ **Durable Objects** - SQLite storage automatically configured
5. ✅ **Dependencies** - Installed with `pnpm install`

⚠️ **If any step is missing, `pnpm dev` will fail with authentication or configuration errors.**

### 6. Development Options

⚠️ **All options below use your Browser Rendering quota:**

#### **🚀 Full Development Stack (Recommended)**
```bash
# Start both MCP Inspector + Worker (USES QUOTA)
pnpm dev
```
**Uses:** Browser Rendering quota (10min/day)  
**Benefits:** Complete testing environment with visual interface

#### **☁️ Worker Only**
```bash
# Start just the worker (USES QUOTA)
pnpm run dev:worker-only
```
**Uses:** Browser Rendering quota (10min/day)  
**Benefits:** Worker testing without inspector overhead

#### **🧪 Inspector Only**
```bash
# Start just MCP Inspector (no quota usage)
pnpm run dev:inspector-only
```
**Uses:** No quota (connect to remote workers)  
**Benefits:** Test against deployed workers

#### **🚀 Deploy to Production**
```bash
pnpm run deploy
```

## Using the MCP Inspector

### Connection Options

#### **Option 1: Local Development (Uses Quota)**
```
Transport: SSE
URL: http://localhost:8787/sse
```
**Pros:** Local development, faster iteration  
**Cons:** Uses your Browser Rendering quota

#### **Option 2: Remote Production (Uses Quota)**
```
Transport: SSE  
URL: https://your-worker.workers.dev/sse
```
**Pros:** Production environment testing  
**Cons:** Uses your Browser Rendering quota

### Screenshot Tool Example

The screenshot tool returns base64-encoded image data that displays directly in MCP Inspector and can be easily viewed using an HTML viewer:

#### **Step 1: Take a Screenshot**

**Tool:** `screenshot`  
**URL:** `https://www.weather.gov.hk/en/wxinfo/currwx/fnd.htm`  
**Full Page:** `false`  
**Timeout:** `60000`

#### **Step 2: View the Result**
The tool returns an HTML display with the screenshot embedded, plus raw base64 data.

#### **Step 3: Easy Viewing with HTML Viewer**
**Simplest method** - Copy the HTML output and paste into any HTML viewer:

1. **Copy the HTML output** from the MCP Inspector result
2. **Visit** [https://html.onlineviewer.net/](https://html.onlineviewer.net/) 
3. **Paste the HTML code** and view instantly
4. **See the live screenshot** with all metadata

#### **Real Test Results:**
Using Hong Kong Observatory weather page, you can see:
- **Live weather data** (32.1°C, 65% humidity at 11:20)
- **Current date** (3 Sep 2025, Wed)
- **9-day forecast** with real temperatures
- **Screenshot metadata** (Format: png, Size: 80KB, Full page: No)

**Key Benefits:**
- ✅ **Instant viewing** - No download or conversion needed
- 📱 **Mobile friendly** - Works on any device with a browser
- 🔍 **Full quality** - See the screenshot exactly as captured
- 📊 **Rich metadata** - Format, size, and capture settings included
- 🕒 **Real-time verification** - Timestamps and live data prove authenticity

### Extract Links Tool Example

The extract_links tool provides powerful link extraction with **strict filtering** that only matches visible link text or URLs:

#### **Step 1: Extract Links with Container Filter**

**Tool:** `extract_links`  
**URL:** `https://github.com/null-shot/typescript-agent-framework/pulls?q=is%3Apr+`  
**Filter:** `container`  
**Timeout:** `60000`

#### **Step 2: View the Enhanced Results**
The tool returns a rich HTML display with organized link information.

#### **Real Test Results:**
```
🔗 Extracted Links from https://github.com/null-shot/typescript-agent-framework/pulls?q=is%3Apr+

Filters applied: Filter: "container"

[Total: 2] [Internal: 2] [External: 0]

[1] Internal | github.com
    https://github.com/null-shot/typescript-agent-framework/pull/80
    "🐛 Incorrect endpoint for remote container"

[2] Internal | github.com  
    https://github.com/null-shot/typescript-agent-framework/pull/75
    "Docker Container Is Not Running"
```



## Error Handling

### Expected Quota Errors

When you hit the quota limit, you'll see:

```json
{
  "error": *** : Browser Rendering quota exceeded."
}
```

**This is normal and expected behavior!**

### Troubleshooting

**"Quota exceeded" errors:**
- ✅ **Expected** - you've used your daily 10-minute limit
- ⏰ **Solution** - Wait for daily reset (typically midnight UTC)
- 🔄 **Alternative** - Try different Cloudflare account if available



**MCP timeout errors:**
- If you see `"MCP error -32001: Request timed out"`:
  - ✅ **Try again** - Often resolves on retry (most effective solution)
  - ⏱️ **Increase timeout** - Add larger `timeout` value (e.g., `10000` for 10 seconds)


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.