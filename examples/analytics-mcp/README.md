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

**For other use cases**, you'll need to adapt the data structure and tool configurations (see [Adaptation Guide](#adapting-for-your-use-case) below).

## 📊 **Demonstrated Features**

This GitHub PR analytics example showcases:

### **Core MCP + Analytics Engine Integration:**
- **Real-time data collection** - Track GitHub PR metrics as they happen
- **Flexible SQL querying** - Query analytics data with any SQL
- **Time-series analysis** - Analyze PR trends over time (18+ data points)
- **Interactive tools** - Professional analytics interface via MCP Inspector
- **AI agent compatibility** - Agents can query and analyze repository data

### **Analytics Capabilities:**
- **Trend analysis** - Track PR velocity changes (e.g., 100% improvement in merges)
- **Summary statistics** - Aggregate metrics (avg 5.06 PRs created/day)
- **Date filtering** - Analyze specific time periods (7d, 30d ranges)
- **Multiple metrics** - Track created, merged, closed PRs simultaneously
- **Real insights** - Actionable data about development team productivity

### **Technical Features:**
- **Batch data ingestion** - Add multiple data points efficiently
- **Schema validation** - Type-safe analytics operations
- **Error handling** - Graceful failure handling and validation
- **Test coverage** - Comprehensive integration tests (14/14 passing)

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

## Technical Architecture

### NullShot Analytics Engine Integration

This example integrates with NullShot's Analytics Engine, which provides:

- **Time-Series Optimized**: High-frequency metric ingestion with 90-day retention
- **SQL Querying**: Familiar SQL interface for data analysis
- **Real-Time Analytics**: Query data immediately after writing
- **Cost Effective**: Pay per data point written, not storage
- **Global Distribution**: Low-latency worldwide access

### Data Model

Analytics data follows this structure:

```typescript
interface AnalyticsDataPoint {
  timestamp?: number;           // Unix timestamp (defaults to now)
  dimensions: {                 // Categorical data for grouping
    [key: string]: string;
  };
  metrics: {                   // Numerical measurements
    [key: string]: number;
  };
  metadata?: {                 // Additional context
    [key: string]: any;
  };
}
```

## Available MCP Tools

### Data Writing Tools

#### `track_metric`
Record individual events or metrics with dimensions and numerical values.

**Parameters:**
- `dataset` (required): Dataset name (e.g., "user_events", "system_metrics")
- `dimensions` (required): Categorical data object for grouping
- `metrics` (required): Numerical measurements object
- `timestamp` (optional): Custom timestamp (defaults to current time)

**Example:**
```json
{
  "tool": "track_metric",
  "dataset": "user_events",
  "dimensions": {
    "event_type": "user_login",
    "source": "web",
    "region": "us-west"
  },
  "metrics": {
    "response_time": 150,
    "success": 1
  }
}
```

#### `track_batch_metrics`
Submit multiple metrics efficiently in a single batch operation.

**Parameters:**
- `dataset` (required): Target dataset name
- `dataPoints` (required): Array of AnalyticsDataPoint objects

**Example:**
```json
{
  "tool": "track_batch_metrics",
  "dataset": "page_views",
  "dataPoints": [
    {
      "dimensions": {"page": "home", "user_type": "new"},
      "metrics": {"load_time": 200, "bounce": 0}
    },
    {
      "dimensions": {"page": "about", "user_type": "returning"},
      "metrics": {"load_time": 180, "bounce": 1}
    }
  ]
}
```

#### `track_agent_metrics`
Specialized tool for AI agent performance tracking.

**Parameters:**
- `agentId` (required): Agent identifier
- `eventType` (required): Event type (message_received, response_generated, error_occurred, session_started, session_ended)
- `userId` (optional): User identifier
- `processingTime` (optional): Processing time in milliseconds
- `metadata` (optional): Additional context data

