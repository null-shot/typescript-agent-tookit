import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VectorizeRepository } from './repository';
import { z } from 'zod';
import {
  AddDocumentSchema,
  UpdateDocumentSchema,
  SearchQuerySchema,
  DocumentIdSchema,
  DeleteDocumentSchema,
  DocumentFilterSchema,
  FindRelatedSchema,
  BatchAddDocumentsSchema,
  IndexStatsSchema,
  VectorDocument,
} from './schema';

export function setupServerTools(server: McpServer, repository: VectorizeRepository) {
  
  /**
   * Tool 1: Add Document with Embedding
   * Purpose: Store a document and automatically generate its vector embedding
   */
  server.tool(
    'add_document',
    'Add a document to the vector database with automatic embedding generation',
    {
      title: AddDocumentSchema.shape.title,
      content: AddDocumentSchema.shape.content,
      category: AddDocumentSchema.shape.category,
      source: AddDocumentSchema.shape.source,
      tags: AddDocumentSchema.shape.tags,
      author: AddDocumentSchema.shape.author,
    },
    async (args) => {
      try {
        const validatedArgs = AddDocumentSchema.parse(args);
        
        const document = await repository.addDocument({
          title: validatedArgs.title,
          content: validatedArgs.content,
          metadata: {
            category: validatedArgs.category,
            source: validatedArgs.source,
            author: validatedArgs.author,
            tags: validatedArgs.tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ Document "${document.title}" added successfully!\n\n` +
                    `📄 ID: ${document.id}\n` +
                    `📂 Category: ${document.metadata.category || 'Uncategorized'}\n` +
                    `👤 Author: ${document.metadata.author || 'Unknown'}\n` +
                    `🏷️ Tags: ${document.metadata.tags?.join(', ') || 'None'}\n` +
                    `📊 Content Length: ${document.content.length} characters\n` +
                    `🔗 Vector Embedding: Generated (${document.embedding?.length} dimensions)`
            }
          ],
          document
        };
      } catch (error) {
        console.error("Error adding document:", error);
        throw new Error(`Failed to add document: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 2: Semantic Search
   * Purpose: Find documents similar to a text query
   */
  server.tool(
    'search_similar',
    'Perform semantic search to find documents similar to your query',
    {
      query: SearchQuerySchema.shape.query,
      limit: SearchQuerySchema.shape.limit,
      threshold: SearchQuerySchema.shape.threshold,
      category: SearchQuerySchema.shape.category,
      author: SearchQuerySchema.shape.author,
      tags: SearchQuerySchema.shape.tags,
      include_content: SearchQuerySchema.shape.include_content,
    },
    async (args) => {
      try {
        const validatedArgs = SearchQuerySchema.parse(args);
        
        const results = await repository.searchSimilar(validatedArgs.query, {
          limit: validatedArgs.limit,
          threshold: validatedArgs.threshold,
          category: validatedArgs.category,
          author: validatedArgs.author,
          tags: validatedArgs.tags,
          includeContent: validatedArgs.include_content,
        });

        const resultText = results.length > 0
          ? `🔍 Found ${results.length} similar document(s):\n\n` +
            results.map((doc, index) => 
              `${index + 1}. **${doc.title}**\n` +
              `   📊 Similarity: ${(doc.similarity_score! * 100).toFixed(1)}%\n` +
              `   📂 Category: ${doc.metadata.category || 'Uncategorized'}\n` +
              `   👤 Author: ${doc.metadata.author || 'Unknown'}\n` +
              `   🏷️ Tags: ${doc.metadata.tags?.join(', ') || 'None'}\n` +
              (validatedArgs.include_content ? `   📄 Content: ${doc.content.substring(0, 200)}...\n` : '') +
              `   🆔 ID: ${doc.id}\n`
            ).join('\n')
          : `❌ No similar documents found with the following criteria:\n\n` +
            `🔍 **Search Query**: "${validatedArgs.query}"\n` +
            `📊 **Similarity Threshold**: ${validatedArgs.threshold} (${(validatedArgs.threshold * 100).toFixed(0)}%)\n` +
            `📂 **Category Filter**: ${validatedArgs.category || 'None (all categories)'}\n` +
            `👤 **Author Filter**: ${validatedArgs.author || 'None (all authors)'}\n` +
            `🏷️ **Tag Filters**: ${validatedArgs.tags?.length ? validatedArgs.tags.join(', ') : 'None (all tags)'}\n` +
            `📄 **Result Limit**: ${validatedArgs.limit}\n\n` +
            `💡 **Try:**\n` +
            `• Lowering the similarity threshold (try 0.5 or 0.6)\n` +
            `• Using different search terms\n` +
            `• Removing category filter: ${validatedArgs.category ? `"${validatedArgs.category}"` : '(none to remove)'}\n` +
            `• Removing author filter: ${validatedArgs.author ? `"${validatedArgs.author}"` : '(none to remove)'}\n` +
            `• Removing tag filters: ${validatedArgs.tags?.length ? validatedArgs.tags.join(', ') : '(none to remove)'}\n` +
            `• Using get_index_stats to see available categories and document count`;

        return {
          content: [
            {
              type: "text",
              text: resultText
            }
          ],
          query: validatedArgs.query,
          results,
          count: results.length
        };
      } catch (error) {
        console.error("Error searching documents:", error);
        throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 3: Get Document
   * Purpose: Retrieve a specific document by ID
   */
  server.tool(
    'get_document',
    'Retrieve a specific document by its ID',
    {
      id: DocumentIdSchema.shape.id,
      include_embedding: DocumentIdSchema.shape.include_embedding,
    },
    async (args) => {
      try {
        const validatedArgs = DocumentIdSchema.parse(args);
        
        const document = await repository.getDocumentById(
          validatedArgs.id,
          validatedArgs.include_embedding
        );

        if (!document) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Document with ID "${validatedArgs.id}" not found.\n\n` +
                      `💡 Use the 'list_documents' tool to see available documents.`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Document found!\n\n` +
                    `📄 **${document.title}**\n` +
                    `🆔 ID: ${document.id}\n` +
                    `📂 Category: ${document.metadata.category || 'Uncategorized'}\n` +
                    `👤 Author: ${document.metadata.author || 'Unknown'}\n` +
                    `🏷️ Tags: ${document.metadata.tags?.join(', ') || 'None'}\n` +
                    `📅 Created: ${new Date(document.metadata.created_at).toLocaleDateString()}\n` +
                    `🔄 Updated: ${new Date(document.metadata.updated_at).toLocaleDateString()}\n` +
                    `📊 Content Length: ${document.content.length} characters\n` +
                    (validatedArgs.include_embedding ? `🔗 Embedding: ${document.embedding?.length} dimensions\n` : '') +
                    `\n📄 **Content:**\n${document.content.substring(0, 500)}${document.content.length > 500 ? '...' : ''}`
            }
          ],
          document
        };
      } catch (error) {
        console.error("Error getting document:", error);
        throw new Error(`Failed to get document: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 4: Update Document
   * Purpose: Update document content and regenerate embedding
   */
  server.tool(
    'update_document',
    'Update an existing document and optionally regenerate its embedding',
    {
      id: UpdateDocumentSchema.shape.id,
      title: UpdateDocumentSchema.shape.title,
      content: UpdateDocumentSchema.shape.content,
      category: UpdateDocumentSchema.shape.category,
      source: UpdateDocumentSchema.shape.source,
      tags: UpdateDocumentSchema.shape.tags,
      author: UpdateDocumentSchema.shape.author,
      regenerate_embedding: UpdateDocumentSchema.shape.regenerate_embedding,
    },
    async (args) => {
      try {
        const validatedArgs = UpdateDocumentSchema.parse(args);
        
        const updatedDocument = await repository.updateDocument(
          validatedArgs.id,
          {
            title: validatedArgs.title,
            content: validatedArgs.content,
            metadata: {
              category: validatedArgs.category,
              source: validatedArgs.source,
              author: validatedArgs.author,
              tags: validatedArgs.tags,
            },
          },
          validatedArgs.regenerate_embedding
        );

        if (!updatedDocument) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Document with ID "${validatedArgs.id}" not found.\n\n` +
                      `💡 Use the 'list_documents' tool to see available documents.`
              }
            ]
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Document "${updatedDocument.title || updatedDocument.id}" updated successfully!\n\n` +
                    `🆔 ID: ${updatedDocument.id}\n` +
                    `📂 Category: ${updatedDocument.metadata.category || 'Uncategorized'}\n` +
                    `👤 Author: ${updatedDocument.metadata.author || 'Unknown'}\n` +
                    `🏷️ Tags: ${updatedDocument.metadata.tags?.join(', ') || 'None'}\n` +
                    `🔄 Updated: ${new Date(updatedDocument.metadata.updated_at).toLocaleString()}\n` +
                    `📊 Content Length: ${updatedDocument.content?.length || 0} characters\n` +
                    (validatedArgs.regenerate_embedding ? '🔗 Embedding: Regenerated' : '🔗 Embedding: Preserved')
            }
          ],
          document: updatedDocument
        };
      } catch (error) {
        console.error("Error updating document:", error);
        throw new Error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 5: Delete Document
   * Purpose: Remove a document and its embedding
   */
  server.tool(
    'delete_document',
    'Delete a document from the vector database (requires confirmation)',
    {
      id: DeleteDocumentSchema.shape.id,
      confirm: DeleteDocumentSchema.shape.confirm,
    },
    async (args) => {
      try {
        const validatedArgs = DeleteDocumentSchema.parse(args);
        
        // Explicit confirmation check - must be exactly true
        if (validatedArgs.confirm !== true) {
          return {
            content: [
              {
                type: "text",
                text: `⚠️ Deletion requires explicit confirmation.\n\n` +
                      `📋 **Current confirmation status**: ${validatedArgs.confirm}\n` +
                      `🚨 **To delete document "${validatedArgs.id}"**, you must set:\n` +
                      `   "confirm": true\n\n` +
                      `⚠️ **Safety Notice**: This action cannot be undone!`
              }
            ]
          };
        }

        // Get document info before deletion
        const document = await repository.getDocumentById(validatedArgs.id);
        
        if (!document) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Document with ID "${validatedArgs.id}" not found.\n\n` +
                      `💡 Use the 'list_documents' tool to see available documents.`
              }
            ]
          };
        }

        const deleted = await repository.deleteDocument(validatedArgs.id);
        
        if (deleted) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Document "${document.title}" deleted successfully!\n\n` +
                      `🆔 Deleted ID: ${validatedArgs.id}\n` +
                      `🗑️ The document and its vector embedding have been removed.`
              }
            ]
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to delete document "${validatedArgs.id}".\n\n` +
                      `The document may have already been deleted or there was an error.`
              }
            ]
          };
        }
      } catch (error) {
        console.error("Error deleting document:", error);
        throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 6: List Documents
   * Purpose: Browse documents with filtering and pagination
   */
  server.tool(
    'list_documents',
    'List documents with filtering and pagination options',
    {
      category: DocumentFilterSchema.shape.category,
      author: DocumentFilterSchema.shape.author,
      source: DocumentFilterSchema.shape.source,
      tags: DocumentFilterSchema.shape.tags,
      limit: DocumentFilterSchema.shape.limit,
      offset: DocumentFilterSchema.shape.offset,
      sort_by: DocumentFilterSchema.shape.sort_by,
      sort_order: DocumentFilterSchema.shape.sort_order,
    },
    async (args) => {
      try {
        const validatedArgs = DocumentFilterSchema.parse(args);
        
        const result = await repository.listDocuments(validatedArgs);

        const resultText = result.documents.length > 0
          ? `📚 Found ${result.documents.length} document(s) (${result.total} total):\n\n` +
            result.documents.map((doc, index) => 
              `${validatedArgs.offset + index + 1}. **${doc.title}**\n` +
              `   🆔 ID: ${doc.id}\n` +
              `   📂 Category: ${doc.metadata.category || 'Uncategorized'}\n` +
              `   👤 Author: ${doc.metadata.author || 'Unknown'}\n` +
              `   🏷️ Tags: ${doc.metadata.tags?.join(', ') || 'None'}\n` +
              `   📅 Created: ${new Date(doc.metadata.created_at).toLocaleDateString()}\n` +
              `   📊 Length: ${doc.content.length} chars\n`
            ).join('\n') +
            (result.hasMore ? `\n📄 Use offset: ${validatedArgs.offset + validatedArgs.limit} to see more results.` : '')
          : `❌ No documents found matching your criteria.\n\n` +
            `💡 Try:\n` +
            `• Removing some filters\n` +
            `• Adding documents first with 'add_document'\n` +
            `• Checking your category/author/tag filters`;

        return {
          content: [
            {
              type: "text",
              text: resultText
            }
          ],
          documents: result.documents,
          pagination: {
            total: result.total,
            offset: validatedArgs.offset,
            limit: validatedArgs.limit,
            hasMore: result.hasMore
          }
        };
      } catch (error) {
        console.error("Error listing documents:", error);
        throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 7: Find Related Documents
   * Purpose: Find documents similar to a specific document
   */
  server.tool(
    'find_related',
    'Find documents similar to a specific document by ID',
    {
      document_id: FindRelatedSchema.shape.document_id,
      limit: FindRelatedSchema.shape.limit,
      threshold: FindRelatedSchema.shape.threshold,
      exclude_same_author: FindRelatedSchema.shape.exclude_same_author,
      exclude_same_category: FindRelatedSchema.shape.exclude_same_category,
    },
    async (args) => {
      try {
        const validatedArgs = FindRelatedSchema.parse(args);
        
        const relatedDocs = await repository.findRelatedDocuments(validatedArgs.document_id, {
          limit: validatedArgs.limit,
          threshold: validatedArgs.threshold,
          excludeSameAuthor: validatedArgs.exclude_same_author,
          excludeSameCategory: validatedArgs.exclude_same_category,
        });

        if (relatedDocs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No related documents found for ID "${validatedArgs.document_id}".\n\n` +
                      `💡 Try:\n` +
                      `• Lowering the similarity threshold (current: ${validatedArgs.threshold})\n` +
                      `• Checking if the document ID exists\n` +
                      `• Adding more documents to increase potential matches`
              }
            ]
          };
        }

        const resultText = `🔗 Found ${relatedDocs.length} related document(s):\n\n` +
          relatedDocs.map((doc, index) => 
            `${index + 1}. **${doc.title}**\n` +
            `   📊 Similarity: ${(doc.similarity_score! * 100).toFixed(1)}%\n` +
            `   📂 Category: ${doc.metadata.category || 'Uncategorized'}\n` +
            `   👤 Author: ${doc.metadata.author || 'Unknown'}\n` +
            `   🆔 ID: ${doc.id}\n` +
            `   📄 Preview: ${doc.content.substring(0, 150)}...\n`
          ).join('\n');

        return {
          content: [
            {
              type: "text",
              text: resultText
            }
          ],
          source_document_id: validatedArgs.document_id,
          related_documents: relatedDocs,
          count: relatedDocs.length
        };
      } catch (error) {
        console.error("Error finding related documents:", error);
        throw new Error(`Failed to find related documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 8: Atomic Batch Add Documents
   * Purpose: Add multiple documents atomically - all succeed or all fail with rollback
   */
  server.tool(
    'batch_add_documents',
    'Atomically add multiple documents to the vector database - all succeed or all fail with automatic rollback',
    {
      documents: z.array(z.object({
        title: z.string().describe('Document title'),
        content: z.string().describe('Document content'),
        category: z.string().optional().describe('Document category'),
        source: z.string().optional().describe('Document source'),
        tags: z.array(z.string()).optional().describe('Document tags'),
        author: z.string().optional().describe('Document author'),
      })).min(1).max(50).describe('Array of documents to add (1-50 documents)'),
      batch_size: z.number().min(1).max(10).default(5).describe('Process in batches of this size (1-10, default: 5)'),
    },
    async (args) => {
      try {
        const validatedArgs = BatchAddDocumentsSchema.parse(args);
        
        const documentsToAdd = validatedArgs.documents.map(doc => ({
          title: doc.title,
          content: doc.content,
          metadata: {
            category: doc.category,
            source: doc.source,
            author: doc.author,
            tags: doc.tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }));

        const result = await repository.batchAddDocuments(documentsToAdd, validatedArgs.batch_size);

        let resultText: string;
        
        if (result.atomic_result === 'complete_success') {
          resultText = `🎉 **ATOMIC BATCH SUCCESS!**\n\n` +
            `✅ **ALL ${result.success.length} documents added successfully**\n\n` +
            `**Added Documents:**\n` +
            result.success.map((doc, index) => 
              `${index + 1}. **${doc.title}**\n   🆔 ID: ${doc.id}\n   📂 Category: ${doc.metadata.category || 'None'}`
            ).join('\n\n') +
            `\n\n🔒 **Atomic Guarantee**: All documents were added in a single transaction.`;
        } else {
          resultText = `❌ **ATOMIC BATCH FAILED!**\n\n` +
            `🚫 **NO documents were added** (atomic rollback completed)\n\n` +
            `**Failure Details:**\n` +
            result.failed.map((failure, index) => 
              `${index + 1}. **${failure.document.title}**: ${failure.error}`
            ).join('\n') +
            `\n\n🔒 **Atomic Guarantee**: Since one document failed, ALL documents were rolled back.\n` +
            `💡 **Next Steps**: Fix the errors above and retry the entire batch.`;
        }

        return {
          content: [
            {
              type: "text",
              text: resultText
            }
          ],
          atomic_result: result.atomic_result,
          stats: {
            total_attempted: validatedArgs.documents.length,
            atomic_operation: true,
            batch_size: validatedArgs.batch_size,
            ...(result.atomic_result === 'complete_success' 
              ? { documents_added: result.success.length, document_ids: result.success.map(d => d.id) }
              : { documents_added: 0, rollback_completed: true }
            )
          }
        };
      } catch (error) {
        console.error("Error batch adding documents:", error);
        throw new Error(`Failed to batch add documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  /**
   * Tool 9: Get Index Stats
   * Purpose: Get statistics about the vector index
   */
  server.tool(
    'get_index_stats',
    'Get statistics and information about the vector index',
    {
      include_categories: IndexStatsSchema.shape.include_categories,
      include_recent: IndexStatsSchema.shape.include_recent,
    },
    async (args) => {
      try {
        const validatedArgs = IndexStatsSchema.parse(args);
        
        const stats = await repository.getIndexStats(
          validatedArgs.include_categories,
          validatedArgs.include_recent
        );

        let resultText = `📊 **Vector Index Statistics**\n\n` +
          `📄 **Index Information:**\n` +
          `• Dimensions: ${stats.index.dimensions}\n` +
          `• Total Vectors: ${stats.index.vectorCount.toLocaleString()}\n`;

        if (validatedArgs.include_categories && stats.categories) {
          if (stats.categories.error) {
            // Error getting category data
            resultText += `\n📂 **Categories:**\n` +
              `❌ ${stats.categories.error}\n` +
              `📋 Error: ${stats.categories.message}\n` +
              `📊 Total vectors: ${stats.categories.total_vectors}`;
          } else if (typeof stats.categories.note === 'string') {
            // Placeholder format with notes
            resultText += `\n📂 **Categories:**\n` +
              `ℹ️ ${stats.categories.note}\n` +
              `💡 ${stats.categories.suggestion}\n` +
              `📋 Known categories: ${stats.categories.known_categories.join(', ')}\n` +
              `📊 Total documents: ${stats.categories.total_vectors}`;
          } else {
            // Real category counts
            const totalVectors = stats.index.vectorCount || 0;
            const isSample = totalVectors > 50;
            
            resultText += `\n📂 **Categories:**\n`;
            if (isSample) {
              resultText += `📊 **Sample from 50 of ${totalVectors} documents:**\n`;
            }
            resultText += Object.entries(stats.categories).map(([category, count]) => 
              `• ${category}: ${count} document${count !== 1 ? 's' : ''}${isSample ? ' (sampled)' : ''}`
            ).join('\n');
          }
        }

        if (validatedArgs.include_recent && stats.recent) {
          if (typeof stats.recent.note === 'string') {
            // New format with notes and suggestions
            resultText += `\n📅 **Recent Activity:**\n` +
              `ℹ️ ${stats.recent.note}\n` +
              `💡 ${stats.recent.suggestion}\n` +
              `📊 Total documents: ${stats.recent.total_vectors}\n` +
              `📅 Index created: ${stats.recent.index_created}\n` +
              `🟢 Status: ${stats.recent.last_activity}`;
          } else {
            // Legacy format with counts
            resultText += `\n📅 **Recent Activity:**\n` +
              `• Last 24 hours: ${stats.recent.last24h} documents\n` +
              `• Last 7 days: ${stats.recent.last7d} documents\n` +
              `• Last 30 days: ${stats.recent.last30d} documents`;
          }
        }

        // Add debug information if available
        if (stats.debug) {
          resultText += `\n\n🔍 **Debug Information:**\n` +
            `📊 Raw index info: ${JSON.stringify(stats.debug.raw_index_info, null, 2)}\n` +
            `⏰ Generated at: ${stats.debug.timestamp}`;
        }

        return {
          content: [
            {
              type: "text",
              text: resultText
            }
          ],
          stats,
          raw_data: stats.debug // Include raw data for inspection
        };
      } catch (error) {
        console.error("Error getting index stats:", error);
        throw new Error(`Failed to get index stats: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
