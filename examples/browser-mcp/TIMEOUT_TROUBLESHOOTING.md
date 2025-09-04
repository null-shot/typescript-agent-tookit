# Browser MCP Timeout Troubleshooting

## Problem
The extract_text tool is timing out 3 out of 4 times when trying to access the HKO website.

## Common Causes
1. **Network connectivity issues**
2. **HKO website is slow or blocking automated requests**
3. **Default timeout is too short**
4. **Browser rendering service limitations**
5. **Geographic restrictions or rate limiting**

## Solutions

### 1. Increase Timeout
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "timeout": 30000
}
```

### 2. Two-Step Process (More Reliable)
Step 1 - Navigate with longer timeout:
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "waitUntil": "networkidle2",
  "timeout": 45000
}
```

Step 2 - Extract using session:
```json
{
  "sessionId": "SESSION_ID_FROM_STEP_1",
  "selector": "body",
  "timeout": 10000
}
```

### 3. Try Alternative Websites for Testing
```json
{
  "url": "https://example.com",
  "selector": "body",
  "timeout": 15000
}
```

### 4. Use Different Wait Strategy
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "selector": "body",
  "waitForSelector": "title",
  "timeout": 30000
}
```

## Debugging Steps

### Check if Browser Rendering is Working
Test with a simple, fast website first:
```json
{
  "url": "https://httpbin.org/html",
  "selector": "body"
}
```

### Check Network Connectivity
```json
{
  "url": "https://www.google.com",
  "selector": "title"
}
```

## HKO-Specific Issues

The Hong Kong Observatory website might:
- Have geographic restrictions
- Block automated requests
- Be slow during peak hours
- Require specific user agents

### Try with Custom User Agent
Use the navigate tool first:
```json
{
  "url": "https://www.hko.gov.hk/en/gts/time/clock_e.html",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "waitUntil": "networkidle2",
  "timeout": 45000
}
```

## Alternative Time Sources

If HKO continues to timeout, try these alternatives:

### World Clock API
```json
{
  "url": "http://worldtimeapi.org/api/timezone/Asia/Hong_Kong",
  "selector": "body"
}
```

### Time.is Hong Kong
```json
{
  "url": "https://time.is/Hong_Kong",
  "selector": "body",
  "timeout": 30000
}
```

### TimeAndDate.com
```json
{
  "url": "https://www.timeanddate.com/worldclock/hong-kong",
  "selector": "body",
  "timeout": 30000
}
```

## Recommended Troubleshooting Order

1. **Test with simple site** (httpbin.org)
2. **Try HKO with longer timeout** (30-45 seconds)
3. **Use two-step process** (navigate + extract)
4. **Try alternative time websites**
5. **Check browser rendering service status**

## Expected Behavior

- **Success rate should be > 90%** for most websites
- **HKO might be slower** due to dynamic content
- **Timeouts indicate infrastructure issues** not code problems
