import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerPrompts(server: McpServer) {
  server.prompt(
    'analytics_introduction',
    'Introduction to analytics capabilities',
    () => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: "Welcome to Analytics MCP! Use tools like track_metric, query_analytics, and list_datasets to get started."
          }
        }
      ]
    })
  );

  server.prompt(
    'query_builder',
    'SQL query builder helper',
    {
      dataset: z.string().describe('Dataset name to query')
    },
    async (args) => ({
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Query examples for ${args.dataset}: SELECT * FROM ${args.dataset} WHERE timestamp > NOW() - INTERVAL '24h'`
          }
        }
      ]
    })
  );
}
