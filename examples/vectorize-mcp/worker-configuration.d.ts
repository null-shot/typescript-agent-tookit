interface Env {
  // Vectorize binding
  VECTORIZE_INDEX: VectorizeIndex;
  
  // Durable Object binding
  VECTORIZE_MCP_SERVER: DurableObjectNamespace;
  
  // Workers AI binding
  AI?: any;
}