**Example:**
```json
{
  "tool": "track_agent_metrics",
  "agentId": "analytics-assistant-v1",
  "eventType": "response_generated",
  "userId": "user123",
  "processingTime": 1250,
  "metadata": {
    "model": "gpt-4",
    "tokens": 500,
    "query_complexity": "high"
  }
}
```

### Query & Analysis Tools

#### `query_analytics`
Execute SQL queries against analytics data with full SQL support.

**Parameters:**
- `sql` (required): SQL query string
- `dataset` (optional): Specific dataset to query

**Example:**
```json
{
  "tool": "query_analytics",
  "sql": "SELECT dimensions.agentId, AVG(metrics.processingTime) as avg_time, COUNT(*) as total FROM agent_metrics WHERE timestamp > 1704067200000 AND dimensions.eventType = 'response_generated' GROUP BY dimensions.agentId ORDER BY avg_time DESC"
}
```

#### `get_metrics_summary`
Get predefined metric summaries with time ranges and grouping.

**Parameters:**
- `dataset` (required): Dataset to analyze
- `timeRange` (required): Time period (1h, 24h, 7d, 30d)
- `dimensions` (optional): Dimensions to group by

**Example:**
```json
{
  "tool": "get_metrics_summary",
  "dataset": "agent_metrics",
  "timeRange": "24h",
  "dimensions": ["agentId", "eventType"]
}
```

#### `get_time_series`
Get time-series data with automatic interval bucketing.

**Parameters:**
- `dataset` (required): Dataset name
- `metric` (required): Metric to analyze
- `timeRange` (required): Analysis period (1h, 24h, 7d, 30d)
- `interval` (optional): Time bucket size (1m, 5m, 15m, 1h, 1d)

**Example:**
```json
{
  "tool": "get_time_series",
  "dataset": "agent_metrics",
  "metric": "processingTime",
  "timeRange": "24h",
  "interval": "1h"
}
```

#### `analyze_trends`
Perform trend analysis on metrics with optional period comparison.

**Parameters:**
- `dataset` (required): Dataset to analyze
- `metrics` (required): Array of metric names to analyze
- `timeRange` (required): Analysis period (1h, 24h, 7d, 30d)
- `comparison` (optional): Compare with previous period

**Example:**
```json
{
  "tool": "analyze_trends",
  "dataset": "system_health",
  "metrics": ["cpu_utilization", "memory_usage", "response_time"],
  "timeRange": "7d",
  "comparison": true
}
```

### System Monitoring Tools

#### `monitor_system_health`
Track system health metrics like CPU, memory, and connections.

**Parameters:**
- `systemId` (required): System identifier
- `metrics` (required): Health metrics object

**Example:**
```json
{
  "tool": "monitor_system_health",
  "systemId": "web-server-01",
  "metrics": {
    "cpu": 45.2,
    "memory": 78.1,
    "connections": 150,
    "queueDepth": 5,
    "errorRate": 0.02,
    "responseTime": 125
  }
}
```

#### `detect_anomalies`
Detect anomalies in metric patterns using statistical analysis.

**Parameters:**
- `dataset` (required): Dataset to monitor
- `metric` (required): Metric to analyze for anomalies
- `threshold` (optional): Anomaly detection threshold (0-1, default: 0.95)
- `timeWindow` (optional): Analysis window (1h, 24h, 7d, default: 24h)

**Example:**
```json
{
  "tool": "detect_anomalies",
  "dataset": "agent_metrics",
  "metric": "processingTime",
  "threshold": 0.95,
  "timeWindow": "24h"
}
```

### Utility Tools

#### `list_datasets`
List available datasets and their metadata.

#### `get_dataset_info`
Get detailed information about a specific dataset.

#### `get_recent_data`
Get recent data points from a dataset with optional filtering.

## MCP Resources

Access live analytics data through these resource URIs:

### Dataset Resources
- `analytics://datasets` - List all available datasets
- `analytics://datasets/{dataset}` - Get dataset information and sample data
- `analytics://datasets/recent/{dataset}` - Recent data points with filtering
- `analytics://datasets/live/{dataset}` - Real-time streaming data

