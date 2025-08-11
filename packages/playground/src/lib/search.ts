import Fuse, { IFuseOptions, FuseResultMatch } from 'fuse.js';
import { MCPServer } from '@/types/mcp-server';

// Search configuration for Fuse.js
const searchOptions: IFuseOptions<MCPServer> = {
  // Include score for ranking
  includeScore: true,
  // Include matches for highlighting
  includeMatches: true,
  // Threshold for fuzzy matching (0.0 = exact match, 1.0 = match anything)
  threshold: 0.3,
  // Location and distance for search
  location: 0,
  distance: 100,
  // Minimum match character length
  minMatchCharLength: 2,
  // Fields to search in order of importance
  keys: [
    {
      name: 'name',
      weight: 0.25
    },
    {
      name: 'unique_name',
      weight: 0.25
    },
    {
      name: 'shortDescription',
      weight: 0.2
    },
    {
      name: 'short_description',
      weight: 0.2
    },
    {
      name: 'keywords',
      weight: 0.15
    },
    {
      name: 'parsedTags',
      weight: 0.15
    },
    {
      name: 'searchText',
      weight: 0.1
    },
    {
      name: 'category',
      weight: 0.05
    }
  ]
};

export class MCPServerSearch {
  private fuse: Fuse<MCPServer>;
  private servers: MCPServer[];

  constructor(servers: MCPServer[]) {
    this.servers = servers;
    this.fuse = new Fuse(servers, searchOptions);
  }

  // Update the search index with new servers
  updateServers(servers: MCPServer[]): void {
    this.servers = servers;
    this.fuse.setCollection(servers);
  }

  // Search servers with query
  search(query: string): MCPServer[] {
    if (!query.trim()) {
      // Return all servers sorted by popularity if no query
      return [...this.servers].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const results = this.fuse.search(query);
    return results.map(result => result.item);
  }

  // Get search results with scores and highlighting info
  searchWithMetadata(query: string): Array<{
    server: MCPServer;
    score?: number;
    matches?: readonly FuseResultMatch[];
  }> {
    if (!query.trim()) {
      return this.servers
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .map(server => ({ server }));
    }

    const results = this.fuse.search(query);
    return results.map(result => ({
      server: result.item,
      score: result.score,
      matches: result.matches
    }));
  }

  // Filter by category
  filterByCategory(category: string): MCPServer[] {
    return this.servers.filter(server => 
      server.category?.toLowerCase() === category.toLowerCase()
    );
  }

  // Filter by provider/author
  filterByAuthor(author: string): MCPServer[] {
    return this.servers.filter(server => 
      server.author?.toLowerCase().includes(author.toLowerCase())
    );
  }

  // Get all unique categories
  getCategories(): string[] {
    const categories = new Set<string>();
    
    this.servers.forEach(server => {
      // Add legacy category if it exists
      if (server.category) {
        categories.add(server.category);
      }
      
      // Add parsed tags if they exist
      if (server.parsedTags) {
        server.parsedTags.forEach(tag => categories.add(tag));
      }
    });
    
    return Array.from(categories).sort();
  }

  // Get all unique authors
  getAuthors(): string[] {
    const authors = new Set(
      this.servers
        .map(server => server.author)
        .filter(Boolean) as string[]
    );
    return Array.from(authors).sort();
  }

  // Combined search with filters
  searchWithFilters(
    query: string,
    filters: {
      category?: string;
      author?: string;
      license?: string;
    } = {}
  ): MCPServer[] {
    let results = this.search(query);

    if (filters.category) {
      const categoryFilter = filters.category;
      results = results.filter(server => 
        server.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    if (filters.author) {
      const authorFilter = filters.author;
      results = results.filter(server => 
        server.author?.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }

    if (filters.license) {
      const licenseFilter = filters.license;
      results = results.filter(server => {
        // Support both old format (licenses array) and new format (license string)
        if (server.licenses) {
          return server.licenses.some(license => 
            license.toLowerCase().includes(licenseFilter.toLowerCase())
          );
        } else if (server.license) {
          return server.license.toLowerCase().includes(licenseFilter.toLowerCase());
        }
        return false;
      });
    }

    return results;
  }
}

// Singleton search instance
let searchInstance: MCPServerSearch | null = null;

export function initializeSearch(servers: MCPServer[]): MCPServerSearch {
  searchInstance = new MCPServerSearch(servers);
  return searchInstance;
}

export function getSearchInstance(): MCPServerSearch | null {
  return searchInstance;
}

// Utility function for highlighting search matches
export function highlightSearchMatch(
  text: string,
  matches: readonly FuseResultMatch[] = [],
  fieldName: string
): string {
  const match = matches.find(m => m.key === fieldName);
  if (!match || !match.indices) return text;

  let highlightedText = text;
  let offset = 0;

  // Sort indices by start position (descending) to avoid offset issues
  const sortedIndices = [...match.indices].sort((a, b) => b[0] - a[0]);

  sortedIndices.forEach(([start, end]) => {
    const before = highlightedText.slice(0, start + offset);
    const highlighted = highlightedText.slice(start + offset, end + 1 + offset);
    const after = highlightedText.slice(end + 1 + offset);
    
    highlightedText = before + `<mark>${highlighted}</mark>` + after;
    offset += 13; // length of <mark></mark>
  });

  return highlightedText;
} 