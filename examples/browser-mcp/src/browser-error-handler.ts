/**
 * Browser Error Handler
 * 
 * Provides robust error handling and retry logic for browser operations
 * following Cloudflare Browser Rendering best practices.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface BrowserErrorContext {
  operation: string;
  sessionId?: string;
  url?: string;
  attempt: number;
  totalAttempts: number;
}

export class BrowserError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: BrowserErrorContext,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'BrowserError';
  }
}

export class BrowserErrorHandler {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2
  };

  /**
   * Executes a browser operation with automatic retry and cleanup
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Omit<BrowserErrorContext, 'attempt' | 'totalAttempts'>,
    retryConfig: Partial<RetryConfig> = {},
    cleanup?: () => Promise<void>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if not first attempt
        if (attempt > 1) {
          console.log(`✅ Operation '${context.operation}' succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const browserError = this.classifyError(lastError, {
          ...context,
          attempt,
          totalAttempts: config.maxRetries + 1
        });

        console.error(`❌ Operation '${context.operation}' failed on attempt ${attempt}:`, browserError.message);

        // If not retryable or last attempt, cleanup and throw
        if (!browserError.isRetryable || attempt > config.maxRetries) {
          if (cleanup) {
            try {
              await cleanup();
            } catch (cleanupError) {
              console.error('Cleanup failed:', cleanupError);
            }
          }
          throw browserError;
        }

        // Calculate delay for next attempt
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.log(`⏳ Retrying operation '${context.operation}' in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Unknown error');
  }

  /**
   * Classifies errors and determines if they are retryable
   */
  private classifyError(error: Error, context: BrowserErrorContext): BrowserError {
    const message = error.message.toLowerCase();

    // Quota/Rate limit errors - not immediately retryable
    if (message.includes('429') || 
        message.includes('limit exceeded') || 
        message.includes('quota')) {
      return new BrowserError(
        `Browser Rendering quota exceeded: ${error.message}`,
        'QUOTA_EXCEEDED',
        context,
        false // Not retryable
      );
    }

    // Connection/Network errors - retryable
    if (message.includes('connection closed') ||
        message.includes('network error') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound')) {
      return new BrowserError(
        `Network/Connection error: ${error.message}`,
        'NETWORK_ERROR',
        context,
        true // Retryable
      );
    }

    // Browser launch failures - might be retryable
    if (message.includes('failed to launch') ||
        message.includes('browser not found') ||
        message.includes('spawn') ||
        message.includes('executable')) {
      return new BrowserError(
        `Browser launch failed: ${error.message}`,
        'LAUNCH_FAILED',
        context,
        true // Retryable
      );
    }

    // Page/Navigation errors - retryable
    if (message.includes('navigation') ||
        message.includes('page crashed') ||
        message.includes('target closed') ||
        message.includes('execution context')) {
      return new BrowserError(
        `Page/Navigation error: ${error.message}`,
        'PAGE_ERROR',
        context,
        true // Retryable
      );
    }

    // Resource errors - sometimes retryable
    if (message.includes('out of memory') ||
        message.includes('resource') ||
        message.includes('insufficient')) {
      return new BrowserError(
        `Resource error: ${error.message}`,
        'RESOURCE_ERROR',
        context,
        context.attempt <= 2 // Only retry once for resource errors
      );
    }

    // Session/Authentication errors - not retryable
    if (message.includes('session not found') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('expired')) {
      return new BrowserError(
        `Session/Auth error: ${error.message}`,
        'SESSION_ERROR',
        context,
        false
      );
    }

    // Unknown errors - conservatively retryable for first attempt only
    return new BrowserError(
      `Unknown browser error: ${error.message}`,
      'UNKNOWN_ERROR',
      context,
      context.attempt === 1 // Only retry once for unknown errors
    );
  }

  /**
   * Creates a circuit breaker pattern for browser operations
   */
  createCircuitBreaker(failureThreshold: number = 5, resetTimeoutMs: number = 60000) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return {
      async execute<T>(
        operation: () => Promise<T>,
        context: Omit<BrowserErrorContext, 'attempt' | 'totalAttempts'>
      ): Promise<T> {
        const now = Date.now();

        // Check if circuit should reset
        if (state === 'open' && now - lastFailureTime > resetTimeoutMs) {
          state = 'half-open';
          failureCount = 0;
        }

        // Fail fast if circuit is open
        if (state === 'open') {
          throw new BrowserError(
            'Circuit breaker is open - Browser Rendering service appears to be down',
            'CIRCUIT_OPEN',
            { ...context, attempt: 1, totalAttempts: 1 },
            false
          );
        }

        try {
          const result = await operation();
          
          // Success - reset circuit if it was half-open
          if (state === 'half-open') {
            state = 'closed';
            failureCount = 0;
          }
          
          return result;
        } catch (error) {
          failureCount++;
          lastFailureTime = now;

          // Open circuit if threshold reached
          if (failureCount >= failureThreshold) {
            state = 'open';
            console.error(`🚨 Circuit breaker opened after ${failureCount} failures`);
          }

          throw error;
        }
      },

      getState() {
        return { state, failureCount, lastFailureTime };
      }
    };
  }
}

// Export singleton instance
export const browserErrorHandler = new BrowserErrorHandler();
