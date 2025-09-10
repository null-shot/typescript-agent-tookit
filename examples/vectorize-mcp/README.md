# Vectorize MCP Server

A Model Context Protocol (MCP) server for **Cloudflare Vectorize** that enables AI assistants to perform semantic search, document management, and vector operations.

## 🚀 Quick Start

### 1. Setup

```bash
# Install dependencies
pnpm install

# Set your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-your-key-here" > .dev.vars

# Create Vectorize index (using Workers AI embedding dimensions)
npx wrangler vectorize create semantic-search --dimensions=768 --metric=cosine

# Start development server
pnpm dev
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
- `threshold`: Similarity threshold (0-1, default: 0.7)
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
  "threshold": 0.75,
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
- `threshold`: Similarity threshold (0-1, default: 0.7)
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

## 📚 MCP Resources

Access these resources directly from MCP clients:

### `vectorize://documents`
List of all documents with metadata

### `vectorize://categories`
Available categories and their document counts

### `vectorize://index-stats`
Current index statistics and health

### `vectorize://similar/{document_id}`
Similar documents for a specific document ID

**Example**: `vectorize://similar/doc_abc123`

## 🎭 MCP Prompts

Use these prompts to guide AI workflows:

### `semantic_search`
**Parameters**:
- `search_query`: What to search for
- `search_context`: Additional context
- `result_format`: How to format results

**Example**:
```json
{
  "search_query": "neural network architectures",
  "search_context": "focus on deep learning and modern architectures",
  "result_format": "detailed"
}
```

### `knowledge_extraction`
**Parameters**:
- `source_text`: Text to extract knowledge from
- `document_title`: Title for the document
- `extraction_focus`: What to focus on

### `document_analysis`
**Parameters**:
- `document_id`: Document to analyze
- `analysis_type`: Type of analysis

### `rag_query`
**Parameters**:
- `user_question`: Question to answer
- `domain_filter`: Domain to focus on
- `answer_style`: Style of answer

## 📝 Common Workflows

### Building a Knowledge Base

1. **Add Documents**:
```json
{
  "title": "Getting Started Guide",
  "content": "This guide covers the basics...",
  "category": "tutorial",
  "tags": ["getting-started", "basics"]
}
```

2. **Search for Information**:
```json
{
  "query": "getting started tutorial",
  "category": "tutorial"
}
```

3. **Find Related Content**:
```json
{
  "document_id": "doc_abc123",
  "limit": 3
}
```

### Content Discovery

1. **Browse by Category**:
```json
{
  "category": "research",
  "limit": 10,
  "sort_by": "created_at"
}
```

2. **Search by Topic**:
```json
{
  "query": "machine learning optimization",
  "threshold": 0.7
}
```

### RAG (Retrieval-Augmented Generation)

1. **Search for Context**:
```json
{
  "query": "How to optimize neural networks?",
  "limit": 5,
  "include_content": true
}
```

2. **Get Full Documents**:
```json
{
  "id": "doc_result_id",
  "include_embedding": false
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
- Check OpenAI API key is set correctly
- Verify internet connectivity
- Check if content is too long (max ~8K tokens)

**"Vectorize connection failed"**
- Verify Vectorize index exists: `wrangler vectorize list`
- Check wrangler.jsonc binding configuration
- Ensure index name matches configuration

### Error Examples

**Invalid similarity threshold**:
```json
{
  "error": "Threshold must be between 0 and 1",
  "received": 1.5,
  "suggestion": "Use values like 0.7 for good matches, 0.5 for broader search"
}
```

**Missing required field**:
```json
{
  "error": "Missing required field: title",
  "suggestion": "Provide a title for the document"
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-your-anthropic-api-key

# Optional (with defaults)
EMBEDDING_MODEL=@cf/baai/bge-base-en-v1.5
MAX_BATCH_SIZE=10
DEFAULT_SEARCH_LIMIT=5
```

### Vectorize Index Setup

```bash
# Create the index (768 dimensions for Workers AI BGE model)
npx wrangler vectorize create semantic-search --dimensions=768 --metric=cosine

# Verify index
npx wrangler vectorize list
```

## 📊 Performance Tips

### Embedding Generation
- **Batch operations**: Use `batch_add_documents` for multiple documents
- **Content length**: Keep individual documents under 8K tokens
- **Chunking**: Large documents are automatically chunked

### Search Optimization
- **Threshold tuning**: 
  - 0.8+ for very similar content
  - 0.7 for good matches (default)
  - 0.6 for broader search
  - 0.5 for discovery mode
- **Limit management**: Start with 5-10 results, increase as needed
- **Category filtering**: Use categories to narrow search scope

### Index Management
- **Regular cleanup**: Remove outdated documents
- **Monitor stats**: Use `get_index_stats` to track growth
- **Batch operations**: More efficient than individual operations

## 🎯 Use Cases

### Knowledge Base Management
```json
// Add documentation
{
  "title": "API Documentation - Authentication",
  "content": "Our API uses JWT tokens for authentication...",
  "category": "documentation",
  "tags": ["api", "auth", "security"]
}

// Search for auth info
{
  "query": "how to authenticate API requests",
  "category": "documentation"
}
```

### Research Paper Organization
```json
// Add research paper
{
  "title": "Attention Is All You Need",
  "content": "The dominant sequence transduction models...",
  "category": "research",
  "tags": ["transformers", "attention", "nlp"],
  "author": "Vaswani et al.",
  "source": "arxiv"
}

// Find related papers
{
  "document_id": "doc_attention_paper",
  "exclude_same_author": false,
  "threshold": 0.75
}
```

### Content Discovery
```json
// Browse by topic
{
  "query": "deep learning optimization techniques",
  "limit": 8,
  "threshold": 0.6
}

// Explore categories
{
  "category": "tutorial",
  "tags": ["beginner"],
  "limit": 10
}
```

## 🧪 Testing Examples

### Test Document Addition
```bash
curl -X POST http://localhost:8787/sse/message \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "add_document",
      "arguments": {
        "title": "Test Document",
        "content": "This is a test document for the vector database.",
        "category": "test",
        "tags": ["test", "example"]
      }
    }
  }'
```

### Test Semantic Search
```bash
curl -X POST http://localhost:8787/sse/message \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "search_similar",
      "arguments": {
        "query": "test document",
        "limit": 3
      }
    }
  }'
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:8787/health
```

**Healthy Response**:
```json
{
  "status": "healthy",
  "vectorize": true,
  "openai": true,
  "timestamp": "2025-01-XX:XX:XX.XXXZ"
}
```

### Index Statistics
Use the `get_index_stats` tool to monitor:
- Total document count
- Category distribution
- Recent activity
- Index health

## 🔗 Integration Examples

### With Claude Desktop

Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "vectorize": {
      "command": "node",
      "args": ["path/to/vectorize-mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### With Cursor/VS Code

Use the MCP extension and configure the server endpoint:
```
http://localhost:8787/sse
```

## 🚀 Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy the worker
pnpm deploy

# Set environment variables
npx wrangler secret put OPENAI_API_KEY

# Verify deployment
curl https://your-worker.your-subdomain.workers.dev/health
```

### Production Considerations

1. **API Key Security**: Use Wrangler secrets, never commit keys
2. **Rate Limiting**: Monitor OpenAI API usage
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

**Built with ❤️ using Cloudflare Workers, Vectorize, and the Model Context Protocol**
