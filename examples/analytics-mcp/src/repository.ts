import {
  AnalyticsDataPoint,
  AnalyticsQueryResult,
  MetricsOptions,
  MetricsResult,
  TimeSeriesOptions,
  TimeSeriesResult,
  DatasetInfo,
  AnalyticsError,
  QueryError,
  Env
} from './schema';

export class AnalyticsRepository {
  constructor(
    private env: Env,
    private sessionId: string
  ) {}

  // Simple initialization - no database setup needed for Analytics Engine
  async initializeDatabase(): Promise<void> {
    // Analytics Engine is a managed service - no initialization required
    console.log('Analytics MCP Repository initialized for session:', this.sessionId);
  }

  // Simple session creation - just return session info without D1 storage
  async createSession(): Promise<void> {
    console.log('Analytics session created:', this.sessionId);
  }

  // Data Writing Operations - Direct Analytics Engine calls as per documentation
  async writeDataPoint(dataset: string, data: AnalyticsDataPoint): Promise<void> {
    try {
      // Direct call to Analytics Engine as shown in documentation
      await this.env.ANALYTICS.writeDataPoint(dataset, data);
      
      console.log(`Analytics: Wrote data point to dataset ${dataset}`);
    } catch (error) {
      console.error('Failed to write data point:', error);
      throw new AnalyticsError(
        `Failed to write data point to dataset ${dataset}`,
        'WRITE_ERROR',
        error
      );
    }
  }

  async writeDataPoints(dataset: string, dataPoints: AnalyticsDataPoint[]): Promise<void> {
    try {
      // Direct call to Analytics Engine as shown in documentation
      await this.env.ANALYTICS.writeDataPoints(dataset, dataPoints);
      
      console.log(`Analytics: Wrote ${dataPoints.length} data points to dataset ${dataset}`);
    } catch (error) {
      console.error('Failed to write data points:', error);
      throw new AnalyticsError(
        `Failed to write ${dataPoints.length} data points to dataset ${dataset}`,
        'BATCH_WRITE_ERROR',
        error
      );
    }
  }

  // Query Operations - Direct Analytics Engine calls as per documentation
  async query(sql: string): Promise<AnalyticsQueryResult> {
    try {
      // Direct call to Analytics Engine as shown in documentation
      const result = await this.env.ANALYTICS.query(sql);
      
      return {
        data: result.data || [],
        meta: {
          rows: result.data?.length || 0,
          duration: 0,
          query: sql,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Analytics query failed:', error);
      throw new QueryError(
        `Analytics query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sql, error }
      );
    }
  }

  async getMetrics(dataset: string, options: MetricsOptions): Promise<MetricsResult> {
    try {
      // Direct call to Analytics Engine as shown in documentation
      const result = await this.env.ANALYTICS.getMetrics(dataset, options);
      
      return {
        dataset,
        timeRange: options.timeRange,
        metrics: result.metrics || {},
        dimensions: options.dimensions || [],
        meta: {
          rows: result.rows || 0,
          duration: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw new AnalyticsError(
        `Failed to get metrics for dataset ${dataset}`,
        'METRICS_ERROR',
        error
      );
    }
  }

  async getTimeSeries(dataset: string, metric: string, options: TimeSeriesOptions): Promise<TimeSeriesResult> {
    try {
      // Direct call to Analytics Engine as shown in documentation
      const result = await this.env.ANALYTICS.getTimeSeries(dataset, metric, options);
      
      return {
        dataset,
        metric,
        interval: options.interval,
        timeRange: options.timeRange,
        data: result.data || [],
        meta: {
          points: result.data?.length || 0,
          duration: 0,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('Failed to get time series:', error);
      throw new AnalyticsError(
        `Failed to get time series for metric ${metric} in dataset ${dataset}`,
        'TIMESERIES_ERROR',
        error
      );
    }
  }

  // Helper method for agent metrics - simplified
  async trackAgentMetrics(
    agentId: string,
    eventType: string,
    userId?: string,
    processingTime?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const dataPoint: AnalyticsDataPoint = {
      timestamp: Date.now(),
      dimensions: {
        agentId,
        eventType,
        ...(userId && { userId })
      },
      metrics: {
        ...(processingTime && { processingTime })
      },
      ...(metadata && { metadata })
    };

    await this.writeDataPoint('agent_metrics', dataPoint);
  }

  // Utility methods - simplified without D1 database operations
  async listDatasets(): Promise<DatasetInfo[]> {
    // Return mock datasets since Analytics Engine doesn't provide a list API
    return [
      {
        name: 'agent_metrics',
        description: 'Agent performance and interaction metrics',
        created_at: new Date(),
        last_updated: new Date(),
        record_count: 0
      },
      {
        name: 'user_events',
        description: 'User interaction events',
        created_at: new Date(),
        last_updated: new Date(),
        record_count: 0
      }
    ];
  }

  async getDatasetInfo(dataset: string): Promise<DatasetInfo> {
    // Return mock dataset info since Analytics Engine doesn't provide detailed info API
    return {
      name: dataset,
      description: `Analytics dataset: ${dataset}`,
      created_at: new Date(),
      last_updated: new Date(),
      record_count: 0
    };
  }

  // Simple trend analysis using SQL queries
  async analyzeTrends(dataset: string, metric: string, timeRange: string): Promise<any> {
    const sql = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as time_bucket,
        AVG(metrics.${metric}) as avg_value,
        COUNT(*) as count
      FROM ${dataset}
      WHERE timestamp > NOW() - INTERVAL '${timeRange}'
      GROUP BY time_bucket
      ORDER BY time_bucket
    `;

    return await this.query(sql);
  }

  // Simple anomaly detection using SQL
  async detectAnomalies(dataset: string, metric: string, threshold: number = 2): Promise<any> {
    const sql = `
      WITH stats AS (
        SELECT 
          AVG(metrics.${metric}) as mean_value,
          STDDEV(metrics.${metric}) as std_dev
        FROM ${dataset}
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      )
      SELECT 
        timestamp,
        metrics.${metric} as value,
        dimensions
      FROM ${dataset}, stats
      WHERE timestamp > NOW() - INTERVAL '1 hour'
        AND ABS(metrics.${metric} - stats.mean_value) > ${threshold} * stats.std_dev
      ORDER BY timestamp DESC
    `;

    return await this.query(sql);
  }

  // System health monitoring
  async monitorSystemHealth(): Promise<any> {
    const sql = `
      SELECT 
        dimensions.agentId,
        COUNT(*) as total_events,
        AVG(CASE WHEN dimensions.eventType = 'error_occurred' THEN 1 ELSE 0 END) as error_rate,
        AVG(metrics.processingTime) as avg_processing_time
      FROM agent_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY dimensions.agentId
      ORDER BY error_rate DESC, avg_processing_time DESC
    `;

    return await this.query(sql);
  }

  // Get recent data for debugging
  async getRecentData(dataset: string, limit: number = 100): Promise<any> {
    const sql = `
      SELECT *
      FROM ${dataset}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return await this.query(sql);
  }
}