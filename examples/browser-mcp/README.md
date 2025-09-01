# Browser Rendering MCP Server

A comprehensive Model Context Protocol (MCP) server that demonstrates Cloudflare Browser Rendering capabilities for web scraping, automation, and data extraction tasks.

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

### 4. Development

```bash
# Start development server with MCP Inspector
pnpm run dev

# Or start just the worker
pnpm run dev:worker-only

# Or deploy to Cloudflare Workers
pnpm run deploy
```

## Using the MCP Inspector

The Browser MCP server is perfect for testing with the MCP Inspector, which provides a visual interface for exploring and testing MCP capabilities.

### 1. Start with Inspector

```bash
pnpm run dev
```

This automatically starts both:
- **MCP Inspector** at `http://localhost:6274`
- **Browser MCP Worker** at `http://127.0.0.1:8787`

### 2. Configure Inspector

1. Open `http://localhost:6274` in your browser
2. Use the session token if prompted
3. Set transport to: **"Streamable HTTP"**
4. Enter Worker URL: `http://127.0.0.1:8787`

### 3. Explore Capabilities

#### 🔧 **8 Browser Tools Available:**
- **`navigate`** - Navigate to websites with custom viewports
- **`screenshot`** - Take visual screenshots (you can see them!)
- **`extract_text`** - Extract content using CSS selectors
- **`extract_links`** - Extract and filter links
- **`interact`** - Click, fill forms, scroll, hover
- **`wait_for`** - Wait for elements, network, conditions
- **`evaluate_js`** - Execute custom JavaScript
- **`close_session`** - Manage browser sessions

#### 📊 **5 Data Resources:**
- **`browser://sessions`** - Active browser sessions
- **`browser://status`** - System health and metrics
- **`browser://results`** - Recent scraping results
- **`browser://cache`** - Page cache statistics
- **`browser://patterns`** - Extraction patterns

#### 🧠 **3 AI Prompts:**
- **`web_scraper`** - Generate scraping strategies
- **`automation_flow`** - Create automation workflows
- **`data_extractor`** - Design extraction patterns

### 4. Recommended Test Scenarios

#### **Scenario A: Visual Web Scraping**
```json
// 1. Navigate to Hacker News
{
  "name": "navigate",
  "arguments": {
    "url": "https://news.ycombinator.com",
    "viewport": {"width": 1280, "height": 720}
  }
}

// 2. Take a screenshot (you'll see it in Inspector!)
{
  "name": "screenshot", 
  "arguments": {
    "sessionId": "<from_step_1>",
    "fullPage": false
  }
}

// 3. Extract headlines
{
  "name": "extract_text",
  "arguments": {
    "sessionId": "<from_step_1>",
    "selectors": {
      "headlines": ".titleline > a"
    },
    "multiple": true
  }
}
```

#### **Scenario B: Weather Data**
```json
// Get Hong Kong weather
{
  "name": "navigate",
  "arguments": {
    "url": "https://wttr.in/Hong+Kong?format=j1"
  }
}
```

#### **Scenario C: AI Strategy Generation**
```json
// Generate scraping strategy
{
  "name": "web_scraper",
  "arguments": {
    "url": "https://example-ecommerce.com",
    "data_requirements": "product names, prices, ratings",
    "site_type": "e-commerce",
    "complexity": "medium"
  }
}
```

### 5. Alternative Startup Options

```bash
# Start only the worker (for external Inspector)
pnpm run dev:worker-only

# Start only the Inspector (for external worker)
pnpm run dev:inspector-only

# Start locally without remote Browser Rendering
pnpm run dev:local
```

## Usage Examples

### Basic Web Scraping

```javascript
// Navigate to a website
const navResult = await mcp.call("navigate", {
  url: "https://example.com",
  viewport: { width: 1280, height: 720 },
  waitUntil: "networkidle2"
});

// Extract structured data
const extractResult = await mcp.call("extract_text", {
  sessionId: navResult.sessionId,
  selectors: {
    title: "h1, .title",
    price: ".price, .cost",
    description: ".description, .summary"
  },
  multiple: true
});

// Take a screenshot for verification
const screenshot = await mcp.call("screenshot", {
  sessionId: navResult.sessionId,
  fullPage: true,
  format: "png"
});
```

### Form Automation

```javascript
// Navigate and interact with forms
const navResult = await mcp.call("navigate", {
  url: "https://example.com/contact",
  waitUntil: "domcontentloaded"
});

// Fill and submit form
const formResult = await mcp.call("interact", {
  sessionId: navResult.sessionId,
  actions: [
    { type: "fill", selector: "#name", value: "John Doe" },
    { type: "fill", selector: "#email", value: "john@example.com" },
    { type: "fill", selector: "#message", value: "Hello from MCP!" },
    { type: "click", selector: "#submit" }
  ],
  waitBetweenActions: 500
});

// Wait for confirmation
const confirmation = await mcp.call("wait_for", {
  sessionId: navResult.sessionId,
  condition: "element",
  selector: ".success, .confirmation",
  timeout: 10000
});
```

### Multi-Page Data Extraction

