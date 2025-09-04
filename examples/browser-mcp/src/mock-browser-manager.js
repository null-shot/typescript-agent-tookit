// Mock browser manager for testing when Browser Rendering isn't available
export class MockBrowserManager {
    sessions = new Map();
    sessionMetadata = new Map();
    env;
    constructor(env) {
        this.env = env;
    }
    async createSession(sessionId, options) {
        // Create mock page object
        const mockPage = {
            url: () => options.url,
            title: () => "Mock Page Title",
            screenshot: () => Promise.resolve("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), // 1x1 transparent PNG
            $: () => Promise.resolve({
                screenshot: () => Promise.resolve("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
            }),
            $$eval: () => Promise.resolve(["Mock text 1", "Mock text 2"]),
            $eval: () => Promise.resolve("Mock extracted text"),
            evaluate: (code) => {
                if (code.includes('document.title'))
                    return Promise.resolve('Mock Page Title');
                if (code.includes('links'))
                    return Promise.resolve([
                        { url: 'https://example.com/link1', text: 'Link 1', internal: true, domain: 'example.com' },
                        { url: 'https://example.com/link2', text: 'Link 2', internal: true, domain: 'example.com' }
                    ]);
                return Promise.resolve({ mockResult: true });
            },
            waitForSelector: () => Promise.resolve(),
            waitForLoadState: () => Promise.resolve(),
            waitForTimeout: (ms) => new Promise(resolve => setTimeout(resolve, Math.min(ms, 100))), // Speed up for tests
            waitForFunction: () => Promise.resolve(),
            click: () => Promise.resolve(),
            fill: () => Promise.resolve(),
            selectOption: () => Promise.resolve(),
            hover: () => Promise.resolve(),
            close: () => Promise.resolve(),
        };
        this.sessions.set(sessionId, mockPage);
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
        return mockPage;
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
            throw new Error(`Session ${sessionId} not found`);
        }
        // Mock navigation - just update the URL
        page.url = () => options.url;
    }
    async closeSession(sessionId) {
        this.sessions.delete(sessionId);
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
        // Mock cleanup - just clear old sessions
        const timeoutMs = parseInt(this.env.SESSION_TIMEOUT_MS) || 300000;
        const now = new Date();
        for (const [sessionId, metadata] of this.sessionMetadata.entries()) {
            const idleTime = now.getTime() - metadata.lastActivity.getTime();
            if (idleTime > timeoutMs) {
                await this.closeSession(sessionId);
            }
        }
    }
    async cleanup() {
        this.sessions.clear();
        this.sessionMetadata.clear();
    }
    isAtSessionLimit() {
        const maxSessions = parseInt(this.env.MAX_CONCURRENT_SESSIONS) || 5;
        return this.sessions.size >= maxSessions;
    }
    getSessionCount() {
        return this.sessions.size;
    }
}
