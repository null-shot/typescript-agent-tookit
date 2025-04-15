import { Hono } from "hono";
import { McpServerDO, SSE_MESSAGE_ENDPOINT } from "./server";



export abstract class McpHonoServerDO extends McpServerDO {
    private app: Hono<{ Bindings: Env }>;

    public constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.app = new Hono<{ Bindings: Env }>();
        this.setupRoutes(this.app);
    }

    async fetch(request: Request): Promise<Response> {
        return await this.app.fetch(request);
    }
    
    /**
	 * Set up routes for the MCP server
	 */
	protected setupRoutes(app: Hono<{ Bindings: Env }>) {
		// // WebSocket endpoint for direct connections
		// this.app.get('/websocket', async (c) => {
		// 	// Verify the Upgrade header is present and is WebSocket
		// 	const upgradeHeader = c.req.header('Upgrade');
		// 	if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
		// 		return c.text('Expected Upgrade: websocket', 426);
		// 	}

		// 	// Check for 'mcp' subprotocol
		// 	const protocols = c.req.header('Sec-WebSocket-Protocol');
		// 	const acceptProtocol = protocols?.split(',').map(p => p.trim()).includes(this.MCP_SUBPROTOCOL);
		// 	if (!acceptProtocol) {
		// 		return c.text('Expected Sec-WebSocket-Protocol: mcp', 426);
		// 	}

		// 	const instance = this.getMcpDO(c);
		// 	// Forward the request to the Durable Object - upgrades websocket connection
		// 	return await instance.fetch(c.req.raw);
		// });

		// SSE endpoint for event streaming
		app.get(`/sse`, async (c) => {
			return this.processSSEConnection(c.req.raw);
        });

		// Message handling endpoint for SSE clients
		app.post(SSE_MESSAGE_ENDPOINT, async (c) => {
			return this.processMcpRequest(c.req.raw);
		});

		// // Add headers middleware to set common headers for SSE connections
		// this.app.use(`${this.basePath}/sse`, async (c, next) => {
		// 	await next();
		// 	if (c.res.headers.get('Content-Type') === 'text/event-stream') {
		// 		c.res.headers.set('Cache-Control', 'no-cache');
		// 		c.res.headers.set('Connection', 'keep-alive');
		// 	}
		// });
	}
    
}