```javascript
async function extractAllPages(startUrl) {
  const allData = [];
  let currentPage = 1;
  let hasNextPage = true;
  
  // Initial navigation
  const navResult = await mcp.call("navigate", {
    url: startUrl,
    viewport: { width: 1280, height: 720 }
  });
  
  while (hasNextPage) {
    // Extract data from current page
    const pageData = await mcp.call("extract_text", {
      sessionId: navResult.sessionId,
      selectors: {
        items: ".product, .item, .result",
        titles: ".title, h2, h3",
        prices: ".price, .cost"
      },
      multiple: true
    });
    
    allData.push(...pageData.data);
    
    // Check for next page
    const nextPageExists = await mcp.call("evaluate_js", {
      sessionId: navResult.sessionId,
      code: "return !!document.querySelector('.next, .pagination .next')"
    });
    
    if (nextPageExists.result) {
      // Click next page
      await mcp.call("interact", {
        sessionId: navResult.sessionId,
        actions: [{ type: "click", selector: ".next, .pagination .next" }]
      });
      
      // Wait for new content
      await mcp.call("wait_for", {
        sessionId: navResult.sessionId,
        condition: "network",
        timeout: 10000
      });
      
      currentPage++;
    } else {
      hasNextPage = false;
    }
  }
  
  return allData;
}
```

### Using Intelligent Prompts

```javascript
// Generate a scraping strategy
const strategy = await mcp.call("web_scraper", {
  url: "https://news-site.com",
  data_requirements: "article headlines, publication dates, and author names",
  site_type: "news",
  complexity: "medium"
});

// Create an automation workflow
const workflow = await mcp.call("automation_flow", {
  task_description: "search for products and compare prices",
  starting_url: "https://shop.example.com",
  data_inputs: JSON.stringify({ searchTerm: "laptop" })
});

// Design extraction patterns
const patterns = await mcp.call("data_extractor", {
  url: "https://ecommerce.example.com/products",
  data_structure: "list of products with name, price, rating, and image",
  output_format: "json",
  pagination: "true"
});
```

## Resource Management

### Browser Sessions
Access session information:
- `browser://sessions` - List all sessions
- `browser://sessions/{sessionId}` - Get specific session details

### Scraping Results
View extraction history:
- `browser://results` - Recent scraping results and statistics
- `browser://results/{url}` - Results for specific URL

### Page Cache
Manage cached content:
- `browser://cache` - Cache statistics and management
- `browser://cache/{url}` - Cached content for specific URL

### Extraction Patterns
Reusable patterns:
- `browser://patterns` - All extraction patterns
- `browser://patterns/{domain}` - Patterns for specific domain

### System Status
Monitor health:
- `browser://status` - System health and configuration

## Configuration Options

### Environment Variables

```jsonc
{
  "vars": {
    "MAX_CONCURRENT_SESSIONS": "5",      // Maximum browser sessions
    "SESSION_TIMEOUT_MS": "300000",      // Session timeout (5 minutes)
    "CACHE_TTL_HOURS": "24",            // Cache time-to-live
    "MAX_PAGE_SIZE_MB": "10"            // Maximum cached page size
  }
}
```

### Browser Options
- **Viewport**: Customizable browser viewport size
- **User Agent**: Custom user agent strings
- **Wait Conditions**: Various wait strategies (load, networkidle, etc.)
- **Timeouts**: Configurable timeouts for all operations
- **Cookies**: Session cookie management

## API Endpoints

### Health & Status
- `GET /` - Service information and capabilities
- `GET /health` - Health check endpoint
- `GET /status` - Detailed status with metrics
- `POST /maintenance` - Trigger maintenance tasks

### MCP Protocol
- `POST /mcp` - Main MCP protocol endpoint
- `GET /mcp/ws` - WebSocket upgrade for MCP (if supported)

## Performance & Best Practices

### Session Management
- Reuse sessions when possible to avoid setup overhead
- Close sessions when done to free resources
- Monitor session limits and implement queuing if needed
- Use session timeouts to prevent resource leaks

### Caching Strategy
- Enable page caching for repeated visits
- Set appropriate TTL values for your use case
- Monitor cache size and implement cleanup
- Use selective caching for large pages

### Respectful Scraping
- Implement delays between requests
- Respect robots.txt and terms of service
- Use appropriate user agents
- Monitor and limit concurrent requests
- Implement exponential backoff for errors

### Error Handling
- Always use try/catch blocks
- Implement retry logic with backoff
- Capture screenshots on errors for debugging
- Log detailed error information
- Gracefully handle network timeouts

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
│    (Puppeteer + Session Management)    │
├─────────────────────────────────────────┤
│           Repository Layer              │
│      (D1 Database + R2 Cache)          │
├─────────────────────────────────────────┤
│       Cloudflare Workers Runtime       │
│   (Browser Rendering + D1 + R2)        │
└─────────────────────────────────────────┘
```

## Development

### Project Structure
```
src/
├── index.ts           # Main Worker entry point
├── server.ts          # MCP server implementation  
├── browser-manager.ts # Browser session management
├── repository.ts      # Data storage layer
├── tools.ts           # MCP tools implementation
├── resources.ts       # MCP resources
├── prompts.ts         # Intelligent prompts
└── schema.ts          # Data models and types
```

### Testing
```bash
# Run tests (24 tests with 100% success rate)
pnpm test

# Run tests in watch mode
pnpm run test:watch
```

### Deployment
```bash
# Deploy to Cloudflare Workers
pnpm run deploy

# Deploy with specific environment
wrangler deploy --env production
```

## Troubleshooting

### Common Issues

**Session not found errors**:
- Sessions may timeout after inactivity
- Check session ID validity
- Implement session recreation logic

**Navigation timeouts**:
- Increase timeout values for slow sites
- Use appropriate wait conditions
- Check for JavaScript-heavy pages

**Extraction returns empty results**:
- Verify selectors are correct
- Wait for dynamic content to load
- Check for anti-bot measures

**Memory or resource limits**:
- Close unused sessions promptly
- Implement session pooling
- Monitor resource usage

### Debug Mode
Enable verbose logging by setting environment variables:
```bash
DEBUG=true wrangler dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

For more examples and advanced usage, check the `/test` directory and the MCP protocol documentation.
