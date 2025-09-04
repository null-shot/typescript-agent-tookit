# Browser MCP Architecture

## Overview

The Browser MCP (Model Context Protocol) example demonstrates how to build a Cloudflare Worker that implements MCP for browser automation and web scraping. It provides tools for navigation, screenshot capture, text extraction, and web interaction through a standardized protocol interface.

## Architecture Components

### 1. Core Infrastructure

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  Browser MCP     │───▶│  Cloudflare     │
│   (Inspector)   │    │     Worker       │    │ Browser Service │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   D1 Database    │
                       │  (Session Data)  │
                       └──────────────────┘
```

### 2. Key Files Structure

```
examples/browser-mcp/
├── src/
│   ├── index.ts           # Main worker entry point
│   ├── server.ts          # MCP server implementation
│   ├── tools.ts           # Browser automation tools
│   ├── repository.ts      # Data persistence layer
│   ├── resources.ts       # MCP resource definitions
│   ├── schema.ts          # TypeScript interfaces
│   └── browser-manager.ts # Browser session management
├── wrangler.jsonc         # Cloudflare Worker configuration
└── package.json           # Dependencies and scripts
```

## Core Components

### 1. MCP Server (`server.ts`)

- **Purpose**: Implements the Model Context Protocol interface
- **Responsibilities**:
  - Handle MCP protocol messages
  - Route tool calls to appropriate handlers
  - Manage server lifecycle and capabilities
- **Key Features**:
  - Tool registration and discovery
  - Resource management
  - Error handling and logging

### 2. Browser Tools (`tools.ts`)

Provides five main browser automation tools:

#### Navigation Tool
- **Function**: `navigate`
- **Purpose**: Navigate to URLs with configurable options
- **Features**:
  - Viewport configuration
  - User agent customization  
  - Wait strategies (`domcontentloaded`, `networkidle2`, etc.)
  - Session management

#### Screenshot Tool
- **Function**: `screenshot`
- **Purpose**: Capture page screenshots
- **Features**:
  - Full page or element-specific screenshots
  - Multiple formats (PNG, JPEG, WebP)
  - Quality settings
  - Dynamic content waiting
  - **Clock Timing Fix**: Added `networkidle2` default and wait delays for JavaScript-heavy content

#### Text Extraction Tool
- **Function**: `extract_text`
- **Purpose**: Extract text content using CSS selectors
- **Features**:
  - Single or multiple field extraction
  - CSS selector support with fallbacks
  - HTML attribute extraction
  - Element waiting mechanisms

#### Interaction Tool
- **Function**: `interact`
- **Purpose**: Perform user interactions (click, type, etc.)
- **Features**:
  - Multiple action types
  - Action sequencing
  - Wait conditions between actions

#### Wait Tool
- **Function**: `wait`
- **Purpose**: Wait for specific conditions
- **Features**:
  - Element appearance waiting
  - Network idle waiting
  - Custom timeout handling

### 3. Browser Manager (`browser-manager.ts`)

- **Purpose**: Manages Puppeteer browser sessions
- **Key Features**:
  - Session lifecycle management
  - Browser instance pooling
  - Connection handling
  - Error recovery

### 4. Data Repository (`repository.ts`)

- **Purpose**: Handles data persistence using D1 database
- **Responsibilities**:
  - Store scraping results
  - Manage session metadata
  - Query historical data
- **Storage**: Cloudflare D1 SQLite database

### 5. Schema Definitions (`schema.ts`)

Defines TypeScript interfaces for:
- `BrowserSession`: Session metadata and configuration
- `ScrapingResult`: Captured data and metadata
- `NavigationOptions`: Navigation parameters
- `ScreenshotOptions`: Screenshot configuration
- `ExtractionOptions`: Text extraction settings

## Configuration

### Cloudflare Worker Setup (`wrangler.jsonc`)

```json
{
  "name": "browser-mcp-server-v2",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "browser": {
    "binding": "MYBROWSER"
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "browser-mcp-db"
  }],
  "durable_objects": {
    "bindings": [{
      "name": "BROWSER_MCP_SERVER",
      "class_name": "BrowserMcpServer"
    }]
  }
}
```

### Key Bindings

- **MYBROWSER**: Cloudflare Browser Rendering service
- **DB**: D1 database for persistence
- **BROWSER_MCP_SERVER**: Durable Object for state management

## Data Flow

### 1. Tool Execution Flow

```
MCP Client Request
       ↓
