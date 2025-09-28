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

# Set up production credentials (required for deployment)
# Get your Account ID first:
wrangler whoami

# Set credentials as secrets (secure for production):
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Enter your account ID when prompted (from whoami output)

wrangler secret put CLOUDFLARE_API_TOKEN
# Enter your API token when prompted (see token creation steps below)

# Deploy to Cloudflare Workers
wrangler deploy
```

Your Analytics MCP server will be deployed to: `https://analytics-mcp.{your-subdomain}.workers.dev`

### **Step 2: Configure Local Development Environment**

**Set up Analytics Engine credentials for local testing:**

```bash
# Create API token for Analytics Engine access
# Go to: https://dash.cloudflare.com/profile/api-tokens
# 1. Click "Create Token"
# 2. Use "Edit Cloudflare Workers" template OR "Custom token"
# 3. Required permissions: Account -> Cloudflare Workers:Edit, Account -> Analytics Engine:Read, User -> User
Details:Read
# 4. Select your account in "Account Resources"
# 5. Click "Continue to summary" then "Create Token"
# 6. Copy the generated token (save it securely!)

# Set credentials in .env file for local development
echo "CLOUDFLARE_ACCOUNT_ID=your_account_id_from_whoami" >> .env
echo "CLOUDFLARE_API_TOKEN=your_api_token" >> .env
```

**Note**: Production uses wrangler secrets (set in Step 1), local development uses `.env` file.

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

2. **Expected**: 8 available tools (track_metric, query_analytics, etc.)

**🔍 Important Architecture Note:**

- **Both localhost and production SSE connect to the SAME Analytics Engine** (localhost via `.env` credentials, production via wrangler secrets)
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

# Generate 30 days of simulated GitHub data for Claude Code
node generate-batch-data.js anthropics claude-code
```

**Expected output:**

```
🚀 Analytics MCP Batch Data Generator (Simulated GitHub Data)
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
2. **Select All** and **Copy** the entire JSON array
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
    "data": [{ "total_records": "30" }],
    "meta": { "rows": 1 }
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

### **Step 6: Setup Local Grafana Dashboard**

**Why Grafana?** Cloudflare's Workers Analytics Engine is optimized for powering time series analytics that can be visualized using tools like Grafana. Every event written from the runtime is automatically populated with a `timestamp` field, making it perfect for time-series dashboards.

