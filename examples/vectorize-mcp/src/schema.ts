import { z } from 'zod';

/**
 * Vector Document Schema - Core data structure for documents with embeddings
 */
export const VectorDocumentSchema = z.object({
  id: z.string().describe('Unique document identifier'),
  title: z.string().min(1).describe('Document title'),
  content: z.string().min(1).describe('Full document content'),
  embedding: z.array(z.number()).optional().describe('Vector embedding (auto-generated)'),
  metadata: z.object({
    category: z.string().optional().describe('Document category (e.g., "research", "article")'),
    source: z.string().optional().describe('Source of the document (e.g., "arxiv.org", "internal")'),
    author: z.string().optional().describe('Document author'),
    tags: z.array(z.string()).optional().describe('Document tags for categorization'),
    created_at: z.string().describe('ISO timestamp when document was created'),
    updated_at: z.string().describe('ISO timestamp when document was last updated'),
    chunk_index: z.number().optional().describe('Chunk index if document is split'),
    parent_document_id: z.string().optional().describe('Parent document ID for chunks'),
  }),
  similarity_score: z.number().optional().describe('Similarity score (for search results)'),
});

export type VectorDocument = z.infer<typeof VectorDocumentSchema>;

/**
 * Search Query Schema - For semantic search operations
 */
export const SearchQuerySchema = z.object({
  query: z.string().min(1).describe('Search query text'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum number of results (1-20, default: 5)'),
  threshold: z.number().min(0).max(1).default(0.6).describe('Similarity threshold (0-1, default: 0.6)'),
  category: z.string().optional().describe('Filter by document category'),
  author: z.string().optional().describe('Filter by document author'),
  tags: z.array(z.string()).optional().describe('Filter by document tags'),
  include_content: z.boolean().default(true).describe('Include full document content in results'),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Add Document Schema - For adding new documents
 */
export const AddDocumentSchema = z.object({
  title: z.string().min(1).describe('Document title (required)'),
  content: z.string().min(1).describe('Full document content (required)'),
  category: z.string().optional().describe('Document category (e.g., "research", "article", "tutorial")'),
  source: z.string().optional().describe('Source of the document (e.g., "arxiv.org", "internal", "web")'),
  tags: z.array(z.string()).optional().describe('Tags for categorization (e.g., ["ai", "machine-learning"])'),
  author: z.string().optional().describe('Document author name'),
});

export type AddDocument = z.infer<typeof AddDocumentSchema>;

/**
 * Update Document Schema - For updating existing documents
 */
export const UpdateDocumentSchema = z.object({
  id: z.string().describe('Document ID to update (required)'),
  title: z.string().optional().describe('New document title'),
  content: z.string().optional().describe('New document content'),
  category: z.string().optional().describe('New document category'),
  source: z.string().optional().describe('New document source'),
  tags: z.array(z.string()).optional().describe('New document tags'),
  author: z.string().optional().describe('New document author'),
  regenerate_embedding: z.boolean().default(true).describe('Regenerate embedding if content changed'),
});

export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;

/**
 * Batch Add Documents Schema - For bulk document import
 */
export const BatchAddDocumentsSchema = z.object({
  documents: z.array(AddDocumentSchema).min(1).max(50).describe('Array of documents to add (1-50 documents)'),
  batch_size: z.number().min(1).max(10).default(5).describe('Process in batches of this size (1-10, default: 5)'),
});

export type BatchAddDocuments = z.infer<typeof BatchAddDocumentsSchema>;

/**
 * Document Filter Schema - For listing and filtering documents
 */
export const DocumentFilterSchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  author: z.string().optional().describe('Filter by author'),
  source: z.string().optional().describe('Filter by source'),
  tags: z.array(z.string()).optional().describe('Filter by tags (documents must have all tags)'),
  limit: z.number().min(1).max(50).default(10).describe('Maximum results (1-50, default: 10)'),
  offset: z.number().min(0).default(0).describe('Pagination offset (default: 0)'),
  sort_by: z.enum(['created_at', 'updated_at', 'title']).default('created_at').describe('Sort field'),
  sort_order: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
});

export type DocumentFilter = z.infer<typeof DocumentFilterSchema>;

/**
 * Find Related Schema - For finding documents similar to a specific document
 */
export const FindRelatedSchema = z.object({
  document_id: z.string().describe('Document ID to find related documents for'),
  limit: z.number().min(1).max(20).default(5).describe('Maximum results (1-20, default: 5)'),
  threshold: z.number().min(0).max(1).default(0.6).describe('Similarity threshold (0-1, default: 0.6)'),
  exclude_same_author: z.boolean().default(false).describe('Exclude documents by same author'),
  exclude_same_category: z.boolean().default(false).describe('Exclude documents in same category'),
});

export type FindRelated = z.infer<typeof FindRelatedSchema>;

/**
 * Index Stats Schema - For getting index statistics
 */
export const IndexStatsSchema = z.object({
  include_categories: z.boolean().default(true).describe('Include category breakdown'),
  include_recent: z.boolean().default(true).describe('Include recent activity stats'),
});

export type IndexStats = z.infer<typeof IndexStatsSchema>;

/**
 * Document ID Schema - For operations requiring just an ID
 */
export const DocumentIdSchema = z.object({
  id: z.string().describe('Document ID'),
  include_embedding: z.boolean().default(false).describe('Include vector embedding in response'),
});

export type DocumentId = z.infer<typeof DocumentIdSchema>;

/**
 * Delete Document Schema - For document deletion with confirmation
 */
export const DeleteDocumentSchema = z.object({
  id: z.string().describe('Document ID to delete'),
  confirm: z.boolean().default(false).describe('Confirmation flag (must be true to delete)'),
});

export type DeleteDocument = z.infer<typeof DeleteDocumentSchema>;

/**
 * Embedding Configuration
 */
export const EMBEDDING_CONFIG = {
  MODEL: '@cf/baai/bge-base-en-v1.5', // Workers AI embedding model
  DIMENSIONS: 768, // BGE model dimensions
  MAX_TOKENS: 512, // BGE model max tokens
  BATCH_SIZE: 100,
} as const;

/**
 * Search Configuration
 */
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 5,
  MAX_LIMIT: 20,
  DEFAULT_THRESHOLD: 0.6, // 60% similarity - better for semantic discovery
  MIN_THRESHOLD: 0.0,
  MAX_THRESHOLD: 1.0,
} as const;

/**
 * Document Categories - Predefined categories for consistency
 */
export const DOCUMENT_CATEGORIES = [
  'research',
  'article',
  'tutorial',
  'documentation',
  'reference',
  'news',
  'blog',
  'paper',
  'guide',
  'manual',
  'other',
] as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];
