interface Env {
  AGENT: DurableObjectNamespace<import("./src/index").QueueAgent>;
  REQUEST_QUEUE: Queue;
  AI: Ai;
  RESULTS: KVNamespace;
  AI_PROVIDER: string;
  OPEN_AI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  GOOGLE_API_KEY: string;
  GROK_API_KEY: string;
}
