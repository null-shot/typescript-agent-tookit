# Analytics MCP Example - GitHub PR Analytics

This example demonstrates **MCP capabilities with Cloudflare Analytics Engine** using GitHub Pull Request analytics as a concrete use case. It showcases how to build a complete analytics platform with MCP tools for data collection, time-series analysis, and trend monitoring.

## 🎯 **Purpose: MCP + Analytics Engine Demonstration**

This example serves as a **demonstration of MCP framework capabilities** integrated with Cloudflare Analytics Engine. Using GitHub repository analytics as a concrete, relatable use case, it demonstrates:

- **MCP Tool Integration** - How to build analytics tools that AI agents can use
- **Real-time Data Collection** - Immediate data ingestion and querying
- **Time-series Analysis** - Professional analytics workflows via MCP
- **Cloudflare Workers Integration** - Analytics Engine + MCP + Workers architecture
- **Production-ready Implementation** - Complete with testing, validation, and error handling

**Why GitHub PR analytics?** It's a familiar domain that clearly demonstrates the value of time-series analytics, trend analysis, and business insights - making it easy to understand the MCP framework's capabilities.

## ⚠️ **Important: GitHub-Specific Implementation**

This example is **intentionally specific to GitHub PR analytics** to provide a clear, working demonstration. The tools are optimized for:
- GitHub repository metrics (PRs created, merged, closed)
- Development team productivity tracking
- Repository health monitoring
- PR velocity analysis

**For other use cases**, you'll need to adapt the data structure and tool configurations (see [Adaptation Guide](#-adapting-for-your-use-case) below).

## 🚀 **Quick Start Guide**

Follow this complete guide to set up Analytics MCP and create a working dashboard in under 30 minutes.

### **Prerequisites**
- Node.js 18+ and pnpm
- Cloudflare account with Workers access
- Analytics Engine enabled (free tier available)

> **📋 Important**: All examples use `github_stats` as the dataset name because it's the only dataset bound in `wrangler.jsonc`. To use different dataset names, see [Dataset Binding Configuration](#📋-important-dataset-binding-configuration).

### **Step 1: Deploy the Analytics MCP Server**

```bash
# Clone and navigate to the project
cd examples/analytics-mcp

# Install dependencies
pnpm install

# Deploy to Cloudflare Workers
wrangler deploy
```

Your Analytics MCP server will be deployed to: `https://analytics-mcp.{your-subdomain}.workers.dev`

### **Step 2: Configure Local Development Environment**

**Set up Analytics Engine credentials for local testing:**
```bash
# Find your Cloudflare Account ID
wrangler whoami
# This shows your account ID - copy it

# Get your API token (choose one method):

# Method 1: Create new token via Wrangler
wrangler auth login
# This will open browser and create/save a token automatically

# Method 2: Create API token manually from Cloudflare Dashboard
# 1. Go to https://dash.cloudflare.com/profile/api-tokens
# 2. Click "Create Token" 
# 3. Use "Edit Cloudflare Workers" template OR "Custom token"
# 4. Required permissions: Account -> Cloudflare Workers:Edit, Account -> Analytics Engine:Read
# 5. Select your account in "Account Resources"
# 6. Click "Continue to summary" then "Create Token"
# 7. Copy the generated token (save it securely - you won't see it again!)

# Method 3: Check existing setup and get Account ID
# Verify your current Cloudflare setup:
wrangler whoami

# This shows your Account ID and confirms you're authenticated
# Copy the Account ID from the output table
# Note: This doesn't show the API token value - you need Method 1 or 2 for that

# Set your credentials (replace with your actual values)
export CLOUDFLARE_ACCOUNT_ID=your_account_id_from_whoami  # Copy from wrangler whoami output
export CLOUDFLARE_API_TOKEN=your_api_token  # See token creation steps below

# Or add to your .env file for persistence
echo "CLOUDFLARE_ACCOUNT_ID=your_account_id_from_whoami" >> .env
echo "CLOUDFLARE_API_TOKEN=your_api_token" >> .env
```

