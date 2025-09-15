import { BrowserSession, Cookie, NavigationOptions, SessionError, NavigationError } from "./schema.js";
import puppeteer from "@cloudflare/puppeteer";

// Cloudflare Puppeteer Manager using Browser Rendering binding
export class CloudflarePuppeteerManager {
  private browser: any | null = null;
  private sessions: Map<string, any> = new Map();
  private sessionMetadata: Map<string, BrowserSession> = new Map();
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }

  async getBrowser(): Promise<any> {
    if (!this.browser) {
      if (!this.env.MYBROWSER) {
        throw new Error('Browser Rendering binding (MYBROWSER) not available. Please check your wrangler.jsonc configuration.');
      }

      try {
        console.log('🚀 Launching Cloudflare Puppeteer browser with Browser Rendering...');
        console.log('🔍 MYBROWSER binding available:', !!this.env.MYBROWSER);
        console.log('🔍 MYBROWSER binding type:', typeof this.env.MYBROWSER);

        // Add more detailed logging to catch the raw response
        console.log('🔍 Attempting puppeteer.launch...');
        const response = await puppeteer.launch(this.env.MYBROWSER);
        console.log('🔍 Browser launch response type:', typeof response);
        console.log('🔍 Browser launch successful');

        this.browser = response;
        console.log('✅ Cloudflare Puppeteer browser launched successfully');
      } catch (error) {
        console.error('❌ Cloudflare Puppeteer browser launch failed:', error);

        // Enhanced error logging to capture the actual response
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Full error message:', errorMessage);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        // Check for specific error patterns
        if (errorMessage.includes('Unexpected token')) {
          console.error('🚨 JSON parsing error detected - likely receiving HTML error page instead of JSON');
          console.error('💡 This suggests Cloudflare protection or API configuration issue');
          console.error('🔧 TROUBLESHOOTING STEPS:');
          console.error('   1. Check if Browser Rendering is enabled in your Cloudflare account');
          console.error('   2. Verify your account has the necessary permissions');
          console.error('   3. Check your wrangler configuration for correct binding setup');
          console.error('   4. Ensure you have sufficient Browser Rendering usage quota');
          throw new Error(`Browser Rendering API returned invalid response (HTML instead of JSON). This may be due to Cloudflare protection or misconfiguration. Error: ${errorMessage}`);
        } else if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('429')) {
          console.error('🚨 Browser Rendering quota exceeded');
          console.error('💡 Check your Cloudflare account limits and usage');
          throw new Error(`Browser Rendering quota exceeded. Please check your Cloudflare account limits.`);
        } else if (errorMessage.includes('Access Denied') || errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
          console.error('🚨 Browser Rendering access denied');
          console.error('💡 Check your Cloudflare account permissions and Browser Rendering enablement');
          throw new Error(`Browser Rendering access denied. Check your Cloudflare account permissions and Browser Rendering enablement.`);
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          console.error('🚨 Browser Rendering API endpoint not found');
          console.error('💡 Verify your wrangler.jsonc has the correct browser binding configuration');
          throw new Error(`Browser Rendering API endpoint not found. Check your wrangler.jsonc configuration.`);
        }

        throw new Error(`Failed to launch Cloudflare Puppeteer browser: ${errorMessage}`);
      }
    }
    return this.browser;
  }

  async createSession(sessionId: string, options: NavigationOptions, retryCount: number = 0): Promise<any> {
    const MAX_RETRIES = 2;
    
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Set viewport if specified
      if (options.viewport) {
        await page.setViewport({
          width: options.viewport.width,
          height: options.viewport.height
        });
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

      console.log(`✅ Cloudflare Puppeteer session ${sessionId} created and navigated to ${options.url}`);
      return page;
    } catch (error) {
      console.error(`❌ Cloudflare Puppeteer session creation failed for ${sessionId} (attempt ${retryCount + 1}):`, error);
      
      // Handle Protocol error with cleanup and retry
      if (error instanceof Error && error.message.includes('Protocol error: Connection closed')) {
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Protocol error detected, cleaning up and retrying (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
          
          // Clean up any stale session data
          await this.cleanupSession(sessionId);
          
          // Reset browser instance to force fresh connection
          this.browser = null;
          
          // Wait a bit before retry (exponential backoff)
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry with fresh session
          return this.createSession(sessionId, options, retryCount + 1);
        } else {
          throw new SessionError(
            `Browser connection failed after ${MAX_RETRIES + 1} attempts. This might indicate persistent network issues or Browser Rendering service problems. Try disconnecting and reconnecting to MCP Inspector. Error: ${error.message}`,
            sessionId
          );
        }
      }
      
      throw new SessionError(
        `Failed to create Cloudflare Puppeteer session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
        sessionId
      );
    }
  }

  async getSession(sessionId: string): Promise<any | null> {
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

  async getOrCreateSession(sessionId: string, options: NavigationOptions): Promise<any> {
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
      
      // Cloudflare Puppeteer navigation options - try different wait conditions
      const navigationOptions: any = {
        waitUntil: options.waitUntil || 'load', // Changed from 'domcontentloaded' to 'load'
        timeout: options.timeout || 90000, // Increased to 90 seconds
      };

      await page.goto(options.url, navigationOptions);

      const loadTime = Date.now() - startTime;

      // Update session metadata
      const metadata = this.sessionMetadata.get(sessionId);
      if (metadata) {
        metadata.url = options.url;
        metadata.lastActivity = new Date();
        metadata.status = 'active';
      }

      console.log(`✅ Cloudflare Puppeteer navigation completed for session ${sessionId} in ${loadTime}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for quota-related error patterns
      if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('billing')) {
        throw new NavigationError(
          `Browser Rendering quota exceeded or billing issue detected. Please check your Cloudflare account billing and Browser Rendering usage limits. Error: ${errorMessage}`,
          options.url
        );
      }

      // Check for timeout vs other network errors
      if (errorMessage.includes('ERR_TIMED_OUT') || errorMessage.includes('timeout')) {
        throw new NavigationError(
          `Navigation timeout occurred. The website may be slow to load or unresponsive. This is likely NOT a quota issue. Error: ${errorMessage}`,
          options.url
        );
      }

      throw new NavigationError(
        `Failed to navigate to ${options.url} with Cloudflare Puppeteer: ${errorMessage}`,
        options.url
      );
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const page = this.sessions.get(sessionId);
    if (page) {
      try {
        await page.close();
        console.log(`✅ Cloudflare Puppeteer session ${sessionId} closed`);
      } catch (error) {
        console.warn(`⚠️ Error closing Cloudflare Puppeteer page for session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }

    const metadata = this.sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.status = 'closed';
      this.sessionMetadata.delete(sessionId);
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    console.log(`🧹 Cleaning up Cloudflare Puppeteer session: ${sessionId}`);
    
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

    // Clean up metadata
    const metadata = this.sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.status = 'closed';
      this.sessionMetadata.delete(sessionId);
    }
    
    console.log(`✅ Cloudflare Puppeteer session cleanup completed: ${sessionId}`);
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
        console.log(`🧹 Cleaning up idle Cloudflare Puppeteer session: ${sessionId}`);
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
        console.log('✅ Cloudflare Puppeteer browser closed');
      } catch (error) {
        console.warn('⚠️ Error closing Cloudflare Puppeteer browser:', error);
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

  // Additional method to check if Cloudflare Puppeteer is available
  static isAvailable(env: Env): boolean {
    return !!env.MYBROWSER;
  }

  // Method to get browser info for debugging
  async getBrowserInfo(): Promise<any> {
    if (!this.browser) return null;
    
    try {
      const version = await this.browser.version();
      const userAgent = await this.browser.userAgent();
      return {
        type: 'Cloudflare Puppeteer (Browser Rendering)',
        version,
        userAgent,
        sessionCount: this.sessions.size,
        isHeadless: true
      };
    } catch (error) {
      return {
        type: 'Cloudflare Puppeteer (Browser Rendering)',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
