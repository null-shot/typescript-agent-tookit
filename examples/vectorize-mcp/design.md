# Vectorize MCP Server - Design Document

## 📋 Project Overview

**Project**: `examples/vectorize-mcp`  
**Purpose**: Create an MCP (Model Context Protocol) server that enables AI assistants to interact with Cloudflare Vectorize for semantic search and vector operations.  
**Branch**: `feat/vectorize-mcp`

## 🎯 Core Concept

Enable AI assistants to:
- **Store and retrieve vector embeddings** for semantic search
- **Manage vector document collections** with metadata
- **Perform similarity searches** across document embeddings
- **Build knowledge bases** with vector-powered RAG capabilities

## 🏗️ Architecture Design

### **MCP Architecture Pattern** (Following existing examples)
1. **Main Entry Point** (`index.ts`) - Worker entrypoint with SSE handling
2. **Server Class** (`server.ts`) - Extends `McpHonoServerDO` with `configureServer()`
3. **Tools** (`tools.ts`) - MCP tool definitions with Zod schemas
4. **Repository** (`repository.ts`) - Data access layer with Vectorize operations
5. **Resources** (`resources.ts`) - MCP resource definitions for data exposure
6. **Prompts** (`prompts.ts`) - MCP prompt templates for AI workflows
7. **Schema** (`schema.ts`) - TypeScript/Zod schemas for data validation

### **Data Schema Design**

```typescript
// Vector Document Schema
interface VectorDocument {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata: {
    category?: string;
    source?: string;
    author?: string;
    tags?: string[];
    created_at: string;
    updated_at: string;
    chunk_index?: number;
    parent_document_id?: string;
  };
  similarity_score?: number; // For search results
}

// Search Query Schema
interface SearchQuery {
  query: string;
  top_k?: number;
  threshold?: number;
  filter?: {
    category?: string;
    source?: string;
    tags?: string[];
  };
}
```

## 🛠️ MCP Tools Design (User-Friendly)

### **1. `add_document` - Add Document with Embedding**
**Purpose**: Store a document and automatically generate its vector embedding

**Schema**:
```typescript
{
  title: string,           // "My Research Paper"
  content: string,         // "Full text content here..."
  category?: string,       // "research" | "article" | "documentation"
  source?: string,         // "arxiv.org" | "internal" | "web"
  tags?: string[],         // ["ai", "machine-learning", "nlp"]
  author?: string          // "John Doe"
}
```

**Example Input**:
```json
{
  "title": "Introduction to Vector Databases",
  "content": "Vector databases are specialized databases designed to store and query high-dimensional vectors...",
  "category": "article",
  "source": "tech-blog",
  "tags": ["database", "vectors", "ai"],
  "author": "Jane Smith"
}
```

### **2. `search_similar` - Semantic Search**
**Purpose**: Find documents similar to a text query

**Schema**:
```typescript
{
  query: string,           // "machine learning algorithms"
  limit?: number,          // 5 (default: 5, max: 20)
  threshold?: number,      // 0.7 (similarity threshold 0-1)
  category?: string,       // Filter by category
  include_content?: boolean // true (include full content in results)
}
```

**Example Input**:
```json
{
  "query": "How do neural networks work?",
  "limit": 3,
  "threshold": 0.75,
  "category": "research",
  "include_content": true
}
```

### **3. `get_document` - Retrieve Document**
**Purpose**: Get a specific document by ID

**Schema**:
```typescript
{
  id: string,              // "doc_123abc"
  include_embedding?: boolean // false (include vector data)
}
```

**Example Input**:
```json
{
  "id": "doc_abc123",
  "include_embedding": false
}
```

### **4. `update_document` - Update Document**
**Purpose**: Update document content and regenerate embedding

**Schema**:
```typescript
{
  id: string,              // "doc_123abc"
  title?: string,          // "Updated Title"
  content?: string,        // "New content..."
  category?: string,       // "updated-category"
  tags?: string[],         // ["new", "tags"]
  regenerate_embedding?: boolean // true (auto-regenerate if content changed)
}
```

