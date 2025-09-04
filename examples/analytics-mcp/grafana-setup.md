# 📊 Grafana Setup for Analytics Engine

## 🎯 Goal
Connect Grafana to your Cloudflare Analytics Engine to visualize GitHub statistics.

## 📋 Prerequisites
- ✅ Analytics Engine API working (confirmed)
- ✅ API Token: `N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP`
- ✅ Account ID: `59084df56e21d828dcbd5811f81c7754`
- ✅ Dataset: `github_stats` with 6 records

## 🚀 Grafana Setup Steps

### Step 1: Install Grafana
```bash
# macOS with Homebrew
brew install grafana

# Or download from: https://grafana.com/grafana/download
```

### Step 2: Start Grafana
```bash
brew services start grafana
# Or: grafana-server --config=/usr/local/etc/grafana/grafana.ini
```

**Access**: http://localhost:3000
**Default Login**: admin/admin

### Step 3: Install ClickHouse Plugin
1. Go to **Administration** → **Plugins**
2. Search for **"ClickHouse"** 
3. Install **Altinity ClickHouse** plugin
4. Or via CLI: `grafana-cli plugins install vertamedia-clickhouse-datasource`

### Step 4: Configure Data Source

#### Option A: Through Grafana UI
1. **Administration** → **Data Sources** → **Add data source**
2. Select **ClickHouse**
3. Configure:

```
Name: Cloudflare Analytics Engine
URL: https://api.cloudflare.com/client/v4/accounts/59084df56e21d828dcbd5811f81c7754/analytics_engine/sql
Access: Server (default)

Auth:
☑️ Custom HTTP Headers
Header Name: Authorization
Header Value: Bearer N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP

ClickHouse Details:
Server Address: api.cloudflare.com
Server Port: 443
Protocol: https
Username: (leave empty)
Password: (leave empty)
Database: (leave empty)
```

#### Option B: Configuration File
Create `datasource.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Cloudflare Analytics Engine
    type: vertamedia-clickhouse-datasource
    access: proxy
    url: https://api.cloudflare.com/client/v4/accounts/59084df56e21d828dcbd5811f81c7754/analytics_engine/sql
    jsonData:
      httpHeaderName1: "Authorization"
    secureJsonData:
      httpHeaderValue1: "Bearer N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP"
```

### Step 5: Test Connection
1. Click **Save & Test**
2. Should see: ✅ **"Data source is working"**

### Step 6: Create Dashboard

#### Sample Query 1: Total Records
```sql
SELECT COUNT() as total_records FROM github_stats
```

#### Sample Query 2: PR Trends Over Time
```sql
SELECT 
  timestamp,
  blob4 as week_period,
  SUM(_sample_interval * double1) as prs_created,
  SUM(_sample_interval * double2) as prs_merged,
  SUM(_sample_interval * double3) as prs_closed
FROM github_stats 
WHERE blob2 = 'pr_trends'
GROUP BY timestamp, blob4
ORDER BY timestamp
```

#### Sample Query 3: Repository Stats
```sql
SELECT 
  blob1 as repository,
  double1 as stars,
  double2 as forks,
  double3 as issues,
  double4 as open_issues
FROM github_stats 
WHERE blob2 = 'repository_snapshot'
```

## 🔧 Troubleshooting

### Common Issues:

1. **"Data source is not working"**
   - Check API token is correct
   - Verify account ID
   - Ensure ClickHouse plugin is installed

2. **"No data returned"**
   - Test query in browser first
   - Check dataset name (`github_stats`)
   - Verify data exists with: `SELECT * FROM github_stats LIMIT 5`

3. **Authentication errors**
   - Double-check Bearer token format
   - Ensure token has Analytics Engine permissions

### Test Queries:
```sql
-- Show all tables
SHOW TABLES

-- Count records
SELECT COUNT() FROM github_stats

-- Sample data
SELECT * FROM github_stats LIMIT 5

-- PR trends
SELECT blob4, SUM(_sample_interval * double1) as total_prs 
FROM github_stats 
WHERE blob2 = 'pr_trends' 
GROUP BY blob4
```

## 📈 Dashboard Ideas

1. **GitHub Repository Overview**
   - Stars, Forks, Issues (single stat panels)
   - Repository activity timeline

2. **Pull Request Trends**
   - PRs created/merged/closed over time
   - Weekly comparison charts

3. **Development Activity**
   - Commit frequency
   - Issue resolution time
   - Contributor activity

## 🎯 Next Steps
1. Install and start Grafana
2. Configure the ClickHouse data source
3. Test the connection
4. Create your first dashboard
5. Add more data collection scripts for richer analytics

**Your Analytics Engine is ready for Grafana! 🚀**