### Dashboard Resources
- `analytics://dashboards` - List available dashboards
- `analytics://dashboards/{dashboardId}` - Get dashboard data and configuration

### Query Resources
- `analytics://queries/{queryId}` - Retrieve cached query results

### Metrics Resources
- `analytics://metrics` - Overview of available metrics across all datasets
- `analytics://metrics/{dataset}` - Available dimensions and metrics for a dataset

## Interactive Prompts

Get help and guidance through interactive prompts:

### `analytics_introduction`
Overview of the analytics service capabilities and common workflows.

### `track_metrics_help`
Learn how to track different types of metrics (agent, system, custom).

**Parameters:**
- `metric_type` (optional): Get specific help for "agent", "system", or "custom" metrics

### `query_builder_help`
Interactive guide for building effective analytics queries.

**Parameters:**
- `query_goal` (optional): What you want to analyze ("performance", "errors", "usage")
- `dataset` (optional): Specific dataset you want to query

### `dashboard_setup`
Guide for setting up analytics dashboards and monitoring.

**Parameters:**
- `use_case` (optional): Dashboard type ("performance", "health", "business")

### `troubleshooting_guide`
Help with common analytics issues and debugging.

**Parameters:**
- `issue_type` (optional): Type of issue ("query_errors", "data_ingestion", "performance")
- `error_message` (optional): Specific error message received

### `performance_optimization`
Tips for optimizing analytics performance and query efficiency.

**Parameters:**
- `optimization_area` (optional): Area to optimize ("queries", "ingestion", "storage")

## Configuration

### Wrangler Configuration (`wrangler.jsonc`)

```jsonc
{
  "name": "analytics-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      {
        "name": "ANALYTICS_MCP_SERVER",
        "class_name": "AnalyticsMcpServer"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["AnalyticsMcpServer"]
    }
  ],
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS",
      "dataset": "mcp_metrics"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "analytics-mcp-db"
    }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### Environment Types

```typescript
interface Env {
  ANALYTICS_MCP_SERVER: DurableObjectNamespace<AnalyticsMcpServer>;
  ANALYTICS: AnalyticsEngineDataset;
  DB: D1Database;
}
```

## Setup and Development

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager
- Wrangler CLI
- Cloudflare account with Analytics Engine access

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Navigate to the analytics-mcp directory:**
   ```bash
   cd examples/analytics-mcp
   ```

3. **Set up Cloudflare resources:**
   ```bash
   # Create D1 database
   npx wrangler d1 create analytics-mcp-db
   
   # Create Analytics Engine dataset (if needed)
   # This is typically created automatically when first used
   ```

4. **Update wrangler.jsonc with your database ID:**
   ```jsonc
   {
     "d1_databases": [
       {
         "binding": "DB",
         "database_name": "analytics-mcp-db",
         "database_id": "your-database-id-here"
       }
     ]
   }
   ```

### Development

1. **Start development server:**
   ```bash
   pnpm dev
   # or: npx wrangler dev
   ```

2. **Run tests:**
   ```bash
   pnpm test
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

### Deployment

1. **Deploy to Cloudflare:**
   ```bash
   pnpm deploy
   # or: npx wrangler deploy
   ```

2. **Verify deployment:**
   ```bash
   curl https://your-worker-url.workers.dev/health
   ```

## Using the MCP Inspector

1. **Start your Worker:**
   ```bash
   pnpm dev
   ```