**Note**: Your deployed worker already has these credentials configured (that's why the GitHub collector worked).

**🔍 Debug Tips**: 
- If `track_metric` succeeds but `query_analytics` returns no data, verify **both** credentials are set:
  ```bash
  echo "CLOUDFLARE_ACCOUNT_ID: $CLOUDFLARE_ACCOUNT_ID"
  echo "CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN:0:10}..."
  ```
- **⚠️ IMPORTANT**: Cloudflare Workers local development has Analytics Engine write limitations. Use production SSE for reliable testing.

### **Step 3: Test with MCP Inspector**

**Start the development environment:**
```bash
# Start MCP Inspector and local dev server (with credentials)
pnpm dev
```

This opens:
- **MCP Inspector**: Browser popup for interactive testing
- **Worker Dev**: Local development server on `localhost:8787` (with real Analytics Engine access)

**Connect MCP Inspector:**
1. **In MCP Inspector popup**:
   - **Server URL**: `https://your-worker-name.your-subdomain.workers.dev/sse` (⭐ **RECOMMENDED** - reliable read/write)
   - **Alternative**: `http://localhost:8787/sse` (⚠️ **LOCAL DEV** - has Analytics Engine write limitations)
   - **Click**: "Connect"
   
   **💡 Find your worker URL:**
   ```bash
   # Deploy first, then get the URL
   wrangler deploy
   # Output shows: Published analytics-mcp (1.23s)
   #               https://analytics-mcp.your-subdomain.workers.dev
   ``` 
2. **Expected**: 11 available tools (track_metric, query_analytics, etc.)

**🔍 Important Architecture Note:**
- **Both localhost and production SSE connect to the SAME Analytics Engine** (via `.env` credentials)
- **`list_datasets` shows identical results** (same record counts, timestamps)  
- **Cloudflare Workers local development limitation**: Analytics Engine writes in local mode don't persist consistently
- **For reliable data testing, always use the production SSE URL** ✅

### **Step 4: Test Tools in MCP Inspector**

**Before adding bulk data, test individual tools:**

1. **Test `track_metric` tool**:
   ```json
   {
     "dataset": "github_stats",
     "dimensions": {
       "repo": "null-shot/typescript-agent-framework",
       "event_type": "test_pr",
       "date": "2025-09-05"
     },
     "metrics": {
       "prs_created": 1,
       "prs_merged": 1,
       "prs_closed": 0
     }
   }
   ```

2. **Test `query_analytics` tool**:
   ```json
   {
     "sql": "SELECT blob2 as EventType, blob3 as Date, double1 as PRsCreated, double2 as PRsMerged, double3 as PRsClosed FROM github_stats ORDER BY blob3 DESC LIMIT 5"
   }
   ```

3. **Verify tools work** before proceeding to bulk data collection

### **Step 5: Collect and Add Batch Data**

**🎯 Goal**: Add 30 days of GitHub metrics using batch processing (Analytics Engine allows up to 25 data points per Worker invocation)

#### **5.1: Generate Test Data**

**Create batch test files:**
```bash
# Navigate to analytics-mcp directory
cd examples/analytics-mcp

# Generate 30 days of REAL GitHub data for Claude Code
node generate-batch-data.js anthropics claude-code
```

**Expected output:**
```
🚀 Analytics MCP Batch Data Generator (Real GitHub Data)
=========================================================
⚠️  No GITHUB_TOKEN found - using anonymous requests (lower rate limits)
🔍 Fetching real data for anthropics/claude-code...
✅ Real data: 32642 stars, 1978 forks, 3036 issues

📊 Generating data for anthropics/claude-code (real GitHub data):
✅ anthropics_claude_code_batch_1.json: 10 records
✅ anthropics_claude_code_batch_2.json: 10 records  
✅ anthropics_claude_code_batch_3.json: 10 records

🎯 Generated 30 data points in 3 batches
📁 Files: anthropics_claude_code_batch_1.json to anthropics_claude_code_batch_3.json

💡 To generate data for other repositories:
   node generate-batch-data.js anthropics claude-code
   node generate-batch-data.js null-shot typescript-agent-framework

📋 Next steps:
1. Open each batch file and copy the JSON array
2. Use track_batch_metrics in MCP Inspector
3. Process all batches (10 records each)
4. Verify with query_analytics tool
```

#### **5.2: Process Batches in MCP Inspector**

**⚠️ Important**: Use **production SSE** for reliable writes: `https://your-worker-name.your-subdomain.workers.dev/sse`

**💡 Get your production URL:**
```bash
wrangler deploy
# Copy the URL from the output: https://analytics-mcp.your-subdomain.workers.dev
```

**For each batch file (1-3):**

1. **Open** `anthropics_claude_code_batch_1.json` in your editor
2. **Select All** (Cmd+A) and **Copy** (Cmd+C) the entire JSON array
3. **In MCP Inspector**:
   - **Tool**: `track_batch_metrics`
   - **dataset**: `github_stats`
   - **dataPoints**: **Paste the JSON array**
   - **Click**: "Run Tool"
4. **Expected Success Response**:
   ```json
   {
     "success": true,
     "data": {
       "message": "Successfully tracked 10 data points in dataset 'github_stats'",
       "dataset": "github_stats", 
       "count": 10,
       "timestamp": 1757062581198
     }
   }
   ```
5. **Repeat** for `anthropics_claude_code_batch_2.json` and `anthropics_claude_code_batch_3.json`

#### **5.3: Verify All Data Added**

**After processing all 3 batches, verify total records:**

**Use `query_analytics` tool:**
```json
{
  "sql": "SELECT count() as total_records FROM github_stats WHERE blob2 = 'github_real_30days'"
}
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "data": [{"total_records": "30"}],
    "meta": {"rows": 1}
  }
}
```

**🗓️ Date Range**: Script automatically generates data for the **last 30 days** from current date

#### **5.4: Sample Data Queries**

**View recent data:**
```json
{
  "sql": "SELECT blob1 as repo, blob3, double1 as stars_total, double4 as prs_created FROM github_stats WHERE blob2 = 'github_real_30days' ORDER BY blob3 DESC LIMIT 10"
}
```

**Repository breakdown:**
```json  
{
  "sql": "SELECT blob1 as repo, count() as records FROM github_stats WHERE blob2 = 'github_real_30days' GROUP BY blob1"
}
```

**🎉 Success Criteria:**
- ✅ All 3 batches return `"success": true`
- ✅ Total query shows 30 records  
- ✅ Data appears for `anthropics/claude-code` repository

#### **5.5: Add More Repositories (Optional)**

**To add another repository (e.g., NullShot TypeScript Agent Framework):**

1. **Generate data for second repo**:
   ```bash
   node generate-batch-data.js null-shot typescript-agent-framework
   ```
   
   **Expected output:**
   ```
   📊 Generating data for null-shot/typescript-agent-framework (real GitHub data):
   ✅ null_shot_typescript_agent_framework_batch_1.json: 10 records
   ✅ null_shot_typescript_agent_framework_batch_2.json: 10 records  
   ✅ null_shot_typescript_agent_framework_batch_3.json: 10 records
   ```

2. **Process the new batches** using the same MCP Inspector steps

3. **Create separate Grafana panels**:
   - **Panel 1 (Claude Code)**: 
     ```sql
     SELECT blob3, double1 as Stars, double5 as PRsCreated 
     FROM github_stats 
     WHERE blob2 = 'github_real_30days' AND blob1 = 'anthropics/claude-code'
     ORDER BY blob3
     ```
   - **Panel 2 (NullShot)**: 
     ```sql
     SELECT blob3, double1 as Stars, double5 as PRsCreated 
     FROM github_stats 
     WHERE blob2 = 'github_real_30days' AND blob1 = 'null-shot/typescript-agent-framework'
     ORDER BY blob3
     ```

**💡 Pro Tip**: The `blob1` field stores the repository name, allowing you to filter data by repository in Grafana!

### **Step 6: Setup Local Grafana Dashboard**

**Install and Start Grafana (Proven Working Method):**
```bash
# Install Grafana via Homebrew (macOS)
brew install grafana

# Start Grafana service
brew services start grafana

# Open dashboard: http://localhost:3000
# Default login: admin/admin
```

**Configure Data Source (Proven Working Method):**

Based on the successful implementation, configure:

1. **Add data source**: JSON API or HTTP endpoint
2. **URL**: `https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`
3. **Method**: POST
4. **Headers**: 
   - `Authorization: Bearer {your_cf_api_token}`
   - `Content-Type: text/plain`
5. **Body**: Raw SQL query (e.g., `SELECT blob3, double1 FROM github_stats WHERE blob2 = 'daily_pr_stats_clean' ORDER BY blob3`)

**Alternative (Simplified HTTP Endpoint):**
- **URL**: `https://analytics-mcp.{your-subdomain}.workers.dev/grafana/query`
- **Method**: GET
- **Query parameter**: `sql` = (your SQL query)
- **Note**: This endpoint was added for easier integration but not yet tested

### **Step 7: Configure Analytics Engine Access**

Set up your Cloudflare API token for Analytics Engine access:

```bash
# Set your API token (get from Cloudflare dashboard)
wrangler secret put CF_API_TOKEN
# Use token with "Account Analytics Read" permission
```

### **Step 8: Verify Setup**

Test that everything works:

```bash
# Run the verification script
node complete-setup-verification.js
```

Expected output:
- ✅ MCP Connection working (11 tools available)
- ✅ Grafana Endpoint working (data returned)
- ✅ Ready for dashboard creation

### **Step 10: Create Dashboard Panels**

**In your local Grafana (localhost:3000), create 2 panels with these proven working queries:**

**Panel 1: claude-code PR stats**
```sql
SELECT
    blob3,
    double1 as PRsCreated,
    double2 as PRsMerged,
    double3 as PRsClosed,
    double4 as IssuesCreated,
    double5 as IssuesClosed
FROM github_stats
WHERE blob2 = 'claude_rich_data'
ORDER BY blob3
```

**Panel 2: anthropics/claude-code stars**
```sql
SELECT
    blob3,
    double1 as StarCount,
    double2 as DailyGrowth,
    double3 as ForkCount,
    double4 as Watchers
FROM github_stats
WHERE blob2 = 'github_star_cumulative' AND blob5 = 'anthropics'
ORDER BY blob3
```

**Panel Configuration:**
- **Time field**: `blob3` (contains dates)
- **Data source**: Analytics Engine SQL API (configured above)
- **Visualization**: Time series
- **Legend**: Uses aliases (PRsCreated, StarCount, etc.)

### **Step 11: View Your Analytics Dashboard**

Your dashboard will show:
- **📈 PR Activity**: Real-time Claude Code PR and issue activity
- **⭐ Star Growth**: Anthropics Claude Code star growth (32K+ stars)
- **🎯 Professional insights**: Development patterns and growth trends

## Project Structure

```
examples/analytics-mcp/
├── src/
│   ├── index.ts          # Worker entrypoint and session management
│   ├── server.ts         # AnalyticsMcpServer implementation
│   ├── repository.ts     # Analytics Engine operations
│   ├── schema.ts         # Data models and validation schemas
│   ├── tools.ts          # MCP tool definitions for analytics
│   ├── resources.ts      # MCP resource definitions
│   └── prompts.ts        # Interactive analytics prompts
├── test/
│   ├── analytics-mcp-client.test.ts
│   └── tsconfig.json
├── package.json
├── wrangler.jsonc        # Cloudflare Worker configuration
├── tsconfig.json
└── vitest.config.ts
```

## License

MIT
