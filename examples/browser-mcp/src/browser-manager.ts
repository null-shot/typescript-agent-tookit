import puppeteer, { Browser, Page } from "@cloudflare/puppeteer";
import { BrowserSession, Cookie, NavigationOptions, SessionError, NavigationError } from "./schema.js";

export class BrowserManager {
  private browser: Browser | null = null;
  private sessions: Map<string, Page> = new Map();
  private sessionMetadata: Map<string, BrowserSession> = new Map();
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      // Check if we're in local development mode
      if (!this.env.MYBROWSER) {
        throw new Error("Browser Rendering not available. Use 'npm run dev' (remote mode) or register workers.dev subdomain");
      }
      
      try {
        console.log('Attempting to launch browser with binding:', typeof this.env.MYBROWSER);
        this.browser = await puppeteer.launch(this.env.MYBROWSER);
        console.log('Browser launched successfully');
      } catch (error) {
        console.error('Browser launch failed:', error);
        // For now, create a mock browser for testing MCP structure
        throw new Error(`Browser Rendering failed to initialize. This might indicate Browser Rendering is not enabled in your Cloudflare account. Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return this.browser;
  }

  async createSession(sessionId: string, options: NavigationOptions): Promise<Page> {
    try {
      const browser = await this.getBrowser();
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
        status: 'active'
      };
      this.sessionMetadata.set(sessionId, sessionMetadata);

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
      // Update last activity
      const metadata = this.sessionMetadata.get(sessionId);
      if (metadata) {
        metadata.lastActivity = new Date();
        metadata.status = 'active';
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

    const metadata = this.sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.status = 'closed';
      this.sessionMetadata.delete(sessionId);
    }
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
        await this.closeSession(sessionId);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Close all sessions
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));

    // Close browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('Error closing browser:', error);
      }
      this.browser = null;
    }

    // Clear all data
    this.sessions.clear();
    this.sessionMetadata.clear();
  }

  // Utility method to check if we're at session limit
  isAtSessionLimit(): boolean {
    const maxSessions = parseInt(this.env.MAX_CONCURRENT_SESSIONS) || 5;
    return this.sessions.size >= maxSessions;
  }

  // Get current session count
  getSessionCount(): number {
    return this.sessions.size;
  }
}
