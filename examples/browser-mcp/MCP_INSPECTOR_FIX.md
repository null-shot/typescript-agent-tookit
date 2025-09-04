# MCP Inspector JSON Fix for extract_text Tool

## The Problem
MCP Inspector is expecting a flat structure where `selectors` should be a record of string key-value pairs, not nested objects.

## ❌ Wrong Format (causes error -32602)
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "page_title": "title",
    "date_info": ".date, [class*='date'], time"
  },
  "timeout": 15000
}
```

## ✅ Correct Format for MCP Inspector

### Option 1: Use Individual String Selectors
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "title",
  "waitForSelector": "body",
  "timeout": 15000
}
```

### Option 2: Use Flat Selectors Object
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "page_title": "title",
    "date_info": ".date, [class*='date'], time",
    "time_info": ".time, [class*='time'], [class*='clock']",
    "weather_temp": ".temperature, [class*='temp'], [class*='celsius']"
  },
  "waitForSelector": "body",
  "timeout": 15000
}
```

### Option 3: Extract All Page Text (Simplest)
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "timeout": 15000
}
```

## 🎯 Ready-to-Use Examples for MCP Inspector

### Example 1: Get Page Title
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "title",
  "timeout": 15000
}
```

### Example 2: Get All Text Content
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "waitForSelector": "body",
  "timeout": 15000
}
```

### Example 3: Get Time Elements
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "time, .time, .date, [class*='time'], [class*='date']",
  "multiple": true,
  "timeout": 15000
}
```

### Example 4: Multiple Fields (Correct Format)
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selectors": {
    "title": "title",
    "heading": "h1, h2",
    "datetime": "time, .time, .date",
    "weather": ".temperature, [class*='temp']"
  },
  "timeout": 15000
}
```

### Example 5: Two-Step Process
Step 1 - Navigate:
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitUntil": "networkidle2",
  "timeout": 30000
}
```

Step 2 - Extract (use sessionId from step 1):
```json
{
  "sessionId": "YOUR_SESSION_ID_HERE",
  "selector": "body",
  "timeout": 10000
}
```

## 📝 Key Points for MCP Inspector

1. **All parameters must be at the top level** - don't nest timeout inside selectors
2. **selectors must be a flat object** with string keys and string values
3. **Use either `selector` OR `selectors`**, not both
4. **timeout is a top-level parameter**, not nested
5. **Start simple** with `selector: "body"` to get all text first

## 🚀 Recommended Workflow

1. **Start with the simplest example** (Example 2 - get all text)
2. **If that works**, try specific selectors
3. **Use browser DevTools** to find exact selectors if needed
4. **Gradually refine** your selectors based on the results
