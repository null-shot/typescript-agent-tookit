/**
 * Browser Monitor
 *
 * Provides monitoring and resource tracking for browser operations
 * following Cloudflare Browser Rendering best practices.
 */
export class BrowserMonitor {
    metrics;
    operationHistory = [];
    MAX_HISTORY = 1000;
    MAX_ERRORS = 50;
    lastMetricsExport = 0;
    METRICS_EXPORT_INTERVAL = 60 * 1000; // 1 minute
    constructor() {
        this.metrics = this.initializeMetrics();
    }
    checkAndExportMetrics() {
        const now = Date.now();
        if (now - this.lastMetricsExport > this.METRICS_EXPORT_INTERVAL) {
            this.lastMetricsExport = now;
            this.exportMetrics();
        }
    }
    initializeMetrics() {
        return {
            totalSessions: 0,
            activeSessions: 0,
            sessionsCreated: 0,
            sessionsClosed: 0,
            sessionsExpired: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalBrowserTime: 0,
            totalScreenshots: 0,
            totalExtractions: 0,
            totalNavigations: 0,
            errorsByType: {},
            lastErrors: [],
            averageSessionDuration: 0,
            requestsPerMinute: 0,
            peakConcurrentSessions: 0
        };
    }
    /**
     * Track when a session is created
     */
    trackSessionCreated(sessionId) {
        this.checkAndExportMetrics();
        this.metrics.sessionsCreated++;
        this.metrics.activeSessions++;
        this.metrics.totalSessions = Math.max(this.metrics.totalSessions, this.metrics.activeSessions);
        this.metrics.peakConcurrentSessions = Math.max(this.metrics.peakConcurrentSessions, this.metrics.activeSessions);
        console.log(`📊 Session created: ${sessionId} (Active: ${this.metrics.activeSessions})`);
    }
    /**
     * Track when a session is closed
     */
    trackSessionClosed(sessionId, reason = 'manual') {
        this.metrics.sessionsClosed++;
        this.metrics.activeSessions = Math.max(0, this.metrics.activeSessions - 1);
        if (reason === 'timeout') {
            this.metrics.sessionsExpired++;
        }
        console.log(`📊 Session closed: ${sessionId} (${reason}) (Active: ${this.metrics.activeSessions})`);
    }
    /**
     * Start tracking an operation
     */
    startOperation(operation, sessionId, url) {
        const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const operationMetrics = {
            operation,
            sessionId,
            url,
            startTime: Date.now(),
            success: false,
            resourceUsage: {
                browserTime: 0,
                dataTransferred: 0
            }
        };
        this.operationHistory.push(operationMetrics);
        // Keep history size manageable
        if (this.operationHistory.length > this.MAX_HISTORY) {
            this.operationHistory.splice(0, this.operationHistory.length - this.MAX_HISTORY);
        }
        return operationId;
    }
    /**
     * Finish tracking an operation
     */
    finishOperation(operationId, success, error, resourceUsage) {
        // Find the operation (simple implementation - in production might want a Map)
        const operation = this.operationHistory.find(op => `${op.operation}_${op.startTime}_${op.sessionId}` === operationId ||
            op.startTime.toString() === operationId.split('_')[1]);
        if (operation) {
            operation.endTime = Date.now();
            operation.duration = operation.endTime - operation.startTime;
            operation.success = success;
            operation.error = error;
            if (resourceUsage) {
                Object.assign(operation.resourceUsage, resourceUsage);
            }
            // Update metrics
            this.metrics.totalRequests++;
            if (success) {
                this.metrics.successfulRequests++;
            }
            else {
                this.metrics.failedRequests++;
                this.trackError(operation.operation, error || 'Unknown error');
            }
            // Update operation-specific metrics
            switch (operation.operation) {
                case 'screenshot':
                    this.metrics.totalScreenshots++;
                    break;
                case 'extract_text':
                    this.metrics.totalExtractions++;
                    break;
                case 'navigate':
                    this.metrics.totalNavigations++;
                    break;
            }
            this.metrics.totalBrowserTime += operation.resourceUsage.browserTime;
            // Update average response time
            const totalResponseTime = this.operationHistory
                .filter(op => op.duration)
                .reduce((sum, op) => sum + (op.duration || 0), 0);
            const completedOperations = this.operationHistory.filter(op => op.duration).length;
            this.metrics.averageResponseTime = completedOperations > 0 ? totalResponseTime / completedOperations : 0;
            console.log(`📊 Operation ${operation.operation} ${success ? 'succeeded' : 'failed'} in ${operation.duration}ms`);
        }
    }
    /**
     * Track an error
     */
    trackError(operation, error) {
        // Update error counts by type
        const errorType = this.classifyError(error);
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
        // Add to recent errors
        this.metrics.lastErrors.push({
            timestamp: new Date(),
            error,
            operation
        });
        // Keep recent errors list manageable
        if (this.metrics.lastErrors.length > this.MAX_ERRORS) {
            this.metrics.lastErrors.splice(0, this.metrics.lastErrors.length - this.MAX_ERRORS);
        }
    }
    /**
     * Classify error for tracking
     */
    classifyError(error) {
        const lowerError = error.toLowerCase();
        if (lowerError.includes('timeout'))
            return 'timeout';
        if (lowerError.includes('network') || lowerError.includes('connection'))
            return 'network';
        if (lowerError.includes('quota') || lowerError.includes('limit'))
            return 'quota';
        if (lowerError.includes('session'))
            return 'session';
        if (lowerError.includes('navigation'))
            return 'navigation';
        if (lowerError.includes('selector') || lowerError.includes('element'))
            return 'element';
        if (lowerError.includes('screenshot'))
            return 'screenshot';
        return 'unknown';
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        // Calculate requests per minute
        const recentOperations = this.operationHistory.filter(op => op.startTime > Date.now() - 60 * 1000);
        this.metrics.requestsPerMinute = recentOperations.length;
        return { ...this.metrics };
    }
    /**
     * Get detailed operation history
     */
    getOperationHistory(limit = 100) {
        return this.operationHistory
            .slice(-limit)
            .map(op => ({ ...op })); // Return copies
    }
    /**
     * Get resource usage summary
     */
    getResourceUsage() {
        const now = Date.now();
        const hourAgo = now - 60 * 60 * 1000;
        const recentScreenshots = this.operationHistory.filter(op => op.operation === 'screenshot' && op.startTime > hourAgo).length;
        const errorRate = this.metrics.totalRequests > 0
            ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
            : 0;
        return {
            totalBrowserTimeSeconds: Math.round(this.metrics.totalBrowserTime / 1000),
            averageOperationTime: Math.round(this.metrics.averageResponseTime),
            screenshotsPerHour: recentScreenshots,
            errorRate: Math.round(errorRate * 100) / 100,
            quotaUsageEstimate: this.estimateQuotaUsage()
        };
    }
    /**
     * Estimate quota usage (rough calculation)
     */
    estimateQuotaUsage() {
        const totalTimeSeconds = this.metrics.totalBrowserTime / 1000;
        const totalScreenshots = this.metrics.totalScreenshots;
        // Rough estimates based on Cloudflare pricing
        const timeUsage = `${Math.round(totalTimeSeconds)}s browser time`;
        const screenshotUsage = `${totalScreenshots} screenshots`;
        return `${timeUsage}, ${screenshotUsage}`;
    }
    /**
     * Export metrics for monitoring systems
     */
    exportMetrics() {
        const metrics = this.getMetrics();
        const resourceUsage = this.getResourceUsage();
        // In production, this would send to monitoring service
        console.log('📊 Browser MCP Metrics:', {
            timestamp: new Date().toISOString(),
            metrics: {
                sessions: {
                    active: metrics.activeSessions,
                    peak: metrics.peakConcurrentSessions,
                    created: metrics.sessionsCreated,
                    closed: metrics.sessionsClosed
                },
                requests: {
                    total: metrics.totalRequests,
                    success_rate: metrics.totalRequests > 0
                        ? Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)
                        : 0,
                    per_minute: metrics.requestsPerMinute
                },
                resources: resourceUsage,
                errors: {
                    by_type: metrics.errorsByType,
                    recent_count: metrics.lastErrors.length
                }
            }
        });
    }
    /**
     * Check if we're approaching resource limits
     */
    checkResourceLimits() {
        const warnings = [];
        let critical = false;
        // Check session limits
        if (this.metrics.activeSessions >= 4) { // Assuming 5 is the limit
            warnings.push(`High session usage: ${this.metrics.activeSessions}/5 active sessions`);
            if (this.metrics.activeSessions >= 5) {
                critical = true;
            }
        }
        // Check error rate
        const errorRate = this.metrics.totalRequests > 0
            ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
            : 0;
        if (errorRate > 20) {
            warnings.push(`High error rate: ${Math.round(errorRate)}%`);
            if (errorRate > 50) {
                critical = true;
            }
        }
        // Check for quota errors
        const quotaErrors = this.metrics.errorsByType['quota'] || 0;
        if (quotaErrors > 0) {
            warnings.push(`Quota limit errors detected: ${quotaErrors} recent failures`);
            critical = true;
        }
        return { warnings, critical };
    }
}
// Export singleton instance
export const browserMonitor = new BrowserMonitor();
