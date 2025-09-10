import { describe, it, expect } from "vitest";
import { 
  VectorDocumentSchema, 
  AddDocumentSchema, 
  SearchQuerySchema,
  EMBEDDING_CONFIG,
  SEARCH_CONFIG 
} from "../src/schema";

describe("Vectorize MCP Schema Validation Tests", () => {
  
  it("should validate VectorDocument schema", () => {
    const testDocument = {
      id: 'doc_test123',
      title: 'Test Document',
      content: 'This is test content for vector embedding.',
      metadata: {
        category: 'test',
        source: 'unit-test',
        author: 'Test Author',
        tags: ['test', 'validation'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };
    
    const result = VectorDocumentSchema.safeParse(testDocument);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.title).toBe('Test Document');
      expect(result.data.content).toBe('This is test content for vector embedding.');
      expect(result.data.metadata.category).toBe('test');
      expect(result.data.metadata.tags).toEqual(['test', 'validation']);
    }
  });

  it("should validate AddDocument schema", () => {
    const addDocumentData = {
      title: "New Document",
      content: "Content for the new document about machine learning and AI.",
      category: "tutorial",
      tags: ["ai", "tutorial"],
      author: "AI Expert"
    };
    
    const result = AddDocumentSchema.safeParse(addDocumentData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.title).toBe("New Document");
      expect(result.data.category).toBe("tutorial");
      expect(result.data.tags).toEqual(["ai", "tutorial"]);
    }
  });

  it("should validate SearchQuery schema", () => {
    const searchQuery = {
      query: "machine learning algorithms",
      limit: 5,
      threshold: 0.8,
      category: "research",
      include_content: true
    };
    
    const result = SearchQuerySchema.safeParse(searchQuery);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.query).toBe("machine learning algorithms");
      expect(result.data.limit).toBe(5);
      expect(result.data.threshold).toBe(0.8);
    }
  });

  it("should reject invalid schemas", () => {
    // Test invalid AddDocument (missing required fields)
    const invalidDoc = {
      title: "", // Empty title should fail
      content: "Some content"
    };
    
    const result = AddDocumentSchema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
  });

  it("should validate embedding configuration", () => {
    expect(EMBEDDING_CONFIG.MODEL).toBe('@cf/baai/bge-base-en-v1.5');
    expect(EMBEDDING_CONFIG.DIMENSIONS).toBe(768);
    expect(EMBEDDING_CONFIG.MAX_TOKENS).toBe(512);
    expect(EMBEDDING_CONFIG.BATCH_SIZE).toBe(100);
  });

  it("should validate search configuration", () => {
    expect(SEARCH_CONFIG.DEFAULT_LIMIT).toBe(5);
    expect(SEARCH_CONFIG.MAX_LIMIT).toBe(20);
    expect(SEARCH_CONFIG.DEFAULT_THRESHOLD).toBe(0.7);
    expect(SEARCH_CONFIG.MIN_THRESHOLD).toBe(0.0);
    expect(SEARCH_CONFIG.MAX_THRESHOLD).toBe(1.0);
  });
});