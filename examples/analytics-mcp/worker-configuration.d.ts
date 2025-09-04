// Worker configuration types for analytics-mcp

interface Env {
  ANALYTICS_MCP_SERVER: DurableObjectNamespace<import('./src/server').AnalyticsMcpServer>;
  ANALYTICS: AnalyticsEngineDataset;
  DB: D1Database;
}

// Analytics Engine types
interface AnalyticsEngineDataset {
  writeDataPoint(dataset: string, data: any): Promise<void>;
  writeDataPoints(dataset: string, data: any[]): Promise<void>;
  query(sql: string): Promise<any>;
  getMetrics?(dataset: string, options: any): Promise<any>;
  getTimeSeries?(dataset: string, metric: string, options: any): Promise<any>;
}

// Cloudflare Workers types
declare global {
  interface WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  const WebSocketPair: {
    new (): WebSocketPair;
  };
}

export { Env, AnalyticsEngineDataset };
