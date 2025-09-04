// Error types
export class BrowserError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BrowserError';
    }
}
export class SessionError extends BrowserError {
    constructor(message, sessionId) {
        super(message, 'SESSION_ERROR', { sessionId });
        this.name = 'SessionError';
    }
}
export class NavigationError extends BrowserError {
    constructor(message, url) {
        super(message, 'NAVIGATION_ERROR', { url });
        this.name = 'NavigationError';
    }
}
export class ExtractionError extends BrowserError {
    constructor(message, selector) {
        super(message, 'EXTRACTION_ERROR', { selector });
        this.name = 'ExtractionError';
    }
}