2. **In a new terminal, run the MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector
   ```

3. **Open the Inspector:**
   - Navigate to http://localhost:6274
   - Use the session token if prompted

4. **Configure the connection:**
   - Set transport to "Streamable HTTP"
   - Enter your Worker URL: http://127.0.0.1:8787

5. **Explore the available tools:**
   - `track_metric`: Record individual data points
   - `track_batch_metrics`: Submit multiple metrics efficiently
   - `track_agent_metrics`: Monitor AI agent performance
   - `query_analytics`: Execute SQL queries
   - `get_metrics_summary`: Get predefined summaries
   - `get_time_series`: Analyze metrics over time
   - `analyze_trends`: Identify patterns and changes
   - `monitor_system_health`: Track system resources
   - `detect_anomalies`: Find unusual patterns
   - `list_datasets`: See available datasets
   - `get_dataset_info`: Get dataset details
   - `get_recent_data`: Access recent data points

## Usage Examples

### Example 1: Track User Events

```json
{
  "tool": "track_metric",
  "dataset": "user_events",
  "dimensions": {
    "event_type": "purchase",
    "product_category": "electronics",
    "user_segment": "premium",
    "region": "us-west"
  },
  "metrics": {
    "order_value": 299.99,
    "items_count": 3,
    "processing_time": 850
  }
}
```

### Example 2: Monitor Agent Performance

```json
{
  "tool": "track_agent_metrics",
  "agentId": "customer-support-bot",
  "eventType": "response_generated",
  "userId": "customer_12345",
  "processingTime": 1200,
  "metadata": {
    "intent": "product_inquiry",
    "confidence": 0.95,
    "escalated": false
  }
}
```

### Example 3: Analyze Performance Trends

```json
{
  "tool": "query_analytics",
  "sql": "SELECT DATE_TRUNC('hour', timestamp) as hour, AVG(metrics.processingTime) as avg_time, COUNT(*) as requests FROM agent_metrics WHERE timestamp > 1704067200000 AND dimensions.eventType = 'response_generated' GROUP BY hour ORDER BY hour"
}
```

### Example 4: Get Real-time Dashboard Data

Access the overview dashboard via MCP resource:
```
analytics://dashboards/overview
```

This returns live dashboard data with current metrics and visualizations.

### Example 5: Detect Performance Anomalies

```json
{
  "tool": "detect_anomalies",
  "dataset": "agent_metrics",
  "metric": "processingTime",
  "threshold": 0.95,
  "timeWindow": "24h"
}
```

## 🔧 **Adapting for Your Use Case**

While this example demonstrates GitHub PR analytics, you can adapt it for any analytics use case by understanding the data structure and modifying the tools.

### **Understanding the Current Data Structure**

The GitHub implementation uses this Analytics Engine schema:
```sql
-- Current GitHub PR data structure
blob1: repository name ("null-shot/typescript-agent-framework")  
blob2: event type ("daily_pr_stats", "repository_snapshot")
blob3: date ("2025-08-06", "2025-08-07")
double1: PRs created count
double2: PRs merged count  
double3: PRs closed count
timestamp: Analytics Engine write time (auto-generated)
```

### **Adapting for Other Use Cases**

#### **Example: E-commerce Analytics**
```json
// track_metric for e-commerce
{
  "dataset": "ecommerce_events",
  "dimensions": {
    "event_type": "purchase_completed",    // blob2
    "product_category": "electronics",     // blob3  
    "payment_method": "credit_card",       // blob4
    "date": "2025-09-04"                   // blob5
  },
  "metrics": {
    "order_value": 299.99,                 // double1
    "quantity": 2,                         // double2
    "shipping_cost": 15.99                 // double3
  }
}
```

#### **Example: API Analytics**  
```json
// track_metric for API monitoring
{
  "dataset": "api_metrics",
  "dimensions": {
    "event_type": "api_request",           // blob2
    "endpoint": "/api/users",              // blob3
    "method": "GET",                       // blob4
    "status_class": "2xx"                  // blob5
  },
  "metrics": {
    "response_time": 145,                  // double1
    "request_count": 1,                    // double2  
    "error_count": 0                       // double3
  }
}
```

### **Modifying Advanced Tools for Your Data**

To adapt the GitHub-specific tools (`get_time_series`, `analyze_trends`, `get_metrics_summary`):

#### **1. Update Event Type Filters**
In `src/repository.ts`, change the hardcoded event type:
```typescript
// Current (GitHub-specific)
WHERE blob2 = 'daily_pr_stats'

