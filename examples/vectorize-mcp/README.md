# Vectorize MCP Server

A Model Context Protocol (MCP) server for **Cloudflare Vectorize** that enables AI assistants to perform semantic search, document management, and vector operations.

## 🚀 Quick Start

### 1. Setup

```bash
# Install dependencies
pnpm install

# Set your Anthropic API key
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your actual Anthropic API key

# Create Vectorize index (using Workers AI embedding dimensions)
npx wrangler vectorize create semantic-search --dimensions=768 --metric=cosine

# Start development server with MCP inspector (recommended)
pnpm dev

# OR run separately:
pnpm start      # Just the worker
pnpm inspector  # Just the inspector
```

### 2. Test the API

```bash
# Check health
curl http://localhost:8787/health

# View API information
curl http://localhost:8787/
```

### 3. Connect with MCP Client

The server provides SSE (Server-Sent Events) endpoints for MCP clients:
- **SSE Endpoint**: `http://localhost:8787/sse`
- **Message Endpoint**: `http://localhost:8787/sse/message`

## 🛠️ MCP Tools Reference

### 1. `add_document` - Add Document with Embedding

**Purpose**: Store a document and automatically generate its vector embedding

**Required Fields**:
- `title`: Document title
- `content`: Full document content

**Optional Fields**:
- `category`: Document category
- `source`: Source of the document
- `tags`: Array of tags
- `author`: Document author

**Example**:
```json
{
  "title": "Introduction to Vector Databases",
  "content": "Vector databases are specialized databases designed to store and query high-dimensional vectors. They enable semantic search, similarity matching, and retrieval-augmented generation (RAG) applications. Unlike traditional databases that store structured data, vector databases excel at finding similar items based on meaning rather than exact matches.",
  "category": "article",
  "source": "tech-blog",
  "tags": ["database", "vectors", "ai", "semantic-search"],
  "author": "Jane Smith"
}
```

**Response**: Document object with generated ID and embedding confirmation.

---

### 2. `search_similar` - Semantic Search

**Purpose**: Find documents similar to a text query

**Required Fields**:
- `query`: Search query text

**Optional Fields**:
- `limit`: Max results (1-20, default: 5)
- `threshold`: Similarity threshold (0-1, default: 0.6)
- `category`: Filter by category
- `author`: Filter by author
- `tags`: Filter by tags
- `include_content`: Include full content (default: true)

**Examples**:

**Basic Search**:
```json
{
  "query": "How do neural networks work?",
  "limit": 3
}
```

**Filtered Search**:
```json
{
  "query": "machine learning algorithms",
  "limit": 5,
  "threshold": 0.65,
  "category": "research",
  "include_content": true
}
```

**Broad Search**:
```json
{
  "query": "artificial intelligence applications",
  "limit": 10,
  "threshold": 0.6
}
```

---

### 3. `get_document` - Retrieve Document

**Purpose**: Get a specific document by ID

**Required Fields**:
- `id`: Document ID

**Optional Fields**:
- `include_embedding`: Include vector data (default: false)

**Examples**:

**Basic Retrieval**:
```json
{
  "id": "doc_abc123"
}
```

**With Embedding Data**:
```json
{
  "id": "doc_abc123",
  "include_embedding": true
}
```

---

### 4. `update_document` - Update Document

**Purpose**: Update document content and regenerate embedding

**Required Fields**:
- `id`: Document ID to update

**Optional Fields**:
- `title`: New title
- `content`: New content
- `category`: New category
- `source`: New source
- `tags`: New tags array
- `author`: New author
- `regenerate_embedding`: Regenerate embedding (default: true)

**Examples**:

**Update Title Only**:
```json
{
  "id": "doc_abc123",
  "title": "Updated: Introduction to Vector Databases",
  "regenerate_embedding": false
}
```

**Update Content**:
```json
{
  "id": "doc_abc123",
  "content": "Vector databases are powerful tools for AI applications that need to find similar items based on semantic meaning...",
  "regenerate_embedding": true
}
```

**Update Metadata**:
```json
{
  "id": "doc_abc123",
  "category": "tutorial",
  "tags": ["database", "vectors", "ai", "updated"],
  "regenerate_embedding": false
}
```

---

### 5. `delete_document` - Remove Document

**Purpose**: Delete a document and its embedding

**Required Fields**:
- `id`: Document ID
- `confirm`: Must be `true` to confirm deletion

**Example**:
```json
{
  "id": "doc_abc123",
  "confirm": true
}
```

---

### 6. `list_documents` - Browse Documents

**Purpose**: List documents with filtering and pagination

**Optional Fields**:
- `category`: Filter by category
- `author`: Filter by author
- `source`: Filter by source
- `tags`: Filter by tags (must have all tags)
- `limit`: Max results (1-50, default: 10)
- `offset`: Pagination offset (default: 0)
- `sort_by`: Sort field ("created_at", "updated_at", "title")
- `sort_order`: Sort direction ("asc", "desc")

