export interface BrowserSession {
  id: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent?: string;
  cookies?: Cookie[];
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'closed';
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface ScrapingResult {
  id: string;
  sessionId?: string;
  url: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata: {
    title?: string;
    description?: string;
    loadTime: number;
    statusCode: number;
    contentLength?: number;
    screenshot?: string; // base64 encoded
  };
}

export interface NavigationOptions {
  url: string;
  sessionId?: string;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  timeout?: number;
  cookies?: Cookie[];
}

export interface ScreenshotOptions {
  sessionId?: string;
  url?: string;
  selector?: string;
  fullPage?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
}

export interface ExtractionOptions {
  sessionId?: string;
  url?: string;
  selectors?: Record<string, string>;
  selector?: string;
  attribute?: string;
  multiple?: boolean;
  waitForSelector?: string;
  timeout?: number;
}

export interface InteractionOptions {
  sessionId?: string;
  url?: string;
  actions: BrowserAction[];
  waitBetweenActions?: number;
}

export interface BrowserAction {
  type: 'click' | 'fill' | 'select' | 'hover' | 'scroll' | 'wait' | 'evaluate';
  selector?: string;
  value?: string;
  options?: Record<string, any>;
  timeout?: number;
}

export interface WaitOptions {
  sessionId?: string;
  url?: string;
  condition: 'element' | 'network' | 'timeout' | 'function';
  selector?: string;
  timeout?: number;
  networkIdleTimeout?: number;
  customFunction?: string;
}

export interface PageCache {
  id: string;
  url: string;
  content: string;
  timestamp: Date;
  contentType: string;
  size: number;
  ttl: number;
}

export interface ExtractionPattern {
  id: string;
  name: string;
  description: string;
  domain: string;
  selectors: Record<string, string>;
  actions?: BrowserAction[];
  successRate: number;
  lastUsed: Date;
  createdAt: Date;
}

// Error types
export class BrowserError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class SessionError extends BrowserError {
  constructor(message: string, sessionId?: string) {
    super(message, 'SESSION_ERROR', { sessionId });
    this.name = 'SessionError';
  }
}

export class NavigationError extends BrowserError {
  constructor(message: string, url?: string) {
    super(message, 'NAVIGATION_ERROR', { url });
    this.name = 'NavigationError';
  }
}

export class ExtractionError extends BrowserError {
  constructor(message: string, selector?: string) {
    super(message, 'EXTRACTION_ERROR', { selector });
    this.name = 'ExtractionError';
  }
}
