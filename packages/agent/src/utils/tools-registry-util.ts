/**
 * Utility for generating tools registry configuration
 */
export class ToolsRegistryUtil {
  /**
   * Convert a config object to an environment variable value
   * @param config The config object
   * @param format Output format ('json' or 'base64')
   * @returns The formatted config string
   */
  static generateFromConfig(config: any, format: 'json' | 'base64' = 'base64'): string {
    try {
      // Convert to string
      const jsonStr = JSON.stringify(config);
      
      // Format based on preference
      if (format === 'base64') {
        return btoa(jsonStr); // Use Web API's btoa
      } else {
        return jsonStr;
      }
    } catch (error) {
      console.error('Error generating tools registry from config:', error);
      throw error;
    }
  }

  /**
   * Parse a tools registry string back to a config object
   * @param registryStr The registry string (JSON or base64-encoded JSON)
   * @returns The parsed config object or null if parsing failed
   */
  static parseRegistry(registryStr: string): any | null {
    // First try to parse as JSON
    try {
      return JSON.parse(registryStr);
    } catch (e) {
      // If that fails, try to decode from Base64
      try {
        const decoded = atob(registryStr);
        return JSON.parse(decoded);
      } catch (e2) {
        console.error('Failed to parse tools registry:', e2);
        return null;
      }
    }
  }
} 