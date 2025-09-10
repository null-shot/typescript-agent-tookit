import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerPrompts(server: McpServer) {

  /**
   * Prompt: Semantic Search Workflow
   * Guides AI through semantic search operations
   */
  server.prompt(
    'semantic_search',
    'Guide the AI through semantic search operations in the vector database',
    {
      search_query: z.string().describe('The search query or topic to find similar documents for'),
      search_context: z.string().optional().describe('Additional context about what kind of documents to prioritize'),
      result_format: z.string().optional().describe('How to format the search results (summary, detailed, list)'),
    },
    (args) => {
      const searchQuery = args.search_query || 'machine learning';
      const searchContext = args.search_context || 'academic and technical content';
      const resultFormat = args.result_format || 'detailed';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping with semantic search in a vector database. Here's what you need to do:

## Search Task
**Query:** "${searchQuery}"
**Context:** ${searchContext}
**Format:** ${resultFormat}

## Available Tools
Use these MCP tools in sequence:

1. **search_similar** - Find documents matching the query
   - Use query: "${searchQuery}"
   - Set appropriate limit (3-10 depending on need)
   - Use threshold: 0.7 for good matches, 0.5 for broader search
   - Consider category filters if context suggests specific domain

2. **get_document** - Get full details for promising results
   - Use IDs from search results
   - Include content if detailed analysis needed

3. **find_related** - Discover additional relevant documents
   - Use IDs of best matches to find more related content

## Search Strategy
- Start with a broad search (threshold 0.6-0.7)
- If too many results, increase threshold or add category filter
- If too few results, decrease threshold or broaden query terms
- Look for patterns in authors, tags, categories for better filtering

## Result Formatting
- **summary**: Brief overview with key findings
- **detailed**: Full document excerpts and analysis
- **list**: Simple list with titles and similarity scores

Begin by using the search_similar tool with the provided query.`
            }
          }
        ]
      };
    }
  );

  /**
   * Prompt: Knowledge Extraction Workflow
   * Helps extract and store knowledge from text
   */
  server.prompt(
    'knowledge_extraction',
    'Guide the AI through extracting and storing knowledge from text content',
    {
      source_text: z.string().describe('The text content to extract knowledge from'),
      document_title: z.string().optional().describe('Title for the document being processed'),
      extraction_focus: z.string().optional().describe('What aspects to focus on (concepts, facts, procedures, etc.)'),
    },
    (args) => {
      const sourceText = args.source_text || '[No text provided]';
      const documentTitle = args.document_title || 'Extracted Knowledge';
      const extractionFocus = args.extraction_focus || 'key concepts and important information';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping extract and store knowledge from text content. Here's your task:

## Extraction Task
**Document Title:** "${documentTitle}"
**Focus:** ${extractionFocus}
**Source Text Length:** ${sourceText.length} characters

## Source Text
\`\`\`
${sourceText.substring(0, 2000)}${sourceText.length > 2000 ? '\n... [truncated]' : ''}
\`\`\`

## Your Workflow

1. **Analyze the Content**
   - Identify key concepts, facts, and information
   - Determine appropriate category (research, tutorial, reference, etc.)
   - Extract relevant tags and metadata
   - Consider if content should be chunked for large documents

2. **Prepare for Storage**
   - Create a clear, descriptive title
   - Organize content for optimal searchability
   - Add relevant tags and categorization
   - Include source attribution if applicable

3. **Store the Knowledge**
   Use the **add_document** tool with:
   - title: Clear, descriptive title
   - content: The processed text (or chunks if large)
   - category: Appropriate category based on content type
   - tags: Relevant keywords for discovery
   - author: Original author if known
   - source: Where this content came from

4. **Verify Storage**
   - Use **search_similar** to test if the content is findable
   - Check that key concepts return this document in results

## Example Tool Usage
\`\`\`json
{
  "title": "${documentTitle}",
  "content": "[processed content here]",
  "category": "research",
  "tags": ["ai", "machine-learning", "concepts"],
  "source": "extracted-content"
}
\`\`\`

Start by analyzing the content and then use the add_document tool to store it.`
            }
          }
        ]
      };
    }
  );

  /**
   * Prompt: Document Analysis Workflow
   * Analyzes document content and relationships
   */
  server.prompt(
    'document_analysis',
    'Guide the AI through analyzing documents and their relationships',
    {
      document_id: z.string().describe('ID of the document to analyze'),
      analysis_type: z.string().optional().describe('Type of analysis (content, relationships, similarity, metadata)'),
    },
    (args) => {
      const documentId = args.document_id || '';
      const analysisType = args.analysis_type || 'comprehensive';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are analyzing a document and its relationships in the vector database.

## Analysis Task
**Document ID:** ${documentId}
**Analysis Type:** ${analysisType}

## Your Workflow

1. **Get Document Details**
   Use **get_document** tool:
   \`\`\`json
   {
     "id": "${documentId}",
     "include_embedding": false
   }
   \`\`\`

2. **Find Related Documents**
   Use **find_related** tool:
   \`\`\`json
   {
     "document_id": "${documentId}",
     "limit": 5,
     "threshold": 0.7
   }
   \`\`\`

3. **Analyze Patterns**
   Look for:
   - Common themes and topics
   - Author connections
   - Category relationships
   - Tag patterns
   - Content similarities

4. **Search for Broader Context**
   Use **search_similar** with key terms from the document to find:
   - Documents on similar topics
   - Different perspectives on the same subject
   - Related research or articles

## Analysis Types

**content**: Focus on document content, themes, and key concepts
**relationships**: Focus on connections to other documents
**similarity**: Focus on semantic similarity and clustering
**metadata**: Focus on categorization, tags, and organizational aspects
**comprehensive**: All of the above

Start by getting the document details with the get_document tool.`
            }
          }
        ]
      };
    }
  );

  /**
   * Prompt: RAG Query Workflow
   * Retrieval-augmented generation workflow
   */
  server.prompt(
    'rag_query',
    'Guide the AI through retrieval-augmented generation using the vector database',
    {
      user_question: z.string().describe('The question that needs to be answered using retrieved documents'),
      domain_filter: z.string().optional().describe('Specific domain or category to focus the search on'),
      answer_style: z.string().optional().describe('Style of answer needed (concise, detailed, academic, practical)'),
    },
    (args) => {
      const userQuestion = args.user_question || 'How does machine learning work?';
      const domainFilter = args.domain_filter || 'any relevant domain';
      const answerStyle = args.answer_style || 'detailed and informative';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are answering a question using retrieval-augmented generation (RAG) with the vector database.

## RAG Task
**User Question:** "${userQuestion}"
**Domain Filter:** ${domainFilter}
**Answer Style:** ${answerStyle}

## Your RAG Workflow

1. **Retrieve Relevant Documents**
   Use **search_similar** to find documents that can help answer the question:
   \`\`\`json
   {
     "query": "${userQuestion}",
     "limit": 5,
     "threshold": 0.6,
     ${domainFilter !== 'any relevant domain' ? `"category": "${domainFilter}",` : ''}
     "include_content": true
   }
   \`\`\`

2. **Expand Search if Needed**
   - If initial results are limited, try related search terms
   - Use **find_related** on promising documents to discover more context
   - Search for different aspects of the question

3. **Analyze Retrieved Content**
   - Review the retrieved documents for relevant information
   - Identify key facts, concepts, and explanations
   - Note any contradictions or different perspectives
   - Consider the credibility and recency of sources

4. **Generate Augmented Response**
   Create a comprehensive answer that:
   - Directly addresses the user's question
   - Incorporates information from retrieved documents
   - Cites specific documents when referencing facts
   - Acknowledges limitations if information is incomplete
   - Suggests related topics for further exploration

## Answer Style Guidelines

**concise**: Brief, direct answers with key points only
**detailed**: Comprehensive explanations with examples and context
**academic**: Formal tone with citations and technical accuracy
**practical**: Focus on actionable information and real-world applications

## Example Citation Format
"According to the document 'Introduction to Neural Networks' (ID: doc_abc123), neural networks are..."

Start by searching for documents relevant to the question.`
            }
          }
        ]
      };
    }
  );

  /**
   * Prompt: Knowledge Base Building
   * Helps build and organize a knowledge base
   */
  server.prompt(
    'knowledge_base_building',
    'Guide the AI through building and organizing a knowledge base',
    {
      domain: z.string().describe('The domain or subject area for the knowledge base'),
      content_sources: z.string().optional().describe('Types of content sources to include (papers, articles, docs, etc.)'),
      organization_strategy: z.string().optional().describe('How to organize the knowledge (by topic, by source, chronologically, etc.)'),
    },
    (args) => {
      const domain = args.domain || 'artificial intelligence';
      const contentSources = args.content_sources || 'research papers, articles, and tutorials';
      const organizationStrategy = args.organization_strategy || 'by topic and relevance';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are building a knowledge base in the vector database for the domain: "${domain}".

## Knowledge Base Building Task
**Domain:** ${domain}
**Content Sources:** ${contentSources}
**Organization Strategy:** ${organizationStrategy}

## Your Building Workflow

1. **Assess Current State**
   Use **get_index_stats** to understand what's already in the database:
   \`\`\`json
   {
     "include_categories": true,
     "include_recent": true
   }
   \`\`\`

2. **Review Existing Content**
   Use **list_documents** to see what's already available:
   \`\`\`json
   {
     "category": "[relevant category]",
     "limit": 20,
     "sort_by": "updated_at"
   }
   \`\`\`

3. **Identify Gaps**
   - What topics are missing?
   - What sources are underrepresented?
   - Where are the knowledge gaps?

4. **Content Addition Strategy**
   When adding new content:
   - Use consistent categorization
   - Apply relevant tags for discoverability
   - Include proper attribution and sources
   - Consider content chunking for large documents

5. **Organization and Validation**
   - Use **search_similar** to test discoverability
   - Use **find_related** to verify document relationships
   - Ensure good coverage across the domain

## Recommended Categories for ${domain}
- fundamentals
- advanced-concepts
- tutorials
- research
- applications
- tools-and-frameworks
- best-practices

## Recommended Tags
Create tags that help with:
- Technical level (beginner, intermediate, advanced)
- Content type (tutorial, reference, example)
- Specific technologies or methods
- Use cases and applications

Start by assessing the current state of the knowledge base.`
            }
          }
        ]
      };
    }
  );
}
