# 🧪 End-to-End Testing Instructions for Analytics MCP

## 🚀 Quick Test Setup

1. **MCP Inspector is running at**: `http://localhost:6274`
2. **Connect to**: `https://analytics-mcp.raydp102.workers.dev/sse`
3. **Follow these steps in order**:

---

## 📝 STEP 1: Write Batch Data

**Tool**: `track_batch_metrics`

**Copy this payload**:
```json
{
  "dataset": "github_stats",
  "dataPoints": [
    {
      "dimensions": {
        "repo": "null-shot/typescript-agent-framework",
        "metric_type": "repository_snapshot",
        "date": "2025-09-04",
        "language": "TypeScript",
        "branch": "main"
      },
      "metrics": {
        "stars": 5,
        "forks": 4,
        "watchers": 5,
        "open_issues": 40,
        "size_kb": 1700,
        "contributors_count": 5,
        "network_count": 4,
        "subscribers_count": 0,
        "prs_open": 3,
        "prs_total": 43,
        "prs_merged_total": 34
      }
    },
    {
      "dimensions": {
        "repo": "null-shot/typescript-agent-framework",
        "metric_type": "pr_trends",
        "date": "2025-09-04",
        "week": "week_4_ago"
      },
      "metrics": {
        "prs_created": 0,
        "prs_merged": 1,
        "prs_closed": 0
      }
    },
    {
      "dimensions": {
        "repo": "null-shot/typescript-agent-framework",
        "metric_type": "pr_trends",
        "date": "2025-09-04",
        "week": "week_3_ago"
      },
      "metrics": {
        "prs_created": 4,
        "prs_merged": 5,
        "prs_closed": 0
      }
    },
    {
      "dimensions": {
        "repo": "null-shot/typescript-agent-framework",
        "metric_type": "pr_trends",
        "date": "2025-09-04",
        "week": "week_2_ago"
      },
      "metrics": {
        "prs_created": 13,
        "prs_merged": 8,
        "prs_closed": 4
      }
    },
    {
      "dimensions": {
        "repo": "null-shot/typescript-agent-framework",
        "metric_type": "pr_trends",
        "date": "2025-09-04",
        "week": "last_week"
      },
      "metrics": {
        "prs_created": 7,
        "prs_merged": 6,
        "prs_closed": 0
      }
    }
  ]
}
```

**Expected Result**: `"success": true` with confirmation message

---

## 🔍 STEP 2: Show Tables

**Tool**: `query_analytics`

**Payload**:
```json
{
  "sql": "SHOW TABLES"
}
```

**Expected Result**: Should show `github_stats` table

---

## 📊 STEP 3: List Datasets

**Tool**: `list_datasets`

**Payload**: (no parameters needed)

**Expected Result**: Should show `github_stats` dataset with description

---

## 🔢 STEP 4: Count Records

**Tool**: `query_analytics`

**Payload**:
```json
{
  "sql": "SELECT COUNT(*) as total_records FROM github_stats"
}
```

**Expected Result**: Should show `total_records: 5` (1 repo snapshot + 4 PR trends)

---

## 📈 STEP 5: Query PR Trends

**Tool**: `query_analytics`

**Payload**:
```json
{
  "sql": "SELECT dataset, index1 as repo, blob1 as metric_type, blob2 as week, double1 as prs_created, double2 as prs_merged, double3 as prs_closed, timestamp FROM github_stats WHERE blob1 = 'pr_trends' ORDER BY timestamp DESC LIMIT 10"
}
```

**Expected Result**: Should show 4 rows of PR trend data with different weeks

---

## 🏢 STEP 6: Query Repository Data

**Tool**: `query_analytics`

**Payload**:
```json
{
  "sql": "SELECT dataset, index1 as repo, blob1 as metric_type, double1 as stars, double2 as forks, double3 as watchers, double4 as open_issues, timestamp FROM github_stats WHERE blob1 = 'repository_snapshot' ORDER BY timestamp DESC LIMIT 5"
}
```

**Expected Result**: Should show 1 row with repository metrics (5 stars, 4 forks, etc.)

---

## 🎯 Success Criteria

✅ **All tools work without errors**  
✅ **Data is written and can be queried back**  
✅ **list_datasets shows real data (not 0 records)**  
✅ **SQL queries return actual Analytics Engine data**  
✅ **PR trends and repository data are properly stored**  

## 🔧 Troubleshooting

- **"Missing credentials"**: API token is set as Wrangler secret ✅
- **"No tables found"**: Run Step 1 first to write data
- **"Empty results"**: Check SQL syntax and table structure
- **Connection errors**: Restart MCP Inspector if needed

## 🎉 What This Proves

This end-to-end test demonstrates:
1. **Real Cloudflare Analytics Engine integration** ✅
2. **Proper SQL API functionality** ✅  
3. **Time-series data storage and retrieval** ✅
4. **MCP protocol working correctly** ✅
5. **GitHub analytics use case** ✅

After completing these steps, you'll have proven that the Analytics MCP can:
- Store complex GitHub metrics
- Query them back with SQL
- Provide real-time analytics capabilities
- Scale to handle time-series data

Perfect for building dashboards, monitoring systems, and analytics applications! 🚀
