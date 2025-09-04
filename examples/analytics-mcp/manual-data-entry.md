# 📊 Manual Data Entry for 30 Days PR Trends

## 🔗 Connect to MCP Inspector
**URL**: http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=19bfbb775d7ac196799b94fd42db5d73af165cb2464dd5220f2aecc77ec810ca

## 🧹 Step 1: Clean Existing Data (Optional)
Use `query_analytics` tool:
```sql
SELECT * FROM github_stats WHERE blob2 = 'daily_pr_stats' ORDER BY timestamp
```

## 📈 Step 2: Add 10 Key Data Points
Add these **10 strategic data points** to show clear trends:

### Data Point 1 (Week 1)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1722945600,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-06"
  },
  "metrics": {
    "prs_created": 3,
    "prs_merged": 2,
    "prs_closed": 0
  }
}
```

### Data Point 2 (Week 1)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1723118400,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-08"
  },
  "metrics": {
    "prs_created": 7,
    "prs_merged": 4,
    "prs_closed": 0
  }
}
```

### Data Point 3 (Week 2)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1723550400,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-13"
  },
  "metrics": {
    "prs_created": 9,
    "prs_merged": 6,
    "prs_closed": 1
  }
}
```

### Data Point 4 (Week 2)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1723723200,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-15"
  },
  "metrics": {
    "prs_created": 4,
    "prs_merged": 3,
    "prs_closed": 1
  }
}
```

### Data Point 5 (Week 3)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1724155200,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-20"
  },
  "metrics": {
    "prs_created": 10,
    "prs_merged": 7,
    "prs_closed": 0
  }
}
```

### Data Point 6 (Week 3)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1724241600,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-21"
  },
  "metrics": {
    "prs_created": 11,
    "prs_merged": 8,
    "prs_closed": 1
  }
}
```

### Data Point 7 (Week 4)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1724760000,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-27"
  },
  "metrics": {
    "prs_created": 12,
    "prs_merged": 9,
    "prs_closed": 1
  }
}
```

### Data Point 8 (Week 4)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1724846400,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-08-28"
  },
  "metrics": {
    "prs_created": 8,
    "prs_merged": 6,
    "prs_closed": 0
  }
}
```

### Data Point 9 (Recent)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1725278400,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-09-02"
  },
  "metrics": {
    "prs_created": 10,
    "prs_merged": 7,
    "prs_closed": 1
  }
}
```

### Data Point 10 (Most Recent)
**Tool**: `track_metric`
**Dataset**: `github_stats`
**DataPoint**:
```json
{
  "timestamp": 1725451200,
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "daily_pr_stats",
    "date": "2025-09-04"
  },
  "metrics": {
    "prs_created": 15,
    "prs_merged": 11,
    "prs_closed": 1
  }
}
```

## 📊 Step 3: Test in Grafana
After adding the data points:

1. **Query**:
```sql
SELECT 
  timestamp,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY timestamp
```

2. **Visualization**: Change to "Time series"
3. **Format As**: "Time series"

## 📈 Expected Result
- **Clear upward trend** from 3 PRs (Aug 6) to 15 PRs (Sep 4)
- **3 lines**: created (highest), merged (middle), closed (lowest)
- **Time span**: ~30 days from August to September
- **Realistic pattern**: Shows growth in PR activity over time

## 🎯 Success Criteria
- ✅ 10+ data points with different dates
- ✅ Clear trend line in Grafana
- ✅ Multiple metrics (created/merged/closed)
- ✅ Proper time series visualization
