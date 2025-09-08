import { z } from 'zod';

// NullShot Analytics Engine Data Structures
export interface AnalyticsDataPoint {
  timestamp?: number;           // Unix timestamp (defaults to now)
  dimensions?: {                // Categorical data for grouping (optional per docs)
    [key: string]: string | number | boolean;  // Support all primitive types per docs
  };
  metrics?: {                  // Numerical measurements (optional per docs)
    [key: string]: number;
  };
  metadata?: {                 // Additional context
    [key: string]: any;
  };
}

export interface AnalyticsQueryResult {
  data: any[];
  meta: {
    rows: number;
    duration: number;
    query: string;
    timestamp: number;
  };
}

export interface MetricsOptions {
  timeRange: { start: string; end: string };  // Date range object
  dimensions?: string[];       // Grouping dimensions
  filters?: Record<string, any>;
}

export interface MetricsResult {
  metrics: Record<string, number>;
  dimensions: Record<string, any>;
  timeRange: { start: string; end: string };
  timestamp: number;
}

export interface TimeSeriesOptions {
  timeRange: { start: string; end: string };
  interval?: string;           // 1m, 5m, 1h, 1d
  filters?: Record<string, any>;
}

export interface TimeSeriesResult {
  data: Array<{
    timestamp: number;
    value: number;
    dimensions?: Record<string, string>;
  }>;
  meta: {
    metric: string;
    interval: string;
    timeRange: { start: string; end: string };
  };
}

// Analytics Session for tracking MCP interactions
export interface AnalyticsSession {
  id: string;
  created_at: Date;
  last_activity: Date;
  user_id?: string;
  metadata: Record<string, any>;
}

// Dataset metadata
export interface DatasetInfo {
  name: string;
  description?: string;
  created_at: Date;
  last_updated: Date;
  record_count: number;
  dimensions: string[];
  metrics: string[];
}

// Zod validation schemas
export const AnalyticsDataPointSchema = z.object({
  timestamp: z.number().optional(),
  dimensions: z.record(z.string()),
  metrics: z.record(z.number()),
  metadata: z.record(z.any()).optional()
});

export const TrackMetricSchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  dimensions: z.record(z.string()),
  metrics: z.record(z.number()),
  timestamp: z.number().optional()
});

export const TrackBatchMetricsSchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  dataPoints: z.array(AnalyticsDataPointSchema).min(1, "At least one data point required")
});

export const TrackAgentMetricsSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  userId: z.string().optional(),
  eventType: z.enum(['message_received', 'response_generated', 'error_occurred', 'session_started', 'session_ended']),
  processingTime: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export const QueryAnalyticsSchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
  dataset: z.string().optional()
});

export const GetMetricsSummarySchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  timeRange: z.object({
    start: z.string().describe('Start time (ISO string)'),
    end: z.string().describe('End time (ISO string)')
  }).describe('Time range for the query'),
  dimensions: z.array(z.string()).optional()
});

export const GetTimeSeriesSchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  metric: z.string().min(1, "Metric name is required"),
  interval: z.enum(['1m', '5m', '15m', '1h', '1d']).describe('Time interval for aggregation'),
  timeRange: z.object({
    start: z.string().describe('Start time (ISO string)'),
    end: z.string().describe('End time (ISO string)')
  }).describe('Time range for the query'),
  filters: z.record(z.string()).optional().describe('Dimension filters')
});

export const AnalyzeTrendsSchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  metric: z.string().min(1, "Metric name is required"),
  timeRange: z.enum(['1h', '24h', '7d', '30d']),
});

export const MonitorSystemHealthSchema = z.object({
  systemId: z.string().min(1, "System ID is required"),
  metrics: z.object({
    cpu: z.number().min(0).max(100).optional(),
    memory: z.number().min(0).max(100).optional(),
    connections: z.number().min(0).optional(),
    queueDepth: z.number().min(0).optional(),
    errorRate: z.number().min(0).max(1).optional(),
    responseTime: z.number().min(0).optional()
  })
});

export const DetectAnomaliesSchema = z.object({
  dataset: z.string().min(1, "Dataset name is required"),
  metric: z.string().min(1, "Metric name is required"),
  threshold: z.number().min(0).max(1).optional().default(0.95),
  timeWindow: z.enum(['1h', '24h', '7d']).optional().default('24h')
});

// Environment interface
export interface Env {
  ANALYTICS_MCP_SERVER: DurableObjectNamespace<any>;
  ANALYTICS: AnalyticsEngineDataset;
  
  // Cloudflare Analytics Engine SQL API
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

// Error types
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export class ValidationError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class QueryError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'QUERY_ERROR', details);
  }
}

export class DatasetError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'DATASET_ERROR', details);
  }
}
