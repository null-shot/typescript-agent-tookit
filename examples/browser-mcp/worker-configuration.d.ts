interface Env {
  MYBROWSER: Fetcher; // Browser Rendering binding
  DB: D1Database;
  CACHE_BUCKET?: R2Bucket; // Optional for testing
  
  // Environment variables
  MAX_CONCURRENT_SESSIONS: string;
  SESSION_TIMEOUT_MS: string;
  CACHE_TTL_HOURS: string;
  MAX_PAGE_SIZE_MB: string;
}
