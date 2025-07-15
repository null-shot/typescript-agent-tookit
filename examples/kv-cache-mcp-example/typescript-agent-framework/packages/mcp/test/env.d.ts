declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {
		MCP_DURABLE_OBJECT: DurableObjectNamespace /* McpServerDO */;
	}
}
