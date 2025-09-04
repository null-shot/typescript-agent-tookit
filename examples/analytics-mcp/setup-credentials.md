# Setting up Cloudflare Analytics Engine SQL API

To enable real SQL queries against your Analytics Engine data, you need to set up API credentials.

## 1. Get Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. In the right sidebar, copy your **Account ID**

## 2. Create an API Token

1. Visit [API Tokens page](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Click **Create Custom Token**
4. Configure the token:
   - **Token name**: `Analytics MCP SQL API`
   - **Permissions**: 
     - Account | Account Analytics | Read
   - **Account Resources**: Include your account
   - **Zone Resources**: All zones (or specific zones if preferred)
   - **Client IP Address Filtering**: (optional)
   - **TTL**: (optional, set expiration)

5. Click **Continue to summary**
6. Click **Create Token**
7. **IMPORTANT**: Copy the token immediately (you won't see it again!)

## 3. Set Environment Variables

### Option A: Update wrangler.jsonc (for deployment)

```json
{
  "vars": {
    "CLOUDFLARE_ACCOUNT_ID": "your-32-char-account-id",
    "CLOUDFLARE_API_TOKEN": "your-api-token-here"
  }
}
```

### Option B: Use wrangler secrets (more secure)

```bash
# Set secrets (recommended for production)
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_API_TOKEN

# Or set via environment variables
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
```

## 4. Test the Setup

After setting credentials, redeploy:

```bash
pnpm run deploy
```

Then test in MCP Inspector:

1. Use `list_datasets` tool - should show actual tables
2. Use `query_analytics` tool with: `SHOW TABLES`
3. Use `track_metric` to write data, then query it back

## 5. Example Queries

Once you have data, try these queries:

```sql
-- Show all tables
SHOW TABLES

-- Count records in github_stats
SELECT COUNT(*) FROM github_stats

-- Get recent PR trends
SELECT 
  dataset,
  index1,
  blob1,
  blob2,
  double1,
  double2,
  timestamp
FROM github_stats 
WHERE timestamp > NOW() - INTERVAL '1' DAY
ORDER BY timestamp DESC
LIMIT 10

-- Aggregate PR data by week
SELECT 
  blob2 as week,
  SUM(_sample_interval * double1) as total_prs_created,
  SUM(_sample_interval * double2) as total_prs_merged
FROM github_stats 
WHERE blob1 = 'pr_trends'
GROUP BY blob2
ORDER BY week
```

## 6. Analytics Engine Table Structure

Your data will be stored with this structure:

| Column | Type | Description |
|--------|------|-------------|
| `dataset` | string | Dataset name (e.g., "github_stats") |
| `timestamp` | DateTime | When the event was logged |
| `_sample_interval` | integer | Sampling rate (usually 1) |
| `index1` | string | Primary index (e.g., repo name) |
| `blob1...blob20` | string | String dimensions |
| `double1...double20` | double | Numeric metrics |

## Troubleshooting

- **"Missing credentials"**: Check that CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set
- **"401 Unauthorized"**: Verify your API token has Account Analytics Read permission
- **"No tables found"**: Write some data first using `track_metric` tool
- **"Empty results"**: Data might be sampled or filtered - check your query conditions