MCP Server (server.ts)
       ↓
Tool Handler (tools.ts)
       ↓
Browser Manager (browser-manager.ts)
       ↓
Cloudflare Browser Service
       ↓
Repository (repository.ts)
       ↓
D1 Database
```

### 2. Session Management

1. **Session Creation**: Browser manager creates new Puppeteer sessions
2. **Session Reuse**: Sessions can be reused across multiple tool calls
3. **Session Cleanup**: Automatic cleanup after timeout or explicit closure
4. **State Persistence**: Session metadata stored in D1 database

## Key Improvements Made

### 1. Clock Timing Fix

**Problem**: Screenshots of dynamic content (like HKO clock) showed blank areas.

**Solution**:
- Changed default `waitUntil` from `domcontentloaded` to `networkidle2`
- Added `waitForSelector` option to wait for specific elements
- Added `waitDelay` option for additional wait time
- Implemented 2-second default delay for dynamic content

### 2. Screenshot Extraction Tool

**Problem**: Browser results were stored in nested JSON format making extraction difficult.

**Solution**:
- Created `extract-screenshots.py` script
- Handles nested JSON structure (`contents[0].text`)
- Extracts base64 screenshot data to separate files
- Provides organized filenames with timestamps and domains

### 3. MCP Inspector Compatibility

**Problem**: JSON structure errors when using MCP Inspector.

**Solution**:
- Documented correct parameter formats
- Provided working examples for each tool
- Created troubleshooting guides for common errors

## Usage Patterns

### 1. Simple Screenshot Capture

```json
{
  "url": "https://example.com",
  "selector": "body",
  "timeout": 15000
}
```

### 2. Text Extraction with Multiple Fields

```json
{
  "url": "https://example.com",
  "selectors": {
    "title": "h1, h2",
    "content": ".main-content",
    "date": "time, .date"
  }
}
```

### 3. Two-Step Process (Navigate + Extract)

```json
// Step 1: Navigate
{
  "url": "https://example.com",
  "waitUntil": "networkidle2"
}

// Step 2: Extract using session
{
  "sessionId": "session_from_step_1",
  "selector": "body"
}
```

## Limitations and Considerations

### 1. Browser Rendering Limits

- **Daily Quotas**: Cloudflare Browser Rendering has usage limits
- **Error 429**: "Browser time limit exceeded for today"
- **Solution**: Monitor usage, optimize requests, consider plan upgrades

### 2. Performance Considerations

- **Cold Starts**: Browser initialization takes time
- **Session Reuse**: Reuse sessions when possible
- **Timeout Management**: Balance between reliability and speed

### 3. Security

- **Input Validation**: All user inputs are validated
- **Error Handling**: Comprehensive error handling prevents crashes
- **Resource Limits**: Configured limits prevent abuse

## Deployment

### 1. Prerequisites

- Cloudflare account with Browser Rendering enabled
- D1 database created
- Wrangler CLI configured

### 2. Deployment Steps

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Cloudflare
npm run deploy
```

### 3. Verification

- Check browser binding is active
- Verify D1 database connection
- Test with simple MCP Inspector calls

## Future Enhancements

### 1. Caching Layer

- Implement result caching to reduce browser usage
- Cache based on URL and selector combinations
- TTL-based cache invalidation

### 2. Advanced Interactions

- Form filling automation
- File upload handling
- Multi-page workflows

### 3. Performance Optimization

- Connection pooling
- Request batching
- Intelligent session management

### 4. Monitoring and Analytics

- Usage metrics tracking
- Performance monitoring
- Error rate analysis

## Troubleshooting

### Common Issues

1. **Browser Connection Errors**: Check Browser Rendering service status
2. **Timeout Issues**: Increase timeout values or use `networkidle2`
3. **JSON Parsing Errors**: Verify MCP Inspector parameter format
4. **Rate Limiting**: Monitor daily usage quotas

### Debug Tools

- **Worker Logs**: Check Cloudflare dashboard for error logs
- **Screenshot Extraction**: Use `extract-screenshots.py` for result analysis
- **Test Scripts**: Various test files for different scenarios

## Conclusion

The Browser MCP example demonstrates a production-ready implementation of browser automation through the Model Context Protocol. It provides a robust foundation for web scraping, testing, and automation tasks while leveraging Cloudflare's serverless infrastructure for scalability and reliability.
