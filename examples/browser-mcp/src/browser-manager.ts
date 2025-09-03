import puppeteer, { Browser, Page } from "@cloudflare/puppeteer";
import { BrowserSession, Cookie, NavigationOptions, SessionError, NavigationError } from "./schema.js";
import { browserMonitor } from "./browser-monitor.js";

export class BrowserManager {
  private browsers: Map<string, Browser> = new Map(); // Per-session browsers
  private sessions: Map<string, Page> = new Map();
  private sessionMetadata: Map<string, BrowserSession> = new Map();
  private env: Env;
  
  private readonly MAX_SESSIONS = 5; // Configurable limit
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_REQUESTS_PER_SESSION = 20;
  
  constructor(env: Env) {
    this.env = env;
    // Note: Cleanup intervals will be managed by the request handler to avoid global scope issues
  }

  async createBrowserForSession(sessionId: string, retryCount: number = 0): Promise<Browser> {
    if (!this.env.MYBROWSER) {
      throw new Error("Browser Rendering not available. Use 'npm run dev' (remote mode) or register workers.dev subdomain");
    }
    
    const MAX_RETRIES = 2;
    
    try {
      console.log(`Creating browser for session: ${sessionId} (attempt ${retryCount + 1})`);
      const browser = await puppeteer.launch(this.env.MYBROWSER);
      this.browsers.set(sessionId, browser);
      console.log(`Browser created successfully for session: ${sessionId}`);
      return browser;
    } catch (error) {
      console.error(`Browser launch failed for session ${sessionId} (attempt ${retryCount + 1}):`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('limit exceeded')) {
          throw new Error(`Browser Rendering quota exceeded. Please check your Cloudflare account limits. Error: ${error.message}`);
        }
        
        // Handle Protocol error with cleanup and retry
        if (error.message.includes('Protocol error: Connection closed')) {
          if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Protocol error detected, cleaning up and retrying (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
            
            // Clean up any stale session data
            await this.cleanupSession(sessionId);
            
            // Wait a bit before retry (exponential backoff)
            const delay = 1000 * Math.pow(2, retryCount);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Retry with fresh session
            return this.createBrowserForSession(sessionId, retryCount + 1);
          } else {
            throw new Error(`Browser connection failed after ${MAX_RETRIES + 1} attempts. This might indicate persistent network issues or Browser Rendering service problems. Try disconnecting and reconnecting to MCP Inspector. Error: ${error.message}`);
          }
        }
      }
      
      throw new Error(`Browser Rendering failed to initialize. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getBrowserForSession(sessionId: string): Promise<Browser> {
    let browser = this.browsers.get(sessionId);
    if (!browser) {
      browser = await this.createBrowserForSession(sessionId);
    }
    return browser;
  }

  async createSession(sessionId: string, options: NavigationOptions): Promise<Page> {
    try {
      // Check session limits
      if (this.isAtSessionLimit()) {
        await this.cleanupIdleSessions(); // Try to free some space
        if (this.isAtSessionLimit()) {
          throw new SessionError(`Maximum concurrent sessions (${this.MAX_SESSIONS}) reached`, sessionId);
        }
      }

      const browser = await this.getBrowserForSession(sessionId);
      const page = await browser.newPage();

      // Set viewport if specified
      if (options.viewport) {
        await page.setViewport(options.viewport);
      }

      // Set user agent if specified
      if (options.userAgent) {
        await page.setUserAgent(options.userAgent);
      }

      // Set cookies if specified
      if (options.cookies && options.cookies.length > 0) {
        await page.setCookie(...options.cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as any,
        })));
      }

      // Store session
      this.sessions.set(sessionId, page);
      
      // Store session metadata
      const sessionMetadata: BrowserSession = {
        id: sessionId,
        url: options.url,
        viewport: options.viewport || { width: 1280, height: 720 },
        userAgent: options.userAgent,
        cookies: options.cookies,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active',
        requestCount: 0
      };
      this.sessionMetadata.set(sessionId, sessionMetadata);

      // Track session creation
      browserMonitor.trackSessionCreated(sessionId);

      // Navigate to initial URL
      await this.navigateSession(sessionId, options);

      return page;
    } catch (error) {
      throw new SessionError(
        `Failed to create session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        sessionId
      );
    }
  }

  async getSession(sessionId: string): Promise<Page | null> {
    const page = this.sessions.get(sessionId);
    if (page) {
      // Update last activity and request count
      const metadata = this.sessionMetadata.get(sessionId);
      if (metadata) {
        metadata.lastActivity = new Date();
        metadata.status = 'active';
        metadata.requestCount = (metadata.requestCount || 0) + 1;
        
        // Check if session has exceeded request limit
        if (metadata.requestCount > this.MAX_REQUESTS_PER_SESSION) {
          console.log(`Session ${sessionId} exceeded request limit (${this.MAX_REQUESTS_PER_SESSION}), closing`);
          await this.closeSession(sessionId);
          throw new SessionError(`Session ${sessionId} exceeded request limit and was closed`, sessionId);
        }
      }
    }
    return page || null;
  }

  async getOrCreateSession(sessionId: string, options: NavigationOptions): Promise<Page> {
    let page = await this.getSession(sessionId);
    if (!page) {
      page = await this.createSession(sessionId, options);
    }
    return page;
  }

  async navigateSession(sessionId: string, options: NavigationOptions): Promise<void> {
    const page = await this.getSession(sessionId);
    if (!page) {
      throw new SessionError(`Session ${sessionId} not found`, sessionId);
    }

    try {
      const startTime = Date.now();
      
      await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: options.timeout || 30000,
      });

      const loadTime = Date.now() - startTime;

      // Update session metadata
      const metadata = this.sessionMetadata.get(sessionId);
      if (metadata) {
        metadata.url = options.url;
        metadata.lastActivity = new Date();
        metadata.status = 'active';
      }

      console.log(`Navigation completed for session ${sessionId} in ${loadTime}ms`);
    } catch (error) {
      throw new NavigationError(
        `Failed to navigate to ${options.url}: ${error instanceof Error ? error.message : String(error)}`,
        options.url
      );
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const page = this.sessions.get(sessionId);
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.warn(`Error closing page for session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }

    // Close the dedicated browser for this session
    const browser = this.browsers.get(sessionId);
    if (browser) {
      try {
        await browser.close();
        console.log(`Browser closed for session: ${sessionId}`);
      } catch (error) {
        console.warn(`Error closing browser for session ${sessionId}:`, error);
      }
      this.browsers.delete(sessionId);
    }

    const metadata = this.sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.status = 'closed';
      this.sessionMetadata.delete(sessionId);
      
      // Track session closure
      browserMonitor.trackSessionClosed(sessionId, 'manual');
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    console.log(`🧹 Cleaning up session: ${sessionId}`);
    
    // Force close the session (similar to closeSession but more aggressive)
    const page = this.sessions.get(sessionId);
    if (page) {
      try {
        await page.close();
        console.log(`Page closed for cleanup: ${sessionId}`);
      } catch (error) {
        console.warn(`Error closing page during cleanup for session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }

    // Force close the browser
    const browser = this.browsers.get(sessionId);
    if (browser) {
      try {
        await browser.close();
        console.log(`Browser closed for cleanup: ${sessionId}`);
      } catch (error) {
        console.warn(`Error closing browser during cleanup for session ${sessionId}:`, error);
      }
      this.browsers.delete(sessionId);
    }

    // Clean up metadata
    const metadata = this.sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.status = 'closed';
      this.sessionMetadata.delete(sessionId);
      
      // Track session closure as error
      browserMonitor.trackSessionClosed(sessionId, 'error');
    }
    
    console.log(`✅ Session cleanup completed: ${sessionId}`);
  }

  async getSessionMetadata(sessionId: string): Promise<BrowserSession | null> {
    return this.sessionMetadata.get(sessionId) || null;
  }

  async listSessions(): Promise<BrowserSession[]> {
    return Array.from(this.sessionMetadata.values());
  }

  async cleanupIdleSessions(): Promise<void> {
    const timeoutMs = parseInt(this.env.SESSION_TIMEOUT_MS) || 300000; // 5 minutes default
    const now = new Date();

    for (const [sessionId, metadata] of this.sessionMetadata.entries()) {
      const idleTime = now.getTime() - metadata.lastActivity.getTime();
      if (idleTime > timeoutMs) {
        console.log(`Cleaning up idle session: ${sessionId}`);
        // Track session closure as timeout
        browserMonitor.trackSessionClosed(sessionId, 'timeout');
        await this.closeSession(sessionId);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Close all sessions
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));

    // Close any remaining browsers (should be none after closing sessions)
    for (const [sessionId, browser] of this.browsers.entries()) {
      try {
        await browser.close();
        console.log(`Cleaned up browser for session: ${sessionId}`);
      } catch (error) {
        console.warn(`Error closing browser during cleanup for session ${sessionId}:`, error);
      }
    }

    // Clear all data
    this.sessions.clear();
    this.sessionMetadata.clear();
    this.browsers.clear();
  }

  // Utility method to check if we're at session limit
  isAtSessionLimit(): boolean {
    const maxSessions = parseInt(this.env.MAX_CONCURRENT_SESSIONS) || this.MAX_SESSIONS;
    return this.sessions.size >= maxSessions;
  }

  // Get current session count
  getSessionCount(): number {
    return this.sessions.size;
  }
}
