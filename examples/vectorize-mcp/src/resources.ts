import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VectorizeRepository } from './repository';
import { SEARCH_CONFIG } from './schema';

export function setupServerResources(server: McpServer, repository: VectorizeRepository) {
  
  /**
   * Resource: List all documents
   * URI: vectorize://documents
   */
  server.resource(
    'listDocuments',
    'vectorize://documents',
    async () => {
      try {
        const result = await repository.listDocuments({
          limit: 50,
          offset: 0,
          sort_by: 'updated_at',
          sort_order: 'desc',
        });

        const resourceData = {
          documents: result.documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            category: doc.metadata.category,
            author: doc.metadata.author,
            tags: doc.metadata.tags,
            created_at: doc.metadata.created_at,
            updated_at: doc.metadata.updated_at,
            content_length: doc.content.length,
          })),
          total: result.total,
          last_updated: new Date().toISOString(),
        };

        return {
          contents: [
            {
              uri: 'vectorize://documents',
              mimeType: 'application/json',
              text: JSON.stringify(resourceData, null, 2),
            }
          ]
        };
      } catch (error) {
        console.error("Error listing documents resource:", error);
        return {
          contents: [
            {
              uri: 'vectorize://documents',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Failed to load documents' }, null, 2),
            }
          ]
        };
      }
    }
  );

  /**
   * Resource: Available categories
   * URI: vectorize://categories
   */
  server.resource(
    'listCategories',
    'vectorize://categories',
    async () => {
      try {
        const stats = await repository.getIndexStats(true, false);
        
        const resourceData = {
          categories: stats.categories || {},
          total_categories: Object.keys(stats.categories || {}).length,
          last_updated: new Date().toISOString(),
        };

        return {
          contents: [
            {
              uri: 'vectorize://categories',
              mimeType: 'application/json',
              text: JSON.stringify(resourceData, null, 2),
            }
          ]
        };
      } catch (error) {
        console.error("Error getting categories resource:", error);
        return {
          contents: [
            {
              uri: 'vectorize://categories',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Failed to load categories' }, null, 2),
            }
          ]
        };
      }
    }
  );

  /**
   * Resource: Index statistics
   * URI: vectorize://index-stats
   */
  server.resource(
    'indexStats',
    'vectorize://index-stats',
    async () => {
      try {
        const stats = await repository.getIndexStats(true, true);
        
        const resourceData = {
          index: stats.index,
          categories: stats.categories,
          recent_activity: stats.recent,
          health: {
            status: 'healthy',
            last_checked: new Date().toISOString(),
          },
        };

        return {
          contents: [
            {
              uri: 'vectorize://index-stats',
              mimeType: 'application/json',
              text: JSON.stringify(resourceData, null, 2),
            }
          ]
        };
      } catch (error) {
        console.error("Error getting index stats resource:", error);
        return {
          contents: [
            {
              uri: 'vectorize://index-stats',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Failed to load index stats' }, null, 2),
            }
          ]
        };
      }
    }
  );

  /**
   * Dynamic Resource: Similar documents for a specific document
   * URI Pattern: vectorize://similar/{document_id}
   */
  server.resource(
    'findSimilar',
    'vectorize://similar/*',
    async (uri: URL) => {
      try {
        // Extract document ID from URI
        const match = uri.href.match(/^vectorize:\/\/similar\/(.+)$/);
        if (!match) {
          throw new Error('Invalid URI format. Expected: vectorize://similar/{document_id}');
        }
        
        const documentId = match[1];
        
        const relatedDocs = await repository.findRelatedDocuments(documentId, {
          limit: 5,
          threshold: SEARCH_CONFIG.DEFAULT_THRESHOLD,
        });

        const resourceData = {
          source_document_id: documentId,
          related_documents: relatedDocs.map(doc => ({
            id: doc.id,
            title: doc.title,
            similarity_score: doc.similarity_score,
            category: doc.metadata.category,
            author: doc.metadata.author,
            tags: doc.metadata.tags,
            content_preview: doc.content.substring(0, 200) + '...',
          })),
          count: relatedDocs.length,
          threshold_used: SEARCH_CONFIG.DEFAULT_THRESHOLD,
          generated_at: new Date().toISOString(),
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(resourceData, null, 2),
            }
          ]
        };
      } catch (error) {
        console.error("Error getting similar documents resource:", error);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ 
                error: 'Failed to load similar documents',
                message: error instanceof Error ? error.message : String(error)
              }, null, 2),
            }
          ]
        };
      }
    }
  );
}
