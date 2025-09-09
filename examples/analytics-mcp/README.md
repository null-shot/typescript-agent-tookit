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
# 4. Required permissions: Account -> Cloudflare Workers:Edit, Account -> Analytics Engine:Read, User -> User Details:Read
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

**Complete Request:**
```json
{
  "dataset": "github_stats",
  "dimensions": {
    "repo": "anthropics/claude-code",
    "event_type": "pr_created",
    "date": "2025-09-05"
  },
  "metrics": {
    "prs_created": 1,
    "prs_merged": 0,
    "prs_closed": 0
  },
  "timestamp": 1725494400000
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

```json
{
  "dataset": "github_stats",
  "dataPoints": [
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
}
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

```json
{
  "sql": "SELECT blob1 as repo, blob2 as event_type, blob3 as date, double1 as prs_created, double2 as prs_merged FROM github_stats WHERE blob2 = 'pr_stats' ORDER BY blob3 DESC LIMIT 10"
}
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

```json
{
  "dataset": "github_stats",
  "timeRange": {
    "start": "2025-09-01T00:00:00Z",
    "end": "2025-09-07T23:59:59Z"
  },
  "dimensions": ["event_type"]
}
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

```json
{
  "dataset": "github_stats",
  "metric": "prs_created",
  "interval": "1d",
  "timeRange": {
    "start": "2025-09-01T00:00:00Z",
    "end": "2025-09-07T23:59:59Z"
  },
  "dimensions": ["pr_stats"]
}
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

```json
{
  "dataset": "github_stats",
  "metric": "pr_stats",
  "timeRange": "30d",
  "column": "double1"
}
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
  "data": {
    "datasets": [
      {
        "name": "github_stats",
        "record_count": 30,
        "event_types": ["pr_stats", "github_stars"]
      }
    ],
    "total_datasets": 1,
    "timestamp": 1725494400000
  }
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

| Tool | Purpose | Use Case |
|------|---------|----------|
| `track_metric` | Single data point | Individual events, one-off metrics |
| `track_batch_metrics` | Multiple data points | Bulk data ingestion, historical data |
| `query_analytics` | Custom SQL | Complex queries, joins, aggregations |
| `get_metrics_summary` | Summary statistics | Dashboard metrics, KPI tracking |
| `get_time_series` | Time-based data | Charts, trend visualization |
| `analyze_trends` | Trend detection | Pattern analysis, change detection |
| `list_datasets` | Dataset discovery | Explore available data |
| `get_recent_data` | Recent inspection | Debugging, data validation |

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
