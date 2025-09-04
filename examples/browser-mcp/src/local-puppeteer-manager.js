import { SessionError, NavigationError } from "./schema.js";
// Local Puppeteer Manager for unlimited development testing
export class LocalPuppeteerManager {
    browser = null;
    sessions = new Map();
    sessionMetadata = new Map();
    env;
    puppeteer = null;
    constructor(env) {
        this.env = env;
    }
    async initializePuppeteer() {
        if (!this.puppeteer) {
            try {
                // Dynamic import to handle optional dependency
                const puppeteerModule = await import('puppeteer');
                this.puppeteer = puppeteerModule.default || puppeteerModule;
                console.log('✅ Local Puppeteer initialized successfully');
            }
            catch (error) {
                throw new Error(`Local Puppeteer not available. Install with: npm install puppeteer\nError: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return this.puppeteer;
    }
    async getBrowser() {
        if (!this.browser) {
            const puppeteer = await this.initializePuppeteer();
            try {
                console.log('🚀 Launching local Puppeteer browser...');
                this.browser = await puppeteer.launch({
                    headless: true, // Set to false for debugging
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ],
                    timeout: 30000
                });
                console.log('✅ Local Puppeteer browser launched successfully');
            }
            catch (error) {
                console.error('❌ Local Puppeteer browser launch failed:', error);
                throw new Error(`Failed to launch local Puppeteer browser: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return this.browser;
    }
    async createSession(sessionId, options) {
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
                    sameSite: cookie.sameSite,
                })));
            }
            // Store session
            this.sessions.set(sessionId, page);
            // Store session metadata
            const sessionMetadata = {
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
            console.log(`✅ Local Puppeteer session ${sessionId} created and navigated to ${options.url}`);
            return page;
        }
        catch (error) {
            throw new SessionError(`Failed to create local Puppeteer session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`, sessionId);
        }
    }
    async getSession(sessionId) {
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
    async getOrCreateSession(sessionId, options) {
        let page = await this.getSession(sessionId);
        if (!page) {
            page = await this.createSession(sessionId, options);
        }
        return page;
    }
    async navigateSession(sessionId, options) {
        const page = await this.getSession(sessionId);
        if (!page) {
            throw new SessionError(`Session ${sessionId} not found`, sessionId);
        }
        try {
            const startTime = Date.now();
            // Local Puppeteer navigation options
            const navigationOptions = {
                waitUntil: options.waitUntil || 'domcontentloaded',
                timeout: options.timeout || 30000,
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
            console.log(`✅ Local Puppeteer navigation completed for session ${sessionId} in ${loadTime}ms`);
        }
        catch (error) {
            throw new NavigationError(`Failed to navigate to ${options.url} with local Puppeteer: ${error instanceof Error ? error.message : String(error)}`, options.url);
        }
    }
    async closeSession(sessionId) {
        const page = this.sessions.get(sessionId);
        if (page) {
            try {
                await page.close();
                console.log(`✅ Local Puppeteer session ${sessionId} closed`);
            }
            catch (error) {
                console.warn(`⚠️ Error closing local Puppeteer page for session ${sessionId}:`, error);
            }
            this.sessions.delete(sessionId);
        }
        const metadata = this.sessionMetadata.get(sessionId);
        if (metadata) {
            metadata.status = 'closed';
            this.sessionMetadata.delete(sessionId);
        }
    }
    async getSessionMetadata(sessionId) {
        return this.sessionMetadata.get(sessionId) || null;
    }
    async listSessions() {
        return Array.from(this.sessionMetadata.values());
    }
    async cleanupIdleSessions() {
        const timeoutMs = parseInt(this.env.SESSION_TIMEOUT_MS) || 300000; // 5 minutes default
        const now = new Date();
        for (const [sessionId, metadata] of this.sessionMetadata.entries()) {
            const idleTime = now.getTime() - metadata.lastActivity.getTime();
            if (idleTime > timeoutMs) {
                console.log(`🧹 Cleaning up idle local Puppeteer session: ${sessionId}`);
                await this.closeSession(sessionId);
            }
        }
    }
    async cleanup() {
        // Close all sessions
        const sessionIds = Array.from(this.sessions.keys());
        await Promise.all(sessionIds.map(id => this.closeSession(id)));
        // Close browser
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('✅ Local Puppeteer browser closed');
            }
            catch (error) {
                console.warn('⚠️ Error closing local Puppeteer browser:', error);
            }
            this.browser = null;
        }
        // Clear all data
        this.sessions.clear();
        this.sessionMetadata.clear();
    }
    // Utility method to check if we're at session limit
    isAtSessionLimit() {
        const maxSessions = parseInt(this.env.MAX_CONCURRENT_SESSIONS) || 5;
        return this.sessions.size >= maxSessions;
    }
    // Get current session count
    getSessionCount() {
        return this.sessions.size;
    }
    // Additional method to check if local Puppeteer is available
    static async isAvailable() {
        try {
            console.log('🔍 LocalPuppeteerManager.isAvailable() - attempting import...');
            const puppeteerModule = await import('puppeteer');
            console.log('🔍 Puppeteer module imported:', !!puppeteerModule);
            const puppeteer = puppeteerModule.default || puppeteerModule;
            console.log('🔍 Puppeteer object:', !!puppeteer);
            const hasLaunch = typeof puppeteer.launch === 'function';
            console.log('🔍 Has launch function:', hasLaunch);
            return hasLaunch;
        }
        catch (error) {
            console.log('🔍 LocalPuppeteerManager.isAvailable() failed:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    // Method to get browser info for debugging
    async getBrowserInfo() {
        if (!this.browser)
            return null;
        try {
            const version = await this.browser.version();
            const userAgent = await this.browser.userAgent();
            return {
                type: 'Local Puppeteer',
                version,
                userAgent,
                sessionCount: this.sessions.size,
                isHeadless: true
            };
        }
        catch (error) {
            return {
                type: 'Local Puppeteer',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
