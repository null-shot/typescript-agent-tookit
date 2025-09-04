# Extract Text Tool Guide - HKO Date & Time

This guide shows how to use the `extract_text` tool in MCP Inspector to extract date and time information from the Hong Kong Observatory website.

## Tool Overview

The `extract_text` tool can extract text content from web pages using CSS selectors. It supports:
- Single field extraction with `selector`
- Multiple field extraction with `selectors` object
- Waiting for elements to load with `waitForSelector`
- Extracting HTML attributes with `attribute`
- Multiple elements with `multiple: true`

## HKO Website Analysis

The HKO clock page (https://www.hko.gov.hk/en/gts/time/clock_e.html) contains:
- Current date and time display
- Weather information
- Navigation breadcrumbs

## Usage Examples in MCP Inspector

### Example 1: Extract Current Date and Time (Multiple Fields)

```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "current_date": ".date, #date, [class*='date']",
    "current_time": ".time, #time, [class*='time']", 
    "weather_temp": ".temperature, [class*='temp']",
    "weather_condition": ".weather, [class*='weather']"
  },
  "waitForSelector": "body",
  "timeout": 10000
}
```

### Example 2: Extract Page Title and All Text

```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "page_title": "title",
    "main_heading": "h1, h2",
    "breadcrumb": ".breadcrumb, nav",
    "all_text": "body"
  }
}
```

### Example 3: Extract Specific Element by ID/Class

```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "#clock, .clock-display, [id*='clock']",
  "waitForSelector": "#clock",
  "timeout": 15000
}
```

### Example 4: Extract Multiple Time Elements

```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "time, [datetime], .time, .date",
  "multiple": true,
  "attribute": "datetime"
}
```

### Example 5: Extract with Session (After Navigation)

First navigate:
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitUntil": "networkidle2"
}
```

Then extract using the session:
```json
{
  "sessionId": "your_session_id_from_navigation",
  "selectors": {
    "date": "[class*='date'], .date-display",
    "time": "[class*='time'], .time-display",
    "timezone": "[class*='timezone'], .tz"
  }
}
```

## Step-by-Step Instructions for MCP Inspector

### 1. Open MCP Inspector
- Start your browser-mcp worker
- Connect MCP Inspector to your worker endpoint

### 2. Use the extract_text Tool
- Select "extract_text" from the tools list
- Choose one of the JSON examples above
- Click "Execute"

### 3. Inspect Results
The tool will return:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "Text extraction completed successfully"
    }
  ],
  "success": true,
  "sessionId": "temp_1234567890_abcdef123",
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "extractedData": {
    "current_date": "2 Sep 2025 (Tue)",
    "current_time": "29.5°C 79% (09:00)",
    "weather_temp": "29.5°C",
    "weather_condition": "79%"
  }
}
```

## Common CSS Selectors for HKO

Based on typical website structures, try these selectors:

```javascript
// Date selectors
".date, #date, .current-date, [class*='date']"

// Time selectors  
".time, #time, .current-time, [class*='time']"

// Weather selectors
".temperature, .temp, [class*='temp']"
".humidity, [class*='humid']" 
".weather, .condition, [class*='weather']"

// General content
"h1, h2, .title, .heading"
".breadcrumb, nav, .navigation"
"main, .content, .main-content"
```

## Pro Tips

### 1. Use Browser DevTools First
- Right-click on the HKO page → "Inspect Element"
- Find the exact selectors for date/time elements
- Test selectors in browser console: `document.querySelector('your-selector')`

### 2. Handle Dynamic Content
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitForSelector": ".time, #clock",
  "timeout": 15000,
  "selectors": {
    "datetime": ".time, #clock, [class*='time']"
  }
}
```

### 3. Fallback Selectors
Use multiple selectors separated by commas:
```json
{
  "selector": ".time, #time, .clock, [class*='time'], time"
}
```

### 4. Extract Attributes
For `<time datetime="2025-09-02T09:00:00">` elements:
```json
{
  "selector": "time",
  "attribute": "datetime"
}
```

## Troubleshooting

### If No Text is Extracted:
1. Check if selectors are correct
2. Increase timeout value
3. Use `waitForSelector` for dynamic content
4. Try broader selectors like `body` first

### If Getting Null Values:
1. The element might not exist
2. Try inspecting the page HTML structure
3. Use multiple fallback selectors
4. Check if content loads via JavaScript

### For Dynamic Clocks:
1. Use `waitForSelector` to wait for clock element
2. Set higher timeout (10-15 seconds)
3. Consider using the navigation tool first with `networkidle2`

## Example MCP Inspector Workflow

1. **Navigate first** (optional but recommended):
   ```json
   // Tool: navigate
   {
     "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
     "waitUntil": "networkidle2",
     "timeout": 30000
   }
   ```

2. **Extract text** using the session:
   ```json
   // Tool: extract_text  
   {
     "sessionId": "session_from_step_1",
     "selectors": {
       "date": ".date, [class*='date']",
       "time": ".time, [class*='time']",
       "temp": ".temperature, [class*='temp']"
     },
     "waitForSelector": "body",
     "timeout": 10000
   }
   ```

This approach gives you the most reliable extraction of date and time information from the HKO website!
