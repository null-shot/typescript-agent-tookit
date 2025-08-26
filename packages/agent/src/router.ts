import { Hono } from 'hono';
import { AgentEnv } from './env';
import { cors } from 'hono/cors';

/*
    This router is used to handle permissionless sessions where anyone can access the chat by knowing the unique session id
    If no sessionId is provided, a new one will be generated
*/
export function applyPermissionlessAgentSessionRouter<T extends AgentEnv>(app: Hono<{ Bindings: T }>) {
	console.log('Setting up permissionless agent session router');
	// Add CORS middleware
	app.use(
		'*',
		cors({
			origin: '*', // Allow any origin for development; restrict this in production
			allowMethods: ['POST', 'GET', 'OPTIONS'],
			allowHeaders: ['Content-Type'],
			exposeHeaders: ['X-Session-Id'],
			maxAge: 86400, // 24 hours
		}),
	);

	// Route all requests to the durable object instance based on session
	app.all('/agent/chat/:sessionId?', async (c) => {
		const { AGENT } = c.env;
		var sessionIdStr = c.req.param('sessionId');

		if (!sessionIdStr || sessionIdStr == '') {
			sessionIdStr = crypto.randomUUID();
		}

		const id = AGENT.idFromName(sessionIdStr);

		console.log(`Fetching durable object instance: ${sessionIdStr} to do id: ${id}`);

		const forwardRequest = new Request('https://internal.com/agent/chat/' + sessionIdStr, {
			method: c.req.method,
			body: c.req.raw.body,
		});

		// Forward to Durable Object and get response
		return await AGENT.get(id).fetch(forwardRequest);
	});

	return app;
}