**Example Input**:
```json
{
  "id": "doc_abc123",
  "title": "Updated: Introduction to Vector Databases",
  "content": "Vector databases are powerful tools for AI applications...",
  "tags": ["database", "vectors", "ai", "updated"],
  "regenerate_embedding": true
}
```

### **5. `delete_document` - Remove Document**
**Purpose**: Delete a document and its embedding

**Schema**:
```typescript
{
  id: string,              // "doc_123abc"
  confirm?: boolean        // true (safety confirmation)
}
```

**Example Input**:
```json
{
  "id": "doc_abc123",
  "confirm": true
}
```

### **6. `list_documents` - Browse Documents**
**Purpose**: List documents with filtering and pagination

**Schema**:
```typescript
{
  category?: string,       // "research"
  author?: string,         // "Jane Smith"
  tags?: string[],         // ["ai", "database"]
  limit?: number,          // 10 (default: 10, max: 50)
  offset?: number,         // 0 (for pagination)
  sort_by?: string,        // "created_at" | "updated_at" | "title"
  sort_order?: string      // "desc" | "asc"
}
```

**Example Input**:
```json
{
  "category": "research",
  "tags": ["ai"],
  "limit": 5,
  "sort_by": "created_at",
  "sort_order": "desc"
}
```

### **7. `find_related` - Find Related Documents**
**Purpose**: Find documents similar to a specific document

**Schema**:
```typescript
{
  document_id: string,     // "doc_123abc"
  limit?: number,          // 5 (default: 5)
  threshold?: number,      // 0.7 (similarity threshold)
  exclude_same_author?: boolean, // false (exclude docs by same author)
  exclude_same_category?: boolean // false (exclude same category)
}
```

**Example Input**:
```json
{
  "document_id": "doc_abc123",
  "limit": 3,
  "threshold": 0.8,
  "exclude_same_author": false
}
```

### **8. `batch_add_documents` - Bulk Document Import**
**Purpose**: Efficiently add multiple documents at once

**Schema**:
```typescript
{
  documents: Array<{
    title: string,
    content: string,
    category?: string,
    source?: string,
    tags?: string[],
    author?: string
  }>,
  batch_size?: number      // 10 (process in batches)
}
```

**Example Input**:
```json
{
  "documents": [
    {
      "title": "AI Ethics Guide",
      "content": "Ethical considerations in AI development...",
      "category": "ethics",
      "tags": ["ai", "ethics"]
    },
    {
      "title": "Machine Learning Basics",
      "content": "Introduction to ML concepts...",
      "category": "tutorial",
      "tags": ["ml", "tutorial"]
    }
  ],
  "batch_size": 5
}
```

### **9. `get_index_stats` - Index Information**
**Purpose**: Get statistics about the vector index

**Schema**:
```typescript
{
  include_categories?: boolean, // true (show category breakdown)
  include_recent?: boolean      // true (show recent activity)
}
```

**Example Input**:
```json
{
  "include_categories": true,
  "include_recent": true
}
```

## 📚 MCP Resources to Expose

1. **`vectorize://documents`** - List of all stored documents
2. **`vectorize://categories`** - Available document categories
3. **`vectorize://index-stats`** - Current index statistics
4. **`vectorize://similar/{id}`** - Similar documents for a given ID

## 🎭 MCP Prompts for AI Workflows

1. **`semantic_search`** - Guide AI through semantic search workflows
2. **`knowledge_extraction`** - Help extract and store knowledge from text
3. **`document_analysis`** - Analyze document content and relationships
4. **`rag_query`** - Retrieval-augmented generation workflow

## ⚙️ Wrangler Configuration

