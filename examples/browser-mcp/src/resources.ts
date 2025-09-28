import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";

export function setupBrowserResources(
  server: McpServer,
  browserManager: BrowserManager,
  repository: BrowserRepository
): void {
  // Browser Sessions Resource
  server.resource(
    "browser-sessions",
    "browser://sessions",
    {
      description: "Manage browser sessions and their state"
    },
    async (uri: URL) => {
      try {
        const sessions = await browserManager.listSessions();
        const activeSessions = sessions.filter(s => s.status === 'active');
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              sessions,
              summary: {
                total: sessions.length,
                active: activeSessions.length,
                maxSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
                sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS || '300000'),
              },
            }, null, 2),
          }]
        };
      } catch (error) {
        throw new Error(`Failed to get browser sessions: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // System Status Resource
  server.resource(
    "browser-status",
    "browser://status",
    {
      description: "Get current system status and health information"
    },
    async (uri: URL) => {
      try {
        const sessions = await browserManager.listSessions();
        const activeSessions = sessions.filter(s => s.status === 'active');
        const stats = await repository.getScrapingStats();
        
        // Check if we're at session limit
        const isAtLimit = browserManager.isAtSessionLimit();
        
        const status = {
          healthy: true,
          timestamp: new Date().toISOString(),
          sessions: {
            active: activeSessions.length,
            total: sessions.length,
            limit: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
            atLimit: isAtLimit,
          },
          scraping: stats,
          config: {
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MS || '300000'),
            cacheEnabled: true,
            cacheTTL: parseInt(process.env.CACHE_TTL_HOURS || '24'),
            maxPageSize: parseInt(process.env.MAX_PAGE_SIZE_MB || '10'),
          },
          warnings: [] as string[],
        };

        // Add warnings
        if (isAtLimit) {
          status.warnings.push("At maximum concurrent session limit");
        }
        
        if (activeSessions.length > 0) {
          const oldSessions = activeSessions.filter(s => 
            new Date().getTime() - s.lastActivity.getTime() > 300000 // 5 minutes
          );
          if (oldSessions.length > 0) {
            status.warnings.push(`${oldSessions.length} sessions idle for >5 minutes`);
          }
        }

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          }]
        };
      } catch (error) {
        throw new Error(`Failed to get system status: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Scraping Results Resource
  server.resource(
    "browser-results",
    "browser://results",
    {
      description: "View recent scraping results and statistics"
    },
    async (uri: URL) => {
      try {
        const recentResults = await repository.getRecentScrapingResults(50);
        const stats = await repository.getScrapingStats();
        
        // Group results by URL
        const resultsByUrl = recentResults.reduce((acc, result) => {
          if (!acc[result.url]) {
            acc[result.url] = [];
          }
          acc[result.url].push(result);
          return acc;
        }, {} as Record<string, typeof recentResults>);

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              recentResults: recentResults.slice(0, 20),
              stats,
              urlSummary: Object.entries(resultsByUrl).map(([url, results]) => ({
                url,
                count: results.length,
                lastScraped: results[0]?.timestamp,
                avgLoadTime: Math.round(results.reduce((sum, r) => sum + r.metadata.loadTime, 0) / results.length),
              })).slice(0, 10),
            }, null, 2),
          }]
        };
      } catch (error) {
        throw new Error(`Failed to get scraping results: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Page Cache Resource
  server.resource(
    "browser-cache",
    "browser://cache",
    {
      description: "Manage cached page content"
    },
    async (uri: URL) => {
      try {
        if (!repository.cache) {
          return {
            contents: [{
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({
                error: "R2 cache not available",
                message: "Enable R2 in your Cloudflare dashboard to use caching features",
              }, null, 2),
            }]
          };
        }
        
        // Get cache statistics from R2
        const cacheList = await repository.cache.list({ prefix: 'page-cache/' });
        const cacheObjects = cacheList.objects;
        
        const cacheStats = {
          totalCachedPages: cacheObjects.length,
          totalSize: cacheObjects.reduce((sum, obj) => sum + obj.size, 0),
          oldestCache: cacheObjects.length > 0 
            ? Math.min(...cacheObjects.map(obj => new Date(obj.uploaded).getTime()))
            : null,
          newestCache: cacheObjects.length > 0
            ? Math.max(...cacheObjects.map(obj => new Date(obj.uploaded).getTime()))
            : null,
        };

        // Get sample of cached URLs
        const sampleCache = cacheObjects.slice(0, 20).map(obj => {
          const urlPart = obj.key.split('/')[1];
          return {
            url: decodeURIComponent(urlPart || ''),
            size: obj.size,
            uploaded: obj.uploaded,
            key: obj.key,
          };
        });

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              stats: cacheStats,
              sampleCache,
              cacheConfig: {
                ttlHours: parseInt(process.env.CACHE_TTL_HOURS || '24'),
                maxPageSizeMB: parseInt(process.env.MAX_PAGE_SIZE_MB || '10'),
              },
            }, null, 2),
          }]
        };
      } catch (error) {
        throw new Error(`Failed to get cache information: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Extraction Patterns Resource
  server.resource(
    "browser-patterns",
    "browser://patterns",
    {
      description: "Manage extraction patterns for different websites"
    },
    async (uri: URL) => {
      try {
        // Get all patterns using repository SQL method
        const queryResult = await repository.sql.exec(`
          SELECT * FROM extraction_patterns 
          ORDER BY success_rate DESC, last_used DESC 
          LIMIT 50
        `);

        // Convert cursor to array
        const rows = [];
        for (const row of queryResult) {
          rows.push(row);
        }

        const patterns = rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          domain: row.domain,
          selectors: JSON.parse(row.selectors),
          actions: JSON.parse(row.actions),
          successRate: row.success_rate,
          lastUsed: new Date(row.last_used),
          createdAt: new Date(row.created_at),
        }));

        // Group by domain
        const patternsByDomain = patterns.reduce((acc: any, pattern: any) => {
          if (!acc[pattern.domain]) {
            acc[pattern.domain] = [];
          }
          acc[pattern.domain].push(pattern);
          return acc;
        }, {} as Record<string, typeof patterns>);

        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              patterns,
              patternsByDomain,
              stats: {
                totalPatterns: patterns.length,
                uniqueDomains: Object.keys(patternsByDomain).length,
                avgSuccessRate: patterns.length > 0 
                  ? Math.round(patterns.reduce((sum: number, p: any) => sum + p.successRate, 0) / patterns.length)
                  : 0,
              },
            }, null, 2),
          }]
        };
      } catch (error) {
        throw new Error(`Failed to get extraction patterns: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}