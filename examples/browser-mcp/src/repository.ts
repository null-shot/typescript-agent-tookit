import { ScrapingResult, PageCache, ExtractionPattern, BrowserSession } from "./schema.js";

export class BrowserRepository {
  constructor(public sql: DurableObjectStorage["sql"], public cache?: R2Bucket) {}

  // Helper method to convert SqlStorageCursor to array
  private async cursorToArray(cursor: any): Promise<any[]> {
    const rows: any[] = [];
    for (const row of cursor) {
      rows.push(row);
    }
    return rows;
  }

  // Initialize database tables
  async initialize(): Promise<void> {
    try {
      // Create scraping_results table
      await this.sql.exec('CREATE TABLE IF NOT EXISTS scraping_results (id TEXT PRIMARY KEY, session_id TEXT, url TEXT NOT NULL, timestamp INTEGER NOT NULL, data TEXT NOT NULL, title TEXT, description TEXT, load_time INTEGER NOT NULL, status_code INTEGER NOT NULL, content_length INTEGER, screenshot TEXT, created_at INTEGER NOT NULL)');

      // Create extraction_patterns table
      await this.sql.exec('CREATE TABLE IF NOT EXISTS extraction_patterns (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, domain TEXT NOT NULL, selectors TEXT NOT NULL, actions TEXT, success_rate REAL NOT NULL DEFAULT 0.0, last_used INTEGER NOT NULL, created_at INTEGER NOT NULL)');

      // Create browser_sessions table
      await this.sql.exec('CREATE TABLE IF NOT EXISTS browser_sessions (id TEXT PRIMARY KEY, url TEXT NOT NULL, viewport TEXT NOT NULL, user_agent TEXT, cookies TEXT, status TEXT NOT NULL DEFAULT "active", created_at INTEGER NOT NULL, last_activity INTEGER NOT NULL)');

      // Create indexes
      await this.sql.exec('CREATE INDEX IF NOT EXISTS idx_scraping_results_url ON scraping_results(url)');
      await this.sql.exec('CREATE INDEX IF NOT EXISTS idx_scraping_results_timestamp ON scraping_results(timestamp)');
      await this.sql.exec('CREATE INDEX IF NOT EXISTS idx_extraction_patterns_domain ON extraction_patterns(domain)');
      await this.sql.exec('CREATE INDEX IF NOT EXISTS idx_browser_sessions_status ON browser_sessions(status)');
      
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  // Scraping Results
  async saveScrapingResult(result: ScrapingResult): Promise<void> {
    await this.sql.exec(`
      INSERT OR REPLACE INTO scraping_results (
        id, session_id, url, timestamp, data, title, description, 
        load_time, status_code, content_length, screenshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      result.id,
      result.sessionId || null,
      result.url,
      result.timestamp.getTime(),
      JSON.stringify(result.data),
      result.metadata.title || null,
      result.metadata.description || null,
      result.metadata.loadTime,
      result.metadata.statusCode,
      result.metadata.contentLength || null,
      result.metadata.screenshot || null,
      result.timestamp.getTime() // created_at
    );
  }

  async getScrapingResult(id: string): Promise<ScrapingResult | null> {
    const queryResult = await this.sql.exec(`SELECT * FROM scraping_results WHERE id = ?`, id);
    const rows = await this.cursorToArray(queryResult);
    const result = rows[0];

    if (!result) return null;

    return {
      id: result.id as string,
      sessionId: result.session_id as string || undefined,
      url: result.url as string,
      timestamp: new Date(result.timestamp as number),
      data: JSON.parse(result.data as string),
      metadata: {
        title: result.title as string || undefined,
        description: result.description as string || undefined,
        loadTime: result.load_time as number,
        statusCode: result.status_code as number,
        contentLength: result.content_length as number || undefined,
        screenshot: result.screenshot as string || undefined,
      },
    };
  }

  async getScrapingResultsByUrl(url: string, limit = 10): Promise<ScrapingResult[]> {
    const queryResult = await this.sql.exec(`
      SELECT * FROM scraping_results 
      WHERE url = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, url, limit);

    const rows = await this.cursorToArray(queryResult);
    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id || undefined,
      url: row.url,
      timestamp: new Date(row.timestamp),
      data: JSON.parse(row.data),
      metadata: {
        title: row.title || undefined,
        description: row.description || undefined,
        loadTime: row.load_time,
        statusCode: row.status_code,
        contentLength: row.content_length || undefined,
        screenshot: row.screenshot || undefined,
      },
    }));
  }

  async getRecentScrapingResults(limit = 50): Promise<ScrapingResult[]> {
    const queryResult = await this.sql.exec(`
      SELECT * FROM scraping_results 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, limit);

    const rows = await this.cursorToArray(queryResult);
    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id || undefined,
      url: row.url,
      timestamp: new Date(row.timestamp),
      data: JSON.parse(row.data),
      metadata: {
        title: row.title || undefined,
        description: row.description || undefined,
        loadTime: row.load_time,
        statusCode: row.status_code,
        contentLength: row.content_length || undefined,
        screenshot: row.screenshot || undefined,
      },
    }));
  }

  // Page Cache (using R2)
  async cachePageContent(cache: PageCache): Promise<void> {
    if (!this.cache) {
      console.warn("R2 cache not available, skipping page caching");
      return;
    }
    
    const key = `page-cache/${encodeURIComponent(cache.url)}/${cache.id}`;
    const metadata = {
      url: cache.url,
      timestamp: cache.timestamp.toISOString(),
      contentType: cache.contentType,
      size: cache.size.toString(),
      ttl: cache.ttl.toString(),
    };

    await this.cache.put(key, cache.content, {
      httpMetadata: {
        contentType: cache.contentType,
      },
      customMetadata: metadata,
    });
  }

  async getCachedPageContent(url: string): Promise<PageCache | null> {
    if (!this.cache) {
      return null;
    }
    
    const encodedUrl = encodeURIComponent(url);
    const list = await this.cache.list({ prefix: `page-cache/${encodedUrl}/` });
    
    if (list.objects.length === 0) return null;

    // Get the most recent cache entry
    const latestObject = list.objects.sort((a, b) => 
      new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime()
    )[0];

    const object = await this.cache.get(latestObject.key);
    if (!object) return null;

    const content = await object.text();
    const metadata = object.customMetadata || {};

    return {
      id: latestObject.key.split('/').pop() || '',
      url: metadata.url || url,
      content,
      timestamp: new Date(metadata.timestamp || latestObject.uploaded),
      contentType: metadata.contentType || 'text/html',
      size: parseInt(metadata.size || '0'),
      ttl: parseInt(metadata.ttl || '86400'),
    };
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.cache) {
      return;
    }
    
    const list = await this.cache.list({ prefix: 'page-cache/' });
    const now = new Date();

    for (const object of list.objects) {
      const obj = await this.cache.get(object.key);
      if (!obj) continue;

      const metadata = obj.customMetadata || {};
      const ttl = parseInt(metadata.ttl || '86400') * 1000; // Convert to ms
      const timestamp = new Date(metadata.timestamp || object.uploaded);
      
      if (now.getTime() - timestamp.getTime() > ttl) {
        await this.cache.delete(object.key);
      }
    }
  }

  // Extraction Patterns
  async saveExtractionPattern(pattern: ExtractionPattern): Promise<void> {
    await this.sql.exec(`
      INSERT OR REPLACE INTO extraction_patterns (
        id, name, description, domain, selectors, actions, 
        success_rate, last_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      pattern.id,
      pattern.name,
      pattern.description,
      pattern.domain,
      JSON.stringify(pattern.selectors),
      JSON.stringify(pattern.actions || []),
      pattern.successRate,
      pattern.lastUsed.getTime(),
      pattern.createdAt.getTime()
    );
  }

  async getExtractionPattern(id: string): Promise<ExtractionPattern | null> {
    const queryResult = await this.sql.exec(`SELECT * FROM extraction_patterns WHERE id = ?`, id);
    const rows = await this.cursorToArray(queryResult);
    const result = rows[0];

    if (!result) return null;

    return {
      id: result.id as string,
      name: result.name as string,
      description: result.description as string,
      domain: result.domain as string,
      selectors: JSON.parse(result.selectors as string),
      actions: JSON.parse(result.actions as string),
      successRate: result.success_rate as number,
      lastUsed: new Date(result.last_used as number),
      createdAt: new Date(result.created_at as number),
    };
  }

  async getExtractionPatternsByDomain(domain: string): Promise<ExtractionPattern[]> {
    const queryResult = await this.sql.exec(`
      SELECT * FROM extraction_patterns 
      WHERE domain = ? 
      ORDER BY success_rate DESC, last_used DESC
    `, domain);

    const rows = await this.cursorToArray(queryResult);
    return rows.map((row: any) => ({
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
  }

  // Browser Sessions
  async saveBrowserSession(session: BrowserSession): Promise<void> {
    await this.sql.exec(`
      INSERT OR REPLACE INTO browser_sessions (
        id, url, viewport, user_agent, cookies, status, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      session.id,
      session.url,
      JSON.stringify(session.viewport),
      session.userAgent || null,
      JSON.stringify(session.cookies || []),
      session.status,
      session.lastActivity.getTime()
    );
  }

  async getBrowserSession(id: string): Promise<BrowserSession | null> {
    const queryResult = await this.sql.exec(`SELECT * FROM browser_sessions WHERE id = ?`, id);
    const rows = await this.cursorToArray(queryResult);
    const result = rows[0];

    if (!result) return null;

    return {
      id: result.id as string,
      url: result.url as string,
      viewport: JSON.parse(result.viewport as string),
      userAgent: result.user_agent as string || undefined,
      cookies: JSON.parse(result.cookies as string),
      status: result.status as 'active' | 'idle' | 'closed',
      createdAt: new Date(result.created_at as number),
      lastActivity: new Date(result.last_activity as number),
    };
  }

  async getActiveBrowserSessions(): Promise<BrowserSession[]> {
    const queryResult = await this.sql.exec(`
      SELECT * FROM browser_sessions 
      WHERE status = 'active' 
      ORDER BY last_activity DESC
    `);

    const rows = await this.cursorToArray(queryResult);
    return rows.map((row: any) => ({
      id: row.id,
      url: row.url,
      viewport: JSON.parse(row.viewport),
      userAgent: row.user_agent || undefined,
      cookies: JSON.parse(row.cookies),
      status: row.status,
      createdAt: new Date(row.created_at),
      lastActivity: new Date(row.last_activity),
    }));
  }

  async deleteBrowserSession(id: string): Promise<void> {
    await this.sql.exec(`DELETE FROM browser_sessions WHERE id = ?`, id);
  }

  // Analytics and Statistics
  async getScrapingStats(): Promise<{
    totalResults: number;
    uniqueUrls: number;
    avgLoadTime: number;
    successRate: number;
  }> {
    const [totalResult, urlResult, avgLoadResult, successResult] = await Promise.all([
      this.sql.exec(`SELECT COUNT(*) as count FROM scraping_results`),
      this.sql.exec(`SELECT COUNT(DISTINCT url) as count FROM scraping_results`),
      this.sql.exec(`SELECT AVG(load_time) as avg FROM scraping_results`),
      this.sql.exec(`
        SELECT 
          COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) * 100.0 / COUNT(*) as rate
        FROM scraping_results
      `),
    ]);

    const totalRows = await this.cursorToArray(totalResult);
    const urlRows = await this.cursorToArray(urlResult);
    const avgLoadRows = await this.cursorToArray(avgLoadResult);
    const successRows = await this.cursorToArray(successResult);
    
    const total = totalRows[0];
    const urls = urlRows[0];
    const avgLoad = avgLoadRows[0];
    const success = successRows[0];

    return {
      totalResults: (total?.count as number) || 0,
      uniqueUrls: (urls?.count as number) || 0,
      avgLoadTime: Math.round((avgLoad?.avg as number) || 0),
      successRate: Math.round((success?.rate as number) || 0),
    };
  }
}
