# 🌐 Grafana Cloud Setup Guide

## Step 1: Sign Up for Grafana Cloud

1. **Go to**: https://grafana.com/products/cloud/
2. **Click**: "Get started for free"
3. **Create account** with your email
4. **Choose**: Free tier (14-day trial, then free tier with limits)

## Step 2: Export Your Current Dashboard

### **From Your Localhost Grafana:**
1. **Open your dashboard**
2. **Click**: Dashboard Settings (gear icon) 
3. **Go to**: "JSON Model" tab
4. **Copy**: The entire JSON configuration
5. **Save**: As `github-analytics-dashboard.json`

## Step 3: Configure Data Source in Grafana Cloud

1. **In Grafana Cloud**: Go to "Connections" → "Data sources"
2. **Add data source**: Choose "JSON API" or "HTTP"
3. **Configure**:
   - **Name**: `Analytics MCP`
   - **URL**: `https://analytics-mcp.raydp102.workers.dev/sse/message`
   - **Method**: `POST`
   - **Headers**: 
     ```
     Content-Type: application/json
     ```

## Step 4: Import Your Dashboard

1. **In Grafana Cloud**: Click "+" → "Import dashboard"
2. **Paste**: Your JSON configuration from Step 2
3. **Select**: Your Analytics MCP data source
4. **Save**: Your dashboard

## Step 5: Share Your Dashboard

### **Public Sharing:**
1. **Dashboard Settings** → "General" tab
2. **Enable**: "Public dashboard"
3. **Copy**: The public URL
4. **Share**: The URL with anyone

### **Private Sharing:**
1. **Dashboard Settings** → "General" tab
2. **Click**: "Share dashboard"
3. **Generate**: Share link with time limits
4. **Set permissions**: View-only or edit access

## Expected Result

You'll get a public URL like:
`https://your-org.grafana.net/d/abc123/github-analytics`

That shows your:
- ✅ NullShot PR trends
- ✅ Anthropics PR trends  
- ✅ Star growth charts
- ✅ All your custom queries and aliases

## Alternative: Quick Share from Localhost

If you want to quickly share your localhost dashboard:

### **Option A: ngrok (Immediate)**
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Expose your localhost Grafana
ngrok http 3000

# Share the ngrok URL (e.g., https://abc123.ngrok.io)
```

### **Option B: Tailscale (Team Sharing)**
```bash
# Install Tailscale
brew install tailscale

# Share with your team
tailscale serve 3000
```

## 🎯 Recommendation

**Use Grafana Cloud** for the best experience:
- ✅ **Professional hosting**
- ✅ **No server management** 
- ✅ **Public URLs**
- ✅ **Free tier available**
- ✅ **Built-in sharing features**
