import { createMcpWorkersConfig } from "@nullshot/test-utils/vitest/mcpWorkersConfig";

export default createMcpWorkersConfig({
  bindings: {
    ANALYTICS: {
      writeDataPoint: async (dataset: string, data: any) => {
        console.log(`Analytics: Wrote data point to dataset ${dataset}`);
        return Promise.resolve();
      },
      writeDataPoints: async (dataset: string, dataPoints: any[]) => {
        console.log(`Analytics: Wrote ${dataPoints.length} data points to dataset ${dataset}`);
        return Promise.resolve();
      },
      query: async (sql: string) => {
        console.log(`Analytics: Executed query: ${sql}`);
        return Promise.resolve({
          data: [
            { count: 42, avg_time: 150.5 },
            { count: 38, avg_time: 125.2 }
          ]
        });
      },
      getMetrics: async (dataset: string, options: any) => {
        console.log(`Analytics: Got metrics for dataset ${dataset}`);
        return Promise.resolve({
          metrics: { total_events: 100, avg_response_time: 200 },
          rows: 2
        });
      },
      getTimeSeries: async (dataset: string, metric: string, options: any) => {
        console.log(`Analytics: Got time series for ${metric} in dataset ${dataset}`);
        return Promise.resolve({
          data: [
            { timestamp: Date.now(), value: 100 },
            { timestamp: Date.now() + 60000, value: 120 }
          ]
        });
      }
    }
  }
});
