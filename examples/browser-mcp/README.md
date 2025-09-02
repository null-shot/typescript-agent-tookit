# Browser Rendering MCP Server

A comprehensive Model Context Protocol (MCP) server that demonstrates Cloudflare Browser Rendering capabilities for web scraping, automation, and data extraction tasks.

## ⚠️ IMPORTANT: Browser Rendering Quota Limits

**🚨 Cloudflare Browser Rendering has a 10-minute daily quota limit that applies to ALL usage:**

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
- **interact** - Perform browser interactions (click, fill forms, hover, scroll, evaluate JS)
- **wait_for** - Wait for elements, network idle, timeouts, or custom conditions
- **evaluate_js** - Execute custom JavaScript code in browser context
- **close_session** - Manage browser session lifecycle

### 📊 Session & Data Management
- **Browser Sessions** - Persistent browser sessions with metadata tracking
- **Page Cache** - R2-based caching of page content with TTL management
- **Extraction History** - D1 database storage of all scraping results
- **Extraction Patterns** - Reusable extraction patterns for different websites

### 🤖 Intelligent Prompts
- **web_scraper** - Generate comprehensive scraping strategies for any website
- **automation_flow** - Create step-by-step browser automation workflows
- **data_extractor** - Design extraction patterns for structured data

### 📈 Monitoring & Analytics
- Real-time session monitoring and health checks
- Scraping statistics and performance metrics
- Automated cleanup of idle sessions and expired cache
- Comprehensive error handling and logging

## Quick Start

### 1. Installation

```bash
cd examples/browser-mcp
pnpm install
```

### 2. Configuration

Update `wrangler.jsonc` with your database and bucket IDs:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "browser-mcp-db",
      "database_id": "your-database-id-here"
    }
  ],
  "r2_buckets": [
    {
      "binding": "CACHE_BUCKET",
      "bucket_name": "your-bucket-name"
    }
  ]
}
```

### 3. Database Setup

Create and migrate your D1 database:

```bash
# Create database
wrangler d1 create browser-mcp-db

# Run migrations (tables will be created automatically on first run)
wrangler d1 migrations apply browser-mcp-db --local
```

### 4. Development Options

⚠️ **All options below use the same 10-minute daily quota:**

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
**Cons:** Uses your daily 10-minute quota

#### **Option 2: Remote Production (Uses Quota)**
```
Transport: SSE  
URL: https://your-worker.workers.dev/sse
```
**Pros:** Production environment testing  
**Cons:** Uses your daily 10-minute quota



### Quota Management Tips

1. **🎯 Focus Your Testing**
   - Plan your tests carefully
   - Use simple pages (e.g., `httpbin.org/html`) for basic functionality
   - Save complex sites for final validation

2. **⏰ Time Your Usage**
   - Check when your quota resets (typically midnight UTC)
   - Do intensive testing right after reset
   - Monitor remaining quota throughout the day

3. **🔄 Efficient Development**
   - Use the same browser session for multiple operations
   - Test tool logic with simple pages first
   - Validate selectors on lightweight sites

### Recommended Test Workflow

```json
// 1. Simple navigation test (minimal quota usage)
{
  "name": "navigate",
  "arguments": {
    "url": "https://httpbin.org/html",
    "timeout": 15000
  }
}

// 2. Take screenshot to verify it's working (check the current time!)
{
  "name": "screenshot", 
  "arguments": {
    "url": "https://www.timeanddate.com/",
    "fullPage": false,
    "timeout": 20000
  }
}

// 3. Extract text content
{
  "name": "extract_text",
  "arguments": {
    "url": "https://httpbin.org/html",
    "selectors": {
      "title": "h1",
      "content": "p"
    },
    "timeout": 15000
  }
}

// 4. Test with a real website (uses more quota)
{
  "name": "extract_text",
  "arguments": {
    "url": "https://news.ycombinator.com",
    "selectors": {
      "headlines": ".titleline > a"
    },
    "multiple": true,
    "timeout": 20000
  }
}
```

## Error Handling

### Expected Quota Errors

When you hit the quota limit, you'll see:

```json
{
  "error": "Navigation failed: Failed to create Cloudflare Puppeteer session session_xxx: Browser Rendering quota exceeded. Try the remote version: https://browser-mcp-server.raycoderhk.workers.dev/sse"
}
```

**This is normal and expected behavior!**

### Troubleshooting

**"Quota exceeded" errors:**
- ✅ **Expected** - you've used your daily 10-minute limit
- ⏰ **Solution** - Wait for daily reset (typically midnight UTC)
- 🔄 **Alternative** - Try different Cloudflare account if available

**Session timeout errors:**
- Sessions timeout after 5 minutes of inactivity
- Create new sessions as needed
- Close sessions when done to free resources

## Architecture

```
┌─────────────────────────────────────────┐
│           Browser MCP Server            │
├─────────────────────────────────────────┤
│  Tools: navigate, screenshot, extract,  │
│         interact, wait_for, evaluate    │
├─────────────────────────────────────────┤
│  Resources: sessions, results, cache,   │
│            patterns, status             │
├─────────────────────────────────────────┤
│  Prompts: web_scraper, automation_flow, │
│          data_extractor                 │
├─────────────────────────────────────────┤
│        Browser Manager                  │
│    (Cloudflare Browser Rendering)      │
├─────────────────────────────────────────┤
│           Repository Layer              │
│      (D1 Database + R2 Cache)          │
├─────────────────────────────────────────┤
│       Cloudflare Workers Runtime       │
│   (Browser Rendering + D1 + R2)        │
└─────────────────────────────────────────┘
```

## Production Deployment

### 1. Deploy Worker
```bash
pnpm run deploy
```

### 2. Test Production
```bash
# Test deployed worker
curl https://your-worker.workers.dev/health

# Test with MCP Inspector
# URL: https://your-worker.workers.dev/sse
```

### 3. Monitor Quota Usage
- Watch for quota exceeded errors
- Plan usage around daily reset times
- Consider multiple Cloudflare accounts for development teams

## Best Practices

### Quota Conservation
- **Reuse sessions** when possible to avoid setup overhead
- **Close sessions** when done to free resources  
- **Test with lightweight pages** during development
- **Batch operations** in single sessions when possible

### Respectful Scraping
- Implement delays between requests
- Respect robots.txt and terms of service
- Use appropriate user agents
- Monitor and limit concurrent requests

### Error Handling
- Always handle quota exceeded errors gracefully
- Implement retry logic for transient failures
- Log quota usage for monitoring
- Provide clear error messages to users

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes (be mindful of quota usage in testing!)
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

**Remember: The 10-minute daily quota applies to ALL Browser Rendering usage - plan your development and testing accordingly!**