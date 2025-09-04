import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalyticsRepository } from './repository';

export function setupServerResources(server: McpServer, repository: AnalyticsRepository) {
  // Datasets resource
  server.resource(
    'getDatasets',
    'analytics://datasets',
    async () => {
      try {
        const datasets = await repository.listDatasets();
        
        return {
          contents: [
            {
              type: "text",
              uri: "analytics://datasets",
              text: JSON.stringify({
                success: true,
                data: {
                  datasets,
                  count: datasets.length
                },
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              type: "text",
              uri: "analytics://datasets",
              text: JSON.stringify({
                error: `Failed to list datasets: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  // Dashboards resource
  server.resource(
    'getDashboards',
    'analytics://dashboards',
    async () => {
      try {
        // Mock dashboard data since Analytics Engine doesn't provide dashboard APIs
        const dashboards = [
          {
            id: 'agent-performance',
            name: 'Agent Performance Dashboard',
            description: 'Monitor agent response times, success rates, and error patterns',
            widgets: [
              { type: 'metric', title: 'Average Response Time', query: 'SELECT AVG(metrics.processingTime) FROM agent_metrics' },
              { type: 'chart', title: 'Success Rate Over Time', query: 'SELECT timestamp, success_rate FROM agent_metrics' },
              { type: 'table', title: 'Recent Errors', query: 'SELECT * FROM agent_metrics WHERE eventType = "error_occurred"' }
            ]
          },
          {
            id: 'user-engagement',
            name: 'User Engagement Dashboard',
            description: 'Track user interactions and engagement patterns',
            widgets: [
              { type: 'metric', title: 'Active Users', query: 'SELECT COUNT(DISTINCT dimensions.userId) FROM user_events' },
              { type: 'chart', title: 'Daily Active Users', query: 'SELECT DATE(timestamp), COUNT(DISTINCT dimensions.userId) FROM user_events GROUP BY DATE(timestamp)' }
            ]
          }
        ];
        
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                dashboards,
                count: dashboards.length,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Failed to load dashboards: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  // Query templates resource
  server.resource(
    'getQueryTemplates',
    'analytics://query-templates',
    async () => {
      try {
        const templates = [
          {
            name: 'Agent Performance Summary',
            description: 'Get overall agent performance metrics',
            sql: `
              SELECT 
                dimensions.agentId,
                COUNT(*) as total_events,
                AVG(metrics.processingTime) as avg_processing_time,
                SUM(CASE WHEN dimensions.eventType = 'error_occurred' THEN 1 ELSE 0 END) as error_count
              FROM agent_metrics 
              WHERE timestamp > NOW() - INTERVAL '24 hours'
              GROUP BY dimensions.agentId
              ORDER BY total_events DESC
            `
          },
          {
            name: 'User Activity Trends',
            description: 'Analyze user activity patterns over time',
            sql: `
              SELECT 
                DATE_TRUNC('hour', timestamp) as hour,
                COUNT(DISTINCT dimensions.userId) as active_users,
                COUNT(*) as total_events
              FROM user_events 
              WHERE timestamp > NOW() - INTERVAL '7 days'
              GROUP BY hour
              ORDER BY hour
            `
          },
          {
            name: 'Error Rate Analysis',
            description: 'Monitor error rates across different components',
            sql: `
              SELECT 
                dimensions.component,
                COUNT(*) as total_events,
                SUM(CASE WHEN dimensions.eventType LIKE '%error%' THEN 1 ELSE 0 END) as error_count,
                (SUM(CASE WHEN dimensions.eventType LIKE '%error%' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as error_rate
              FROM system_events 
              WHERE timestamp > NOW() - INTERVAL '1 day'
              GROUP BY dimensions.component
              ORDER BY error_rate DESC
            `
          }
        ];
        
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                templates,
                count: templates.length,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Failed to load query templates: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  // Metrics catalog resource
  server.resource(
    'getMetricsCatalog',
    'analytics://metrics-catalog',
    async () => {
      try {
        const metrics = [
          {
            name: 'processingTime',
            type: 'gauge',
            unit: 'milliseconds',
            description: 'Time taken to process a request or operation',
            datasets: ['agent_metrics', 'system_events']
          },
          {
            name: 'responseTime',
            type: 'gauge',
            unit: 'milliseconds',
            description: 'End-to-end response time for user requests',
            datasets: ['user_events', 'api_metrics']
          },
          {
            name: 'errorCount',
            type: 'counter',
            unit: 'count',
            description: 'Number of errors or failures',
            datasets: ['agent_metrics', 'system_events', 'api_metrics']
          },
          {
            name: 'successRate',
            type: 'gauge',
            unit: 'percentage',
            description: 'Percentage of successful operations',
            datasets: ['agent_metrics', 'api_metrics']
          },
          {
            name: 'activeUsers',
            type: 'gauge',
            unit: 'count',
            description: 'Number of active users in a time period',
            datasets: ['user_events']
          }
        ];
        
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                metrics,
                count: metrics.length,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Failed to load metrics catalog: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );

  // System status resource
  server.resource(
    'getSystemStatus',
    'analytics://system-status',
    async () => {
      try {
        const status = await repository.monitorSystemHealth();
        
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                health_data: status,
                uptime: process.uptime(),
                version: '1.0.0'
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          contents: [
            {
              type: "text",
              text: JSON.stringify({
                status: 'error',
                error: `Failed to get system status: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    }
  );
}