// Change to your event type
WHERE blob2 = 'your_event_type'
```

#### **2. Update Metric Column Mappings**
Update the metric-to-column mappings:
```typescript
// Current (GitHub-specific)
const metricColumnMap = {
  'prs_created': 'double1',
  'prs_merged': 'double2', 
  'prs_closed': 'double3'
};

// Adapt to your metrics
const metricColumnMap = {
  'your_metric_1': 'double1',
  'your_metric_2': 'double2',
  'your_metric_3': 'double3'  
};
```

#### **3. Update Date Column References**
Change date column assumptions:
```typescript
// Current (assumes dates in blob3)
row.blob3 

// Adapt to your date column  
row.blob4  // or wherever your dates are stored
```

### **Recommended Approach for New Use Cases**

#### **✅ Start with Generic Tools (Work Immediately):**
- **`query_analytics`** - Execute any SQL query on your data
- **`track_metric`** - Add any data structure you need
- **`track_batch_metrics`** - Bulk data ingestion
- **`list_datasets`** - Show your datasets

#### **⚠️ Adapt GitHub-Specific Tools (Require Code Changes):**
- `get_time_series` - Update for your metric names and columns
- `analyze_trends` - Modify for your data structure
- `get_metrics_summary` - Adapt aggregations for your metrics

#### **🚀 Building Your Own Analytics:**

1. **Deploy the MCP server** as-is
2. **Use generic tools** to add your data structure
3. **Query with SQL** to analyze your data
4. **Adapt advanced tools** if you want the convenience features

**Example workflow for web analytics:**
```bash
# 1. Add page view data
# MCP Inspector -> track_metric:
{
  "dataset": "web_analytics",
  "dimensions": {
    "event_type": "page_view",
    "page": "/home",
    "date": "2025-09-04"
  },
  "metrics": {
    "session_duration": 45,
    "page_load_time": 1.2
  }
}

# 2. Query your data  
# MCP Inspector -> query_analytics:
{
  "sql": "SELECT blob3 as page, AVG(double1) as avg_session FROM web_analytics WHERE blob2 = 'page_view' GROUP BY blob3"
}
```

## Performance Considerations

### Query Optimization
- Always include time range filters: `WHERE timestamp > ${Date.now() - 24*60*60*1000}`
- Use LIMIT to control result sizes: `LIMIT 1000`
- Leverage appropriate aggregations: `AVG()`, `COUNT()`, `SUM()`

### Data Ingestion
- Use batch operations for multiple data points
- Keep dimension cardinality reasonable
- Use consistent naming conventions
- Implement retry logic with exponential backoff

### Storage Optimization
- NullShot Analytics Engine has 90-day retention
- Design dimensions for common query patterns
- Use numeric metrics for aggregation
- Consider data aggregation for high-frequency events

## Troubleshooting

### Common Issues

1. **Query Errors**
   - Check SQL syntax and column names
   - Ensure proper data types (strings for dimensions, numbers for metrics)
   - Add time range filters to improve performance

2. **Data Ingestion Issues**
   - Validate data format before submission
   - Check dimension and metric types
   - Use batch operations for better performance

3. **Performance Problems**
   - Add time filters to queries
   - Limit result set sizes
   - Use appropriate indexes and aggregations

### Getting Help

Use the interactive prompts for specific guidance:
- `troubleshooting_guide` - General troubleshooting help
- `performance_optimization` - Performance tuning tips
- `query_builder_help` - SQL query assistance

### Debug Information

Check the health endpoint for system status:
```bash
curl https://your-worker-url.workers.dev/health
```

## License

MIT

## Related Examples

- **CRUD MCP**: Basic CRUD operations with D1 database
- **Expense MCP**: Workflow-based expense approval system
- **Browser MCP**: Web scraping and browser automation

This Analytics MCP example demonstrates real-world time-series analytics capabilities while following the established patterns from other MCP examples in the repository.
