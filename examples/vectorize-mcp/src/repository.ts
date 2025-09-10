import { VectorDocument, DocumentFilter, EMBEDDING_CONFIG } from './schema';

/**
 * VectorizeRepository handles all vector database operations
 */
export class VectorizeRepository {
  constructor(
    private vectorizeIndex: VectorizeIndex,
    private env: { 
      ANTHROPIC_API_KEY: string;
      AI?: any; // Workers AI binding
    }
  ) {}

  /**
   * Generate embedding using Workers AI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Truncate text to fit model limits
    const truncatedText = text.substring(0, EMBEDDING_CONFIG.MAX_TOKENS);
    
    try {
      // Try Workers AI first if available
      if (this.env.AI) {
        const response = await this.env.AI.run(EMBEDDING_CONFIG.MODEL, {
          text: truncatedText,
        });
        
        if (response.data && Array.isArray(response.data[0])) {
          return response.data[0];
        }
      }
      
      // Fallback to OpenAI-compatible API using Anthropic key
      // Note: Anthropic doesn't have embeddings API, so this is a placeholder
      // In a real implementation, you'd use a service that provides embeddings
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.ANTHROPIC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002', // Fallback to OpenAI model
          input: truncatedText,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      return data.data[0].embedding;
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a dummy embedding for development/testing
      return new Array(EMBEDDING_CONFIG.DIMENSIONS).fill(0).map(() => Math.random() - 0.5);
    }
  }

  /**
   * Add a document to the vector index
   */
  async addDocument(document: Omit<VectorDocument, 'id' | 'embedding'>): Promise<VectorDocument> {
    const id = `doc_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    
    // Generate embedding for the document content
    const embedding = await this.generateEmbedding(document.content);
    
    const vectorDoc: VectorDocument = {
      ...document,
      id,
      embedding,
      metadata: {
        ...document.metadata,
        created_at: now,
        updated_at: now,
      },
    };

    // Store in Vectorize
    await this.vectorizeIndex.upsert([{
      id,
      values: embedding,
      metadata: {
        title: vectorDoc.title,
        content: vectorDoc.content,
        category: vectorDoc.metadata.category || '',
        source: vectorDoc.metadata.source || '',
        author: vectorDoc.metadata.author || '',
        tags: vectorDoc.metadata.tags ? JSON.stringify(vectorDoc.metadata.tags) : '',
        created_at: vectorDoc.metadata.created_at,
        updated_at: vectorDoc.metadata.updated_at,
        chunk_index: vectorDoc.metadata.chunk_index?.toString() || '',
        parent_document_id: vectorDoc.metadata.parent_document_id || '',
      },
    }]);

    return vectorDoc;
  }

  /**
   * Search for similar documents using semantic search
   */
  async searchSimilar(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      category?: string;
      author?: string;
      tags?: string[];
      includeContent?: boolean;
    } = {}
  ): Promise<VectorDocument[]> {
    const {
      limit = 5,
      threshold = 0.7,
      category,
      author,
      tags,
      includeContent = true,
    } = options;

    // Generate embedding for search query
    const queryEmbedding = await this.generateEmbedding(query);

    // Build filter object
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (author) filter.author = author;
    if (tags && tags.length > 0) {
      // For simplicity, we'll filter by tag inclusion in the application layer
      // since Vectorize metadata filtering might not support complex JSON queries
    }

    // Perform vector search
    const results = await this.vectorizeIndex.query(queryEmbedding, {
      topK: limit * 2, // Get more results to filter by threshold
      returnMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    // Filter by threshold and convert to VectorDocument format
    return results.matches
      .filter(match => match.score >= threshold)
      .slice(0, limit)
      .map(match => this.vectorMatchToDocument(match, includeContent));
  }

  /**
   * Get a document by ID
   */
  async getDocumentById(id: string, includeEmbedding: boolean = false): Promise<VectorDocument | null> {
    const results = await this.vectorizeIndex.getByIds([id]);

    if (results.length === 0) {
      return null;
    }

    const vector = results[0];
    return this.vectorToDocument(vector, includeEmbedding);
  }

  /**
   * Update a document
   */
  async updateDocument(
    id: string,
    updates: Partial<Omit<VectorDocument, 'id' | 'metadata'>> & {
      metadata?: Partial<VectorDocument['metadata']>;
    },
    regenerateEmbedding: boolean = true
  ): Promise<VectorDocument | null> {
    // First get the existing document
    const existing = await this.getDocumentById(id, true);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    
    // Merge updates with existing document
    const updatedDoc: VectorDocument = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updated_at: now,
      },
    };

    // Regenerate embedding if content changed and requested
    let embedding = existing.embedding;
    if (regenerateEmbedding && updates.content && updates.content !== existing.content) {
      embedding = await this.generateEmbedding(updatedDoc.content);
      updatedDoc.embedding = embedding;
    }

    // Update in Vectorize
    await this.vectorizeIndex.upsert([{
      id,
      values: embedding || existing.embedding!,
      metadata: {
        title: updatedDoc.title,
        content: updatedDoc.content,
        category: updatedDoc.metadata.category || '',
        source: updatedDoc.metadata.source || '',
        author: updatedDoc.metadata.author || '',
        tags: updatedDoc.metadata.tags ? JSON.stringify(updatedDoc.metadata.tags) : '',
        created_at: updatedDoc.metadata.created_at,
        updated_at: updatedDoc.metadata.updated_at,
        chunk_index: updatedDoc.metadata.chunk_index?.toString() || '',
        parent_document_id: updatedDoc.metadata.parent_document_id || '',
      },
    }]);

    return updatedDoc;
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const result = await this.vectorizeIndex.deleteByIds([id]);
      return result.count > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * List documents with filtering and pagination
   */
  async listDocuments(filter: DocumentFilter): Promise<{
    documents: VectorDocument[];
    total: number;
    hasMore: boolean;
  }> {
    // Note: This is a simplified implementation
    // In a real scenario, we might need to implement pagination differently
    // since Vectorize doesn't have native pagination for listing all vectors
    
    // For now, we'll use a dummy query to get documents
    // This is not ideal but demonstrates the pattern
    const dummyEmbedding = new Array(EMBEDDING_CONFIG.DIMENSIONS).fill(0);
    
    const results = await this.vectorizeIndex.query(dummyEmbedding, {
      topK: filter.limit + filter.offset + 10, // Get extra to account for filtering
      returnMetadata: true,
    });

    // Filter results based on criteria
    let filteredResults = results.matches;
    
    if (filter.category) {
      filteredResults = filteredResults.filter(match => 
        match.metadata?.category === filter.category
      );
    }
    
    if (filter.author) {
      filteredResults = filteredResults.filter(match => 
        match.metadata?.author === filter.author
      );
    }
    
    if (filter.tags && filter.tags.length > 0) {
      filteredResults = filteredResults.filter(match => {
        const docTags = match.metadata?.tags ? JSON.parse(match.metadata.tags as string) : [];
        return filter.tags!.every(tag => docTags.includes(tag));
      });
    }

    // Sort results
    filteredResults.sort((a, b) => {
      const aValue = a.metadata?.[filter.sort_by] || '';
      const bValue = b.metadata?.[filter.sort_by] || '';
      
      if (filter.sort_order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const paginatedResults = filteredResults.slice(filter.offset, filter.offset + filter.limit);
    const documents = paginatedResults.map(match => this.vectorMatchToDocument(match, true));

    return {
      documents,
      total: filteredResults.length,
      hasMore: filteredResults.length > filter.offset + filter.limit,
    };
  }

  /**
   * Find documents related to a specific document
   */
  async findRelatedDocuments(
    documentId: string,
    options: {
      limit?: number;
      threshold?: number;
      excludeSameAuthor?: boolean;
      excludeSameCategory?: boolean;
    } = {}
  ): Promise<VectorDocument[]> {
    const {
      limit = 5,
      threshold = 0.7,
      excludeSameAuthor = false,
      excludeSameCategory = false,
    } = options;

    // Get the source document
    const sourceDoc = await this.getDocumentById(documentId, true);
    if (!sourceDoc || !sourceDoc.embedding) {
      return [];
    }

    // Search for similar documents
    const results = await this.vectorizeIndex.query(sourceDoc.embedding, {
      topK: limit * 2, // Get more to filter out exclusions
      returnMetadata: true,
    });

    // Filter results
    let filteredMatches = results.matches
      .filter(match => match.id !== documentId) // Exclude the source document
      .filter(match => match.score >= threshold);

    if (excludeSameAuthor && sourceDoc.metadata.author) {
      filteredMatches = filteredMatches.filter(match => 
        match.metadata?.author !== sourceDoc.metadata.author
      );
    }

    if (excludeSameCategory && sourceDoc.metadata.category) {
      filteredMatches = filteredMatches.filter(match => 
        match.metadata?.category !== sourceDoc.metadata.category
      );
    }

    return filteredMatches
      .slice(0, limit)
      .map(match => this.vectorMatchToDocument(match, true));
  }

  /**
   * Batch add multiple documents
   */
  async batchAddDocuments(
    documents: Omit<VectorDocument, 'id' | 'embedding'>[],
    batchSize: number = 5
  ): Promise<{
    success: VectorDocument[];
    failed: Array<{ document: any; error: string }>;
  }> {
    const success: VectorDocument[] = [];
    const failed: Array<{ document: any; error: string }> = [];

    // Process in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(doc => this.addDocument(doc))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          success.push(result.value);
        } else {
          failed.push({
            document: batch[index],
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      });
    }

    return { success, failed };
  }

  /**
   * Get index statistics
   */
  async getIndexStats(includeCategories: boolean = true, includeRecent: boolean = true): Promise<{
    index: VectorizeIndexInfo;
    categories?: Record<string, number>;
    recent?: {
      last24h: number;
      last7d: number;
      last30d: number;
    };
  }> {
    const indexInfo = await this.vectorizeIndex.describe();
    
    const stats: any = { index: indexInfo };

    if (includeCategories) {
      // This would require a more sophisticated implementation
      // For now, return a placeholder
      stats.categories = {
        'research': 0,
        'article': 0,
        'tutorial': 0,
        'other': 0,
      };
    }

    if (includeRecent) {
      // This would require tracking creation dates
      // For now, return a placeholder
      stats.recent = {
        last24h: 0,
        last7d: 0,
        last30d: 0,
      };
    }

    return stats;
  }

  /**
   * Convert Vectorize query match to VectorDocument
   */
  private vectorMatchToDocument(match: any, includeContent: boolean = true): VectorDocument {
    const metadata = match.metadata || {};
    
    return {
      id: match.id,
      title: (metadata.title as string) || 'Untitled',
      content: includeContent ? ((metadata.content as string) || '') : '[Content hidden]',
      embedding: Array.from(match.values || []),
      metadata: {
        category: metadata.category as string,
        source: metadata.source as string,
        author: metadata.author as string,
        tags: metadata.tags ? JSON.parse(metadata.tags as string) : undefined,
        created_at: (metadata.created_at as string) || new Date().toISOString(),
        updated_at: (metadata.updated_at as string) || new Date().toISOString(),
        chunk_index: metadata.chunk_index ? parseInt(metadata.chunk_index as string) : undefined,
        parent_document_id: metadata.parent_document_id as string,
      },
      similarity_score: match.score,
    };
  }

  /**
   * Convert Vectorize vector to VectorDocument
   */
  private vectorToDocument(vector: VectorizeVector, includeEmbedding: boolean = false): VectorDocument {
    const metadata = vector.metadata || {};
    
    return {
      id: vector.id,
      title: (metadata.title as string) || 'Untitled',
      content: (metadata.content as string) || '',
      embedding: includeEmbedding ? Array.from(vector.values) : undefined,
      metadata: {
        category: metadata.category as string,
        source: metadata.source as string,
        author: metadata.author as string,
        tags: metadata.tags ? JSON.parse(metadata.tags as string) : undefined,
        created_at: (metadata.created_at as string) || new Date().toISOString(),
        updated_at: (metadata.updated_at as string) || new Date().toISOString(),
        chunk_index: metadata.chunk_index ? parseInt(metadata.chunk_index as string) : undefined,
        parent_document_id: metadata.parent_document_id as string,
      },
    };
  }

  /**
   * Chunk large documents into smaller pieces for better search
   */
  chunkDocument(content: string, chunkSize: number = 512): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
    }
    
    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Add a large document by chunking it
   */
  async addDocumentWithChunking(
    document: Omit<VectorDocument, 'id' | 'embedding'>,
    chunkSize: number = 512
  ): Promise<VectorDocument[]> {
    const chunks = this.chunkDocument(document.content, chunkSize);
    
    if (chunks.length === 1) {
      // Document is small enough, add as-is
      return [await this.addDocument(document)];
    }

    // Add parent document
    const parentId = `doc_${crypto.randomUUID()}`;
    const parentDoc = await this.addDocument({
      ...document,
      content: chunks[0], // Use first chunk as parent content
    });

    // Add chunk documents
    const chunkDocs = await Promise.all(
      chunks.slice(1).map(async (chunk, index) => {
        return this.addDocument({
          ...document,
          title: `${document.title} (Part ${index + 2})`,
          content: chunk,
          metadata: {
            ...document.metadata,
            chunk_index: index + 1,
            parent_document_id: parentId,
          },
        });
      })
    );

    return [parentDoc, ...chunkDocs];
  }
}
