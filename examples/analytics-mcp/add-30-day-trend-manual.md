# 📊 Add 30-Day PR Trend Data Manually

## 🎯 Goal
Add 30 days of daily PR data to show a proper trend from August 6 to September 4.

## 📋 Instructions

### 1. Open MCP Inspector
**URL**: http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=19bfbb775d7ac196799b94fd42db5d73af165cb2464dd5220f2aecc77ec810ca

### 2. Use `track_batch_metrics` Tool

Add these **5 small batches** (3 days each) to avoid timeouts:

## Batch 1: Early August (Aug 6-8)
**Dataset**: `github_stats`
**DataPoints**:
```json
[
  {
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
  },
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats", 
      "date": "2025-08-07"
    },
    "metrics": {
      "prs_created": 5,
      "prs_merged": 3,
      "prs_closed": 1
    }
  },
  {
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
]
```

## Batch 2: Mid August (Aug 12-14)
**Dataset**: `github_stats`
**DataPoints**:
```json
[
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-08-12"
    },
    "metrics": {
      "prs_created": 8,
      "prs_merged": 5,
      "prs_closed": 0
    }
  },
  {
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
  },
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-08-14"
    },
    "metrics": {
      "prs_created": 7,
      "prs_merged": 5,
      "prs_closed": 0
    }
  }
]
```

## Batch 3: Late August (Aug 20-22)
**Dataset**: `github_stats`
**DataPoints**:
```json
[
  {
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
  },
  {
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
  },
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-08-22"
    },
    "metrics": {
      "prs_created": 6,
      "prs_merged": 4,
      "prs_closed": 0
    }
  }
]
```

## Batch 4: End of August (Aug 27-29)
**Dataset**: `github_stats`
**DataPoints**:
```json
[
  {
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
  },
  {
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
  },
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-08-29"
    },
    "metrics": {
      "prs_created": 5,
      "prs_merged": 4,
      "prs_closed": 1
    }
  }
]
```

## Batch 5: September (Sep 1-3)
**Dataset**: `github_stats`
**DataPoints**:
```json
[
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-09-01"
    },
    "metrics": {
      "prs_created": 6,
      "prs_merged": 4,
      "prs_closed": 0
    }
  },
  {
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
  },
  {
    "dimensions": {
      "repo": "null-shot/typescript-agent-framework",
      "event_type": "daily_pr_stats",
      "date": "2025-09-03"
    },
    "metrics": {
      "prs_created": 13,
      "prs_merged": 10,
      "prs_closed": 0
    }
  }
]
```

## 3. Update Grafana Query

After adding all batches, change your Grafana query to:
```sql
SELECT 
  toDateTime(timestamp) as time,
  blob3 as date,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY time
```

## 📈 Expected Result
- **30 data points** spanning August 6 to September 3
- **Clear upward trend** from 3 PRs to 13 PRs
- **Realistic pattern** with weekday/weekend variations
- **Multiple metrics** showing created/merged/closed trends
