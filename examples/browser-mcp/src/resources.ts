import { Resource } from "@nullshot/mcp";
import { BrowserManager } from "./browser-manager.js";
import { BrowserRepository } from "./repository.js";

export function createBrowserResources(
  browserManager: BrowserManager,
  repository: BrowserRepository
): Resource[] {
  return [
    // Browser Sessions Resource
    {
      uri: "browser://sessions",
      name: "Browser Sessions",
      description: "Manage browser sessions and their state",
      mimeType: "application/json",
      handler: async () => {
        try {
          const sessions = await browserManager.listSessions();
          const activeSessions = sessions.filter(s => s.status === 'active');
          
          return {
            contents: [
              {
                uri: "browser://sessions",
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
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get browser sessions: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Individual Session Resource
    {
      uri: "browser://sessions/{sessionId}",
      name: "Browser Session Details",
      description: "Get details about a specific browser session",
      mimeType: "application/json",
      handler: async (args: { sessionId: string }) => {
        try {
          const sessionMetadata = await browserManager.getSessionMetadata(args.sessionId);
          const sessionFromDb = await repository.getBrowserSession(args.sessionId);
          
          if (!sessionMetadata && !sessionFromDb) {
            throw new Error(`Session ${args.sessionId} not found`);
          }

          const sessionData = sessionMetadata || sessionFromDb;
          
          // Get recent activity for this session
          const recentResults = await repository.getRecentScrapingResults(20);
          const sessionActivity = recentResults.filter(r => r.sessionId === args.sessionId);

          return {
            contents: [
              {
                uri: `browser://sessions/${args.sessionId}`,
                mimeType: "application/json",
                text: JSON.stringify({
                  session: sessionData,
                  recentActivity: sessionActivity.slice(0, 10),
                  stats: {
                    totalActions: sessionActivity.length,
                    lastActivity: sessionActivity[0]?.timestamp,
                    avgLoadTime: sessionActivity.length > 0 
                      ? Math.round(sessionActivity.reduce((sum, r) => sum + r.metadata.loadTime, 0) / sessionActivity.length)
                      : 0,
                  },
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get session details: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Scraping Results Resource
    {
      uri: "browser://results",
      name: "Scraping Results",
      description: "View recent scraping results and statistics",
      mimeType: "application/json",
      handler: async () => {
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
            contents: [
              {
                uri: "browser://results",
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
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get scraping results: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Specific URL Results Resource
    {
      uri: "browser://results/{url}",
      name: "URL Scraping Results",
      description: "Get scraping results for a specific URL",
      mimeType: "application/json",
      handler: async (args: { url: string }) => {
        try {
          const decodedUrl = decodeURIComponent(args.url);
          const results = await repository.getScrapingResultsByUrl(decodedUrl, 20);
          
          if (results.length === 0) {
            return {
              contents: [
                {
                  uri: `browser://results/${args.url}`,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    url: decodedUrl,
                    results: [],
                    message: "No scraping results found for this URL",
                  }, null, 2),
                },
              ],
            };
          }

          const stats = {
            totalResults: results.length,
            avgLoadTime: Math.round(results.reduce((sum, r) => sum + r.metadata.loadTime, 0) / results.length),
            successRate: Math.round((results.filter(r => r.metadata.statusCode >= 200 && r.metadata.statusCode < 300).length / results.length) * 100),
            firstScraped: results[results.length - 1]?.timestamp,
            lastScraped: results[0]?.timestamp,
          };

          return {
            contents: [
              {
                uri: `browser://results/${args.url}`,
                mimeType: "application/json",
                text: JSON.stringify({
                  url: decodedUrl,
                  results,
                  stats,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get URL results: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Page Cache Resource
    {
      uri: "browser://cache",
      name: "Page Cache",
      description: "Manage cached page content",
      mimeType: "application/json",
      handler: async () => {
        try {
          if (!repository.cache) {
            return {
              contents: [
                {
                  uri: "browser://cache",
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "R2 cache not available",
                    message: "Enable R2 in your Cloudflare dashboard to use caching features",
                  }, null, 2),
                },
              ],
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
            contents: [
              {
                uri: "browser://cache",
                mimeType: "application/json",
                text: JSON.stringify({
                  stats: cacheStats,
                  sampleCache,
                  cacheConfig: {
                    ttlHours: parseInt(process.env.CACHE_TTL_HOURS || '24'),
                    maxPageSizeMB: parseInt(process.env.MAX_PAGE_SIZE_MB || '10'),
                  },
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get cache information: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Cached Page Content Resource
    {
      uri: "browser://cache/{url}",
      name: "Cached Page Content",
      description: "Get cached content for a specific URL",
      mimeType: "text/html",
      handler: async (args: { url: string }) => {
        try {
          const decodedUrl = decodeURIComponent(args.url);
          const cachedPage = await repository.getCachedPageContent(decodedUrl);
          
          if (!cachedPage) {
            return {
              contents: [
                {
                  uri: `browser://cache/${args.url}`,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    url: decodedUrl,
                    cached: false,
                    message: "No cached content found for this URL",
                  }, null, 2),
                },
              ],
            };
          }

          return {
            contents: [
              {
                uri: `browser://cache/${args.url}`,
                mimeType: cachedPage.contentType,
                text: cachedPage.content,
              },
              {
                uri: `browser://cache/${args.url}/metadata`,
                mimeType: "application/json",
                text: JSON.stringify({
                  url: cachedPage.url,
                  timestamp: cachedPage.timestamp,
                  contentType: cachedPage.contentType,
                  size: cachedPage.size,
                  ttl: cachedPage.ttl,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get cached content: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Extraction Patterns Resource
    {
      uri: "browser://patterns",
      name: "Extraction Patterns",
      description: "Manage extraction patterns for different websites",
      mimeType: "application/json",
      handler: async () => {
        try {
          // Get all patterns from database
          const allPatterns = await repository.db.prepare(`
            SELECT * FROM extraction_patterns 
            ORDER BY success_rate DESC, last_used DESC 
            LIMIT 50
          `).all();

          const patterns = allPatterns.results.map((row: any) => ({
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
          const patternsByDomain = patterns.reduce((acc, pattern) => {
            if (!acc[pattern.domain]) {
              acc[pattern.domain] = [];
            }
            acc[pattern.domain].push(pattern);
            return acc;
          }, {} as Record<string, typeof patterns>);

          return {
            contents: [
              {
                uri: "browser://patterns",
                mimeType: "application/json",
                text: JSON.stringify({
                  patterns,
                  patternsByDomain,
                  stats: {
                    totalPatterns: patterns.length,
                    uniqueDomains: Object.keys(patternsByDomain).length,
                    avgSuccessRate: patterns.length > 0 
                      ? Math.round(patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length)
                      : 0,
                  },
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get extraction patterns: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // Domain-specific Patterns Resource
    {
      uri: "browser://patterns/{domain}",
      name: "Domain Extraction Patterns",
      description: "Get extraction patterns for a specific domain",
      mimeType: "application/json",
      handler: async (args: { domain: string }) => {
        try {
          const patterns = await repository.getExtractionPatternsByDomain(args.domain);
          
          return {
            contents: [
              {
                uri: `browser://patterns/${args.domain}`,
                mimeType: "application/json",
                text: JSON.stringify({
                  domain: args.domain,
                  patterns,
                  stats: {
                    totalPatterns: patterns.length,
                    avgSuccessRate: patterns.length > 0
                      ? Math.round(patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length)
                      : 0,
                    mostRecentlyUsed: patterns.length > 0 ? patterns[0].lastUsed : null,
                  },
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get domain patterns: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },

    // System Status Resource
    {
      uri: "browser://status",
      name: "Browser System Status",
      description: "Get current system status and health information",
      mimeType: "application/json",
      handler: async () => {
        try {
          const sessions = await browserManager.listSessions();
          const activeSessions = sessions.filter(s => s.status === 'active');
          const stats = await repository.getScrapingStats();
          
          // Check if we're at session limit
          const isAtLimit = browserManager.isAtSessionLimit();
          const sessionCount = browserManager.getSessionCount();
          
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
            warnings: [],
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
            contents: [
              {
                uri: "browser://status",
                mimeType: "application/json",
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to get system status: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    },
  ];
}