```jsonc
{
  "name": "vectorize-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      {
        "name": "VECTORIZE_MCP_SERVER",
        "class_name": "VectorizeMcpServer"
      }
    ]
  },
  "vectorize": [
    {
      "binding": "VECTORIZE_INDEX",
      "index_name": "semantic-search"
    }
  ],
  "vars": {
    "OPENAI_API_KEY": ""
  },
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

## 🔧 Technical Implementation Details

### **Embedding Integration**
- Use OpenAI `text-embedding-ada-002` (1536 dimensions)
- Automatic embedding generation from text content
- Embedding validation and normalization
- Batch embedding generation for efficiency

### **Vectorize Operations**
- `VECTORIZE.query()` for similarity search
- `VECTORIZE.upsert()` for storing vectors
- `VECTORIZE.deleteById()` for removal
- `VECTORIZE.getByIds()` for retrieval
- Proper error handling and retries

### **Data Storage Strategy**
- Use Durable Object state for metadata caching
- Store full document content in metadata (within 1KB limit)
- Implement document chunking for large texts
- Efficient batch operations

## 🎯 Example Use Cases

1. **Knowledge Base Building**: Add research papers, articles, documentation
2. **Content Discovery**: Find related articles based on semantic similarity
3. **RAG Applications**: Retrieve relevant context for AI responses
4. **Document Clustering**: Group similar documents by content
5. **Duplicate Detection**: Find near-duplicate content across documents

## 📖 Documentation Strategy

### **README Structure**:
1. **🚀 Quick Start** - Immediate examples to get started
2. **🛠️ Tool Reference** - Detailed docs for each tool
3. **📝 Common Workflows** - Real-world usage scenarios
4. **⚠️ Troubleshooting** - Error handling and solutions
5. **🎯 Best Practices** - Performance and usage tips

### **User Experience Focus**:
- Clear field descriptions with examples
- Sensible defaults for optional parameters
- Copy-paste ready JSON examples
- Progressive complexity (simple → advanced)
- Comprehensive error messages

## 🚀 Development Roadmap

### **Phase 1: Core Infrastructure**
- [ ] Project structure setup
- [ ] Schema definitions (TypeScript + Zod)
- [ ] Repository layer with Vectorize integration
- [ ] Basic MCP server setup

### **Phase 2: Essential Tools**
- [ ] `add_document` tool
- [ ] `search_similar` tool
- [ ] `get_document` tool
- [ ] `list_documents` tool

### **Phase 3: Advanced Features**
- [ ] `update_document` tool
- [ ] `delete_document` tool
- [ ] `find_related` tool
- [ ] `batch_add_documents` tool
- [ ] `get_index_stats` tool

### **Phase 4: Resources & Prompts**
- [ ] MCP resources implementation
- [ ] MCP prompts for workflows
- [ ] Advanced filtering and search

### **Phase 5: Documentation & Testing**
- [ ] Comprehensive README with examples
- [ ] Test suite coverage
- [ ] Performance optimization
- [ ] Error handling refinement

## 🎨 Key Differentiators

- **AI-First**: Built specifically for semantic search and AI workflows
- **User-Friendly**: Clear examples and intuitive tool design
- **Embedding Integration**: Automatic text-to-vector conversion
- **Advanced Search**: Similarity search with filtering and ranking
- **Scalable**: Designed for large document collections
- **RAG-Ready**: Perfect for retrieval-augmented generation use cases

## 📝 Notes & Considerations

### **Vectorize Limitations** (from documentation):
- Maximum 1536 dimensions per vector
- Maximum 5 million vectors per index
- Maximum 1KB metadata per vector
- 1,000 queries per second per index
- Maximum 1,000 vectors per upsert operation

### **Design Decisions**:
- Use OpenAI ada-002 embeddings (1536 dims) for compatibility
- Implement document chunking for large content
- Batch operations for efficiency
- Comprehensive metadata for filtering
- User-friendly tool schemas with examples

### **Future Enhancements**:
- Support for custom embedding models
- Advanced analytics and insights
- Document versioning and history
- Integration with other Cloudflare services
- Multi-language support for embeddings

---

*This design document will evolve during development. Update as needed based on implementation learnings and user feedback.*
