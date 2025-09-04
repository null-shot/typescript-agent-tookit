# 📊 Grafana GraphQL Setup for Analytics Engine

## 🎯 Using Cloudflare GraphQL Analytics API

Based on [Cloudflare's GraphQL Analytics API documentation](https://developers.cloudflare.com/analytics/graphql-api/), this is the proper way to connect analytics to Grafana.

## 📋 Setup Steps

### Step 1: Add GraphQL Data Source in Grafana

1. **Go to**: Configuration → Data Sources
2. **Add data source**
3. **Select**: "GraphQL Data Source" (or install if not available)
4. **Configure**:
   - **URL**: `https://api.cloudflare.com/client/v4/graphql`
   - **Access**: Server (default)
   - **Auth**: Custom Headers
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP`

### Step 2: GraphQL Query for Analytics Engine

```graphql
query AnalyticsEngineQuery {
  viewer {
    accounts(filter: {accountTag: "59084df56e21d828dcbd5811f81c7754"}) {
      analyticsEngine {
        datasets(filter: {name: "github_stats"}) {
          data {
            timestamp
            dimensions {
              repo
              event_type  
              date
            }
            metrics {
              prs_created
              prs_merged
              prs_closed
            }
          }
        }
      }
    }
  }
}
```

### Step 3: Alternative - JSON Data Source

If GraphQL plugin isn't available, create a simple JSON endpoint:

**URL**: `https://api.cloudflare.com/client/v4/accounts/59084df56e21d828dcbd5811f81c7754/analytics_engine/sql`
**Method**: POST
**Headers**: `Authorization: Bearer N0DEQw1v_2FxAdFcVDVmFN2L6IGzDlFMOrU8OjyP`
**Body**: Raw SQL queries

## 🚀 Expected Benefits

- ✅ **Direct API access** - No plugin compatibility issues
- ✅ **Proper GraphQL queries** - Designed for analytics
- ✅ **Real-time data** - Direct from Analytics Engine
- ✅ **Time series support** - Built for dashboard visualizations
