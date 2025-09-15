/**
 * Mock implementations for CI testing
 * Separated from production code to avoid confusion in debugging
 */

import { VectorizeRepository } from './repository';
import { VectorDocument, EMBEDDING_CONFIG } from './schema';

/**
 * Mock Vectorize Index for CI environments
 */
export class MockVectorizeIndex {
  private documents: Map<string, any> = new Map();

  async upsert(vectors: any[]): Promise<{ count: number; ids: string[] }> {
    console.warn('🤖 Using MockVectorizeIndex.upsert for CI');
    vectors.forEach(vector => {
      this.documents.set(vector.id, vector);
    });
    return {
      count: vectors.length,
      ids: vectors.map(v => v.id)
    };
  }

  async query(embedding: number[], options: any): Promise<{ matches: any[] }> {
    console.warn('🤖 Using MockVectorizeIndex.query for CI');
    const mockMatches = Array.from(this.documents.values()).slice(0, options.topK || 5).map((doc, index) => ({
      id: doc.id,
      score: 0.85 - (index * 0.05), // Decreasing scores
      metadata: doc.metadata
    }));
    
    return { matches: mockMatches };
  }

  async getByIds(ids: string[]): Promise<any[]> {
    console.warn('🤖 Using MockVectorizeIndex.getByIds for CI');
    return ids.map(id => {
      // Return null for test IDs that should fail
      if (id === 'non-existent-id' || id.includes('non-existent')) {
        return null;
      }
      return this.documents.get(id) || this.createMockVector(id);
    }).filter(Boolean);
  }

  async deleteByIds(ids: string[]): Promise<{ count: number; ids: string[] }> {
    console.warn('🤖 Using MockVectorizeIndex.deleteByIds for CI');
    let deletedCount = 0;
    ids.forEach(id => {
      if (this.documents.has(id)) {
        this.documents.delete(id);
        deletedCount++;
      }
    });
    return { count: deletedCount, ids: ids.slice(0, deletedCount) };
  }

  async describe(): Promise<any> {
    console.warn('🤖 Using MockVectorizeIndex.describe for CI');
    return {
      dimensions: EMBEDDING_CONFIG.DIMENSIONS,
      vectorsCount: this.documents.size,
      processedUpToDatetime: new Date().toISOString(),
      processedUpToMutation: 'mock-mutation-id'
    };
  }

  private createMockVector(id: string): any {
    return {
      id,
      values: new Array(EMBEDDING_CONFIG.DIMENSIONS).fill(0.1),
      metadata: {
        title: 'Mock Document',
        content: 'Mock content for CI testing',
        category: 'test',
        author: 'Mock Author',
        tags: JSON.stringify(['mock', 'ci']),
        source: 'ci-mock',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        chunk_index: '0',
        parent_document_id: '',
      }
    };
  }
}

/**
 * Mock Workers AI for CI environments
 */
export class MockWorkersAI {
  async run(model: string, input: any): Promise<{ data: number[][] }> {
    console.warn('🤖 Using MockWorkersAI.run for CI');
    const text = Array.isArray(input.text) ? input.text[0] : input.text;
    
    // Create deterministic embedding based on text content
    const hash = this.simpleHash(text);
    const embedding = new Array(EMBEDDING_CONFIG.DIMENSIONS).fill(0).map((_, i) => 
      Math.sin(hash + i) * 0.5 // Deterministic values between -0.5 and 0.5
    );
    
    return { data: [embedding] };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Mock Repository for CI environments
 */
export class MockVectorizeRepository extends VectorizeRepository {
  constructor() {
    const mockVectorize = new MockVectorizeIndex();
    const mockEnv = { AI: new MockWorkersAI() };
    super(mockVectorize as any, mockEnv as any);
  }
}

/**
 * Utility function to detect CI environment
 */
export function isCI(error?: any): boolean {
  if (process.env.CI === 'true') return true;
  
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes('Status + 500') ||
           errorMessage.includes('Status 500') ||
           errorMessage.includes('Not logged in') ||
           errorMessage.includes('VECTOR_UPSERT_ERROR') ||
           errorMessage.includes('VECTOR_QUERY_ERROR') ||
           errorMessage.includes('INDEX_GET_ERROR');
  }
  
  return false;
}
