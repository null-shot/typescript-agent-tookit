interface Env {
	AGENT: DurableObjectNamespace<import('./src/index').QueueAgent>;
	REQUEST_QUEUE: Queue;
	AI?: Ai; // Optional when USE_MOCK_AI=true
	RESULTS_KV: KVNamespace;
	USE_MOCK_AI?: string;
}