**Examples**:

**List Recent Documents**:
```json
{
  "limit": 5,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

**Filter by Category**:
```json
{
  "category": "research",
  "limit": 10
}
```

**Filter by Author and Tags**:
```json
{
  "author": "Jane Smith",
  "tags": ["ai", "database"],
  "limit": 5
}
```

**Pagination**:
```json
{
  "limit": 10,
  "offset": 20,
  "sort_by": "title",
  "sort_order": "asc"
}
```

---

### 7. `find_related` - Find Related Documents

**Purpose**: Find documents similar to a specific document

**Required Fields**:
- `document_id`: Document ID to find related documents for

**Optional Fields**:
- `limit`: Max results (1-20, default: 5)
- `threshold`: Similarity threshold (0-1, default: 0.6)
- `exclude_same_author`: Exclude docs by same author (default: false)
- `exclude_same_category`: Exclude docs in same category (default: false)

**Examples**:

**Basic Related Search**:
```json
{
  "document_id": "doc_abc123",
  "limit": 3
}
```

**High Similarity Only**:
```json
{
  "document_id": "doc_abc123",
  "threshold": 0.85,
  "limit": 5
}
```

**Diverse Results**:
```json
{
  "document_id": "doc_abc123",
  "exclude_same_author": true,
  "exclude_same_category": true,
  "limit": 5
}
```

---

### 8. `batch_add_documents` - Bulk Import

**Purpose**: Efficiently add multiple documents at once

**Required Fields**:
- `documents`: Array of documents to add

**Optional Fields**:
- `batch_size`: Process in batches (1-10, default: 5)

**Example**:
```json
{
  "documents": [
    {
      "title": "AI Ethics in Practice",
      "content": "Ethical considerations when deploying AI systems in production...",
      "category": "ethics",
      "tags": ["ai", "ethics", "deployment"],
      "author": "Dr. Ethics"
    },
    {
      "title": "Machine Learning Pipeline Design",
      "content": "Best practices for designing robust ML pipelines...",
      "category": "tutorial",
      "tags": ["ml", "pipelines", "engineering"],
      "author": "ML Engineer"
    },
    {
      "title": "Vector Search Optimization",
      "content": "Techniques for optimizing vector search performance...",
      "category": "technical",
      "tags": ["vectors", "optimization", "performance"],
      "author": "Tech Lead"
    }
  ],
  "batch_size": 2
}
```

---

### 9. `get_index_stats` - Index Statistics

**Purpose**: Get statistics about the vector index

**Optional Fields**:
- `include_categories`: Include category breakdown (default: true)
- `include_recent`: Include recent activity (default: true)

**Examples**:

**Full Statistics**:
```json
{
  "include_categories": true,
  "include_recent": true
}
```

**Basic Stats Only**:
```json
{
  "include_categories": false,
  "include_recent": false
}
```

## ⚠️ Troubleshooting

### Common Issues

**"No documents found"**
- Check if documents exist: use `list_documents`
- Lower similarity threshold (try 0.5-0.6)
- Broaden search terms
- Remove category filters

**"Document not found"**
- Use `list_documents` to see available IDs
- Check for typos in document ID
- Document may have been deleted

**"Failed to generate embedding"**
- Check Anthropic API key is set correctly
- Verify internet connectivity
- Check if content is too long (max ~8K tokens)

**"Vectorize connection failed"**
- Verify Vectorize index exists: `wrangler vectorize list`
- Check wrangler.jsonc binding configuration
- Ensure index name matches configuration


## 📊 Performance Tips

### Embedding Generation
- **Batch operations**: Use `batch_add_documents` for multiple documents
- **Content length**: Keep individual documents under 8K tokens
- **Chunking**: Large documents are automatically chunked

### Search Optimization
- **Threshold tuning**: 
  - 0.8+ for very similar content
  - 0.6 for good matches (default)
  - 0.5 for discovery mode
- **Limit management**: Start with 5-10 results, increase as needed
- **Category filtering**: Use categories to narrow search scope

### Index Management
- **Regular cleanup**: Remove outdated documents
- **Monitor stats**: Use `get_index_stats` to track growth
- **Batch operations**: More efficient than individual operations

## 🚀 Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy the worker
pnpm deploy

# Set environment variables
npx wrangler secret put ANTHROPIC_API_KEY

# Verify deployment
curl https://your-worker.your-subdomain.workers.dev/health
```

### Production Considerations

1. **API Key Security**: Use Wrangler secrets, never commit keys
2. **Rate Limiting**: Monitor Anthropic API usage
3. **Index Limits**: Vectorize supports up to 5M vectors per index
4. **Metadata Size**: Keep metadata under 1KB per vector
5. **Batch Operations**: Use batch tools for bulk operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---