📖 **Setup**: [Cloudflare Workers Analytics Engine - Querying from Grafana](https://developers.cloudflare.com/analytics/analytics-engine/grafana/)

### **Step 7: Create Dashboard Panels**

**Example: In your local Grafana (localhost:3000), create 2 panels with these proven working queries:**

**Panel 1: anthropics/claude-code PR stats**

```sql
SELECT
    blob3,
    double1 as PRsCreated,
    double2 as PRsMerged,
    double3 as PRsClosed,
    double4 as IssuesCreated,
    double5 as IssuesClosed
FROM github_stats
WHERE blob2 = 'claude_pr_stats'
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
WHERE blob2 = 'claude_github_stars'
ORDER BY blob3
```

**Panel Configuration:**

- **Time field**: `blob3` (contains dates)
- **Data source**: Analytics Engine SQL API (configured above)
- **Visualization**: Time series
- **Legend**: Uses aliases (PRsCreated, StarCount, etc.)

### **Step 8: View Your Analytics Dashboard**

Your dashboard will show:

- **📈 PR Activity**: Claude Code PR and issue activity
- **⭐ Star Growth**: Anthropics Claude Code star growth
- **🎯 Professional insights**: Development patterns and growth trends

## 🔧 **Complete Tool Examples Reference**

This section provides complete, tested examples for all available MCP tools. Use these as templates for your analytics workflows.

### **Data Writing Tools**

#### **`track_metric`** - Single Data Point

Record individual analytics events with dimensions and metrics.

**Dataset:**

```json
"github_stats"
```

**Dimensions:**

```json
{
  "repo": "anthropics/claude-code",
  "event_type": "pr_created",
  "date": "2025-09-05"
}
```

**Metrics:**

```json
{
  "prs_created": 1,
  "prs_merged": 0,
  "prs_closed": 0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Successfully tracked metric in dataset 'github_stats'",
    "dataset": "github_stats",
    "dimensions": ["repo", "event_type", "date"],
    "metrics": ["prs_created", "prs_merged", "prs_closed"],
    "timestamp": 1725494400000
  }
}
```

#### **`track_batch_metrics`** - Multiple Data Points

Efficiently submit multiple analytics events in a single request.

**Dataset:**

```json
"github_stats"
```

**Data Points Array:**

```json
[
  {
    "dimensions": {
      "repo": "anthropics/claude-code",
      "event_type": "pr_stats",
      "date": "2025-09-01"
    },
    "metrics": {
      "prs_created": 5,
      "prs_merged": 3,
      "prs_closed": 1
    }
  },
  {
    "dimensions": {
      "repo": "anthropics/claude-code",
      "event_type": "pr_stats",
      "date": "2025-09-02"
    },
    "metrics": {
      "prs_created": 7,
      "prs_merged": 4,
      "prs_closed": 2
    }
  }
]
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Successfully tracked 2 data points in dataset 'github_stats'",
    "dataset": "github_stats",
    "count": 2,
    "timestamp": 1725494400000
  }
}
```

### **Query & Analysis Tools**

#### **`query_analytics`** - Raw SQL Queries

Execute custom SQL queries against your analytics data with full SQL support.

**SQL Query:**

```sql
SELECT blob1 as repo, blob2 as event_type, blob3, double1 as prs_created, double2 as prs_merged
FROM github_stats
WHERE blob2 = 'pr_stats'
ORDER BY blob3 DESC
LIMIT 10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "repo": "anthropics/claude-code",
        "event_type": "pr_stats",
        "date": "2025-09-05",
        "prs_created": 5,
        "prs_merged": 3
      }
    ],
    "meta": {
      "rows": 1,
      "duration": 45,
      "query": "SELECT...",
      "timestamp": 1725494400000
    }
  }
}
```

#### **`get_metrics_summary`** - Aggregated Statistics

Get summarized metrics with time ranges and dimension grouping.

**Dataset:**

```json
"github_stats"
```

**Time Range:**

```json
{
  "start": "2025-09-01T00:00:00Z",
  "end": "2025-09-07T23:59:59Z"
}
```

**Dimensions:**

```json
["event_type"]
```

**Response:**

```json
{
  "success": true,
  "data": {
    "dataset": "github_stats",
    "timeRange": {
      "start": "2025-09-01T00:00:00Z",
      "end": "2025-09-07T23:59:59Z"
    },
    "metrics": {
      "total_records": 7,
      "avg_prs_created": 5.43,
      "sum_prs_created": 38,
      "max_prs_created": 7,
      "min_prs_created": 3
    },
    "dimensions": ["event_type"],
    "meta": {
      "rows": 1,
      "duration": 67,
      "timestamp": 1725494400000
    }
  }
}
```

#### **`get_time_series`** - Time Series Data

Retrieve time-series data for trend analysis and visualization.

**Dataset:**

```json
"github_stats"
```

**Metric:**

```json
"prs_created"
```

**Interval:**

```json
"1d"
```

**Time Range:**

```json
{
  "start": "2025-09-01T00:00:00Z",
  "end": "2025-09-07T23:59:59Z"
}
```

**Dimensions:**

```json
["pr_stats"]
```

**Response:**

```json
{
  "success": true,
  "data": {
    "dataset": "github_stats",
    "metric": "prs_created",
    "interval": "1d",
    "timeRange": {
      "start": "2025-09-01T00:00:00Z",
      "end": "2025-09-07T23:59:59Z"
    },
    "data": [
      {
        "timestamp": 1725148800000,
        "value": 5,
        "dimensions": {
          "event_type": "pr_stats"
        }
      },
      {
        "timestamp": 1725235200000,
        "value": 7,
        "dimensions": {
          "event_type": "pr_stats"
        }
      }
    ],
    "meta": {
      "points": 7,
      "duration": 89,
      "timestamp": 1725494400000
    }
  }
}
```

#### **`analyze_trends`** - Trend Analysis

Analyze trends in metrics over time with automatic pattern detection.

**Dataset:**

```json
"github_stats"
```

**Metric:**

```json
"pr_stats"
```

**Time Range:**

```json
"30d"
```

**Column (Optional):**

```json
"double1"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "metric": "pr_stats",
        "direction": "increasing",
        "change": 15,
        "percentChange": 42.86,
        "firstValue": 35,
        "lastValue": 50,
        "dataPoints": 30,
        "dateRange": "2025-08-06 to 2025-09-05"
      }
    ],
    "summary": "pr_stats trend: +15 (+42.86%) over 30 data points (using double1 from pr_stats)"
  }
}
```

### **Utility Tools**

#### **`list_datasets`** - Available Datasets

List all available datasets and their metadata.

```json
{}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "github_stats:github_star_cumulative",
      "description": "Event type 'github_star_cumulative' in github_stats",
      "record_count": "36",
      "dimensions": ["repo", "event_type", "date", "batch_id"],
      "metrics": ["stars_total", "forks_total", "prs_created", "prs_merged"]
    },
    {
      "name": "github_stats:pr_stats",
      "description": "Event type 'pr_stats' in github_stats",
      "record_count": "2",
      "dimensions": ["repo", "event_type", "date", "batch_id"],
      "metrics": ["stars_total", "forks_total", "prs_created", "prs_merged"]
    }
  ]
}
```

#### **`get_recent_data`** - Recent Records

Get the most recent data entries for debugging and inspection.

```json
{
  "dataset": "github_stats",
  "limit": 5
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "blob1": "anthropics/claude-code",
        "blob2": "pr_stats",
        "blob3": "2025-09-05",
        "double1": 5,
        "double2": 3,
        "double3": 1,
        "timestamp": 1725494400000
      }
    ],
    "meta": {
      "rows": 5,
      "dataset": "github_stats",
      "query": "SELECT * FROM github_stats ORDER BY timestamp DESC LIMIT 5",
      "timestamp": 1725494400000
    }
  }
}
```

### **Quick Reference**

| Tool                  | Purpose              | Use Case                             |
| --------------------- | -------------------- | ------------------------------------ |
| `track_metric`        | Single data point    | Individual events, one-off metrics   |
| `track_batch_metrics` | Multiple data points | Bulk data ingestion, historical data |
| `query_analytics`     | Custom SQL           | Complex queries, joins, aggregations |
| `get_metrics_summary` | Summary statistics   | Dashboard metrics, KPI tracking      |
| `get_time_series`     | Time-based data      | Charts, trend visualization          |
| `analyze_trends`      | Trend detection      | Pattern analysis, change detection   |
| `list_datasets`       | Dataset discovery    | Explore available data               |
| `get_recent_data`     | Recent inspection    | Debugging, data validation           |

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
