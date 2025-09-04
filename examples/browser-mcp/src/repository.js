export class BrowserRepository {
    db;
    cache;
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    // Initialize database tables
    async initialize() {
        try {
            // Create scraping_results table
            await this.db.exec('CREATE TABLE IF NOT EXISTS scraping_results (id TEXT PRIMARY KEY, session_id TEXT, url TEXT NOT NULL, timestamp INTEGER NOT NULL, data TEXT NOT NULL, title TEXT, description TEXT, load_time INTEGER NOT NULL, status_code INTEGER NOT NULL, content_length INTEGER, screenshot TEXT, created_at INTEGER NOT NULL)');
            // Create extraction_patterns table
            await this.db.exec('CREATE TABLE IF NOT EXISTS extraction_patterns (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, domain TEXT NOT NULL, selectors TEXT NOT NULL, actions TEXT, success_rate REAL NOT NULL DEFAULT 0.0, last_used INTEGER NOT NULL, created_at INTEGER NOT NULL)');
            // Create browser_sessions table
            await this.db.exec('CREATE TABLE IF NOT EXISTS browser_sessions (id TEXT PRIMARY KEY, url TEXT NOT NULL, viewport TEXT NOT NULL, user_agent TEXT, cookies TEXT, status TEXT NOT NULL DEFAULT "active", created_at INTEGER NOT NULL, last_activity INTEGER NOT NULL)');
            // Create indexes
            await this.db.exec('CREATE INDEX IF NOT EXISTS idx_scraping_results_url ON scraping_results(url)');
            await this.db.exec('CREATE INDEX IF NOT EXISTS idx_scraping_results_timestamp ON scraping_results(timestamp)');
            await this.db.exec('CREATE INDEX IF NOT EXISTS idx_extraction_patterns_domain ON extraction_patterns(domain)');
            await this.db.exec('CREATE INDEX IF NOT EXISTS idx_browser_sessions_status ON browser_sessions(status)');
            console.log('Database tables initialized successfully');
        }
        catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }
    // Scraping Results
    async saveScrapingResult(result) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO scraping_results (
        id, session_id, url, timestamp, data, title, description, 
        load_time, status_code, content_length, screenshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        await stmt.bind(result.id, result.sessionId || null, result.url, result.timestamp.getTime(), JSON.stringify(result.data), result.metadata.title || null, result.metadata.description || null, result.metadata.loadTime, result.metadata.statusCode, result.metadata.contentLength || null, result.metadata.screenshot || null, result.timestamp.getTime() // created_at
        ).run();
    }
    async getScrapingResult(id) {
        const stmt = this.db.prepare(`SELECT * FROM scraping_results WHERE id = ?`);
        const result = await stmt.bind(id).first();
        if (!result)
            return null;
        return {
            id: result.id,
            sessionId: result.session_id || undefined,
            url: result.url,
            timestamp: new Date(result.timestamp),
            data: JSON.parse(result.data),
            metadata: {
                title: result.title || undefined,
                description: result.description || undefined,
                loadTime: result.load_time,
                statusCode: result.status_code,
                contentLength: result.content_length || undefined,
                screenshot: result.screenshot || undefined,
            },
        };
    }
    async getScrapingResultsByUrl(url, limit = 10) {
        const stmt = this.db.prepare(`
      SELECT * FROM scraping_results 
      WHERE url = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
        const results = await stmt.bind(url, limit).all();
        return results.results.map((row) => ({
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
    async getRecentScrapingResults(limit = 50) {
        const stmt = this.db.prepare(`
      SELECT * FROM scraping_results 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
        const results = await stmt.bind(limit).all();
        return results.results.map((row) => ({
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
    async cachePageContent(cache) {
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
    async getCachedPageContent(url) {
        if (!this.cache) {
            return null;
        }
        const encodedUrl = encodeURIComponent(url);
        const list = await this.cache.list({ prefix: `page-cache/${encodedUrl}/` });
        if (list.objects.length === 0)
            return null;
        // Get the most recent cache entry
        const latestObject = list.objects.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime())[0];
        const object = await this.cache.get(latestObject.key);
        if (!object)
            return null;
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
    async clearExpiredCache() {
        if (!this.cache) {
            return;
        }
        const list = await this.cache.list({ prefix: 'page-cache/' });
        const now = new Date();
        for (const object of list.objects) {
            const obj = await this.cache.get(object.key);
            if (!obj)
                continue;
            const metadata = obj.customMetadata || {};
            const ttl = parseInt(metadata.ttl || '86400') * 1000; // Convert to ms
            const timestamp = new Date(metadata.timestamp || object.uploaded);
            if (now.getTime() - timestamp.getTime() > ttl) {
                await this.cache.delete(object.key);
            }
        }
    }
    // Extraction Patterns
    async saveExtractionPattern(pattern) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO extraction_patterns (
        id, name, description, domain, selectors, actions, 
        success_rate, last_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        await stmt.bind(pattern.id, pattern.name, pattern.description, pattern.domain, JSON.stringify(pattern.selectors), JSON.stringify(pattern.actions || []), pattern.successRate, pattern.lastUsed.getTime(), pattern.createdAt.getTime()).run();
    }
    async getExtractionPattern(id) {
        const stmt = this.db.prepare(`SELECT * FROM extraction_patterns WHERE id = ?`);
        const result = await stmt.bind(id).first();
        if (!result)
            return null;
        return {
            id: result.id,
            name: result.name,
            description: result.description,
            domain: result.domain,
            selectors: JSON.parse(result.selectors),
            actions: JSON.parse(result.actions),
            successRate: result.success_rate,
            lastUsed: new Date(result.last_used),
            createdAt: new Date(result.created_at),
        };
    }
    async getExtractionPatternsByDomain(domain) {
        const stmt = this.db.prepare(`
      SELECT * FROM extraction_patterns 
      WHERE domain = ? 
      ORDER BY success_rate DESC, last_used DESC
    `);
        const results = await stmt.bind(domain).all();
        return results.results.map((row) => ({
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
    async saveBrowserSession(session) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO browser_sessions (
        id, url, viewport, user_agent, cookies, status, last_activity
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        await stmt.bind(session.id, session.url, JSON.stringify(session.viewport), session.userAgent || null, JSON.stringify(session.cookies || []), session.status, session.lastActivity.getTime()).run();
    }
    async getBrowserSession(id) {
        const stmt = this.db.prepare(`SELECT * FROM browser_sessions WHERE id = ?`);
        const result = await stmt.bind(id).first();
        if (!result)
            return null;
        return {
            id: result.id,
            url: result.url,
            viewport: JSON.parse(result.viewport),
            userAgent: result.user_agent || undefined,
            cookies: JSON.parse(result.cookies),
            status: result.status,
            createdAt: new Date(result.created_at),
            lastActivity: new Date(result.last_activity),
        };
    }
    async getActiveBrowserSessions() {
        const stmt = this.db.prepare(`
      SELECT * FROM browser_sessions 
      WHERE status = 'active' 
      ORDER BY last_activity DESC
    `);
        const results = await stmt.all();
        return results.results.map((row) => ({
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
    async deleteBrowserSession(id) {
        const stmt = this.db.prepare(`DELETE FROM browser_sessions WHERE id = ?`);
        await stmt.bind(id).run();
    }
    // Analytics and Statistics
    async getScrapingStats() {
        const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM scraping_results`);
        const urlStmt = this.db.prepare(`SELECT COUNT(DISTINCT url) as count FROM scraping_results`);
        const avgLoadStmt = this.db.prepare(`SELECT AVG(load_time) as avg FROM scraping_results`);
        const successStmt = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) * 100.0 / COUNT(*) as rate
      FROM scraping_results
    `);
        const [total, urls, avgLoad, success] = await Promise.all([
            totalStmt.first(),
            urlStmt.first(),
            avgLoadStmt.first(),
            successStmt.first(),
        ]);
        return {
            totalResults: total?.count || 0,
            uniqueUrls: urls?.count || 0,
            avgLoadTime: Math.round(avgLoad?.avg || 0),
            successRate: Math.round(success?.rate || 0),
        };
    }
}
