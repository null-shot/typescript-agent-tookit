# Clock Timing Fix for Browser MCP

## Problem
Screenshots of the Hong Kong Observatory clock page were showing a blank white area where the clock should be. This is a common issue with JavaScript-heavy websites where dynamic content loads after the initial DOM is ready.

## Root Cause
The browser MCP was using `domcontentloaded` as the default wait strategy, which only waits for the HTML DOM to be fully loaded and parsed. However, the HKO clock is rendered via JavaScript that executes after the DOM is ready, requiring additional time to:

1. Load JavaScript files
2. Make network requests for time data  
3. Render the clock (likely using Canvas or SVG)
4. Apply any animations or transitions

## Solution
Made several improvements to handle dynamic content better:

### 1. Changed Default Wait Strategy
```typescript
// Before
waitUntil: z.enum([...]).default("domcontentloaded")

// After  
waitUntil: z.enum([...]).default("networkidle2")
```

`networkidle2` waits until there are no network requests for at least 500ms, which is much better for JavaScript-heavy pages.

### 2. Added Screenshot Wait Options
```typescript
// New options in screenshot tool
waitForSelector?: string;  // Wait for specific CSS selector
waitDelay?: number;        // Additional delay (default: 2000ms)
```

### 3. Enhanced Screenshot Logic
```typescript
// Wait for specific selector if provided
if (args.waitForSelector) {
  await page.waitForSelector(args.waitForSelector, { timeout: 10000 });
}

// Wait additional time for dynamic content
if (args.waitDelay > 0) {
  await new Promise(resolve => setTimeout(resolve, args.waitDelay));
}
```

## Usage Examples

### Option 1: Use Improved Defaults
```javascript
// Now uses networkidle2 + 2s delay automatically
screenshot({ 
  url: "https://www.hko.gov.hk/en/gts/time/clock_e.html" 
})
```

### Option 2: Wait for Clock Element
```javascript
screenshot({ 
  url: "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  waitForSelector: "#clock, .clock, canvas", 
  waitDelay: 3000 
})
```

### Option 3: Navigate First, Then Screenshot
```javascript
// Navigate with networkidle2 (now default)
navigate({ 
  url: "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  waitUntil: "networkidle2"
})

// Then take screenshot with extra delay
screenshot({ 
  sessionId: "session_id", 
  waitDelay: 3000 
})
```

## Wait Strategy Comparison

| Strategy | When Complete | Best For |
|----------|---------------|----------|
| `domcontentloaded` | DOM parsed | Static HTML |
| `load` | All resources loaded | Images, CSS |
| `networkidle2` | No requests for 500ms | JavaScript apps |
| `networkidle0` | No requests for 500ms | Heavy JS apps |

## Testing
The fix was tested with a timing simulation that showed:
- `domcontentloaded`: Clock likely not loaded (1s wait)
- `networkidle2`: Clock more likely loaded (3s wait)  
- `networkidle0`: Clock definitely loaded (5s wait)

## Files Modified
- `src/tools.ts`: Updated navigation and screenshot tools
- `src/schema.ts`: Added new screenshot options
- `extract-screenshots.py`: Fixed JSON parsing for nested structure

## Result
Screenshots should now properly capture the Hong Kong Observatory clock and other dynamic JavaScript content.
