import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

// Shared encoder for all transports
const encoder = new TextEncoder();

/**
 * SSE Transport that connects to a Durable Object and forwards messages to SSE clients.
 *
 * This custom transport follows Cloudflare's best practices for SSE connections, without needing a nodejs_compaq enviornment.
 */
export class SSETransport implements Transport {
	sessionId: string;
	url: string;
	writableStream: WritableStreamDefaultWriter;
	private _closed = false;
	constructor(writableStream: WritableStreamDefaultWriter, sessionId: string, url: string) {
		this.writableStream = writableStream;
		this.sessionId = sessionId;
		this.url = url;
	}

	async send(message: JSONRPCMessage): Promise<void> {
		try {
			await this.writableStream.write(encoder.encode(`event: message\ndata: ${JSON.stringify(message)}\n\n`));
		} catch (error) {
			this.onerror?.(error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	async close(): Promise<void> {
		if (this._closed) return;
		this._closed = true;
		this.onclose?.();
	}

	onclose?: (() => void) | undefined;
	onerror?: ((error: Error) => void) | undefined;
	onmessage?: ((message: JSONRPCMessage) => void) | undefined;

	/**
	 * Start the transport - override to send initial endpoint info and handle SSE stream closure
	 */
	async start(): Promise<void> {
		try {
			// Send the endpoint event
			// This allows using URL/URLSearchParams for robust parameter handling.
			const endpointUrl = new URL(this.url);
			// The issue is here - we're modifying endpointUrl after using it
			// First create the URL with session ID
			endpointUrl.searchParams.set('sessionId', this.sessionId);

			// Then get the relative URL with all parameters
			const relativeUrlWithSession = endpointUrl.pathname + '?' + endpointUrl.searchParams.toString();

			// Send the endpoint event
			const endpointMessage = `event: endpoint\ndata: ${relativeUrlWithSession}\n\n`;
			await this.writableStream.write(encoder.encode(endpointMessage));
		} catch (error) {
			this.onerror?.(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Handle HTTP POST messages from SSE clients
	 *
	 * @param c Hono context
	 */
	async handlePostMessage(request: Request): Promise<Response> {
		try {
			// request.json() will throw an error if the content is not valid JSON
			// or if the Content-Type is not application/json
			const message = await request.json<JSONRPCMessage>();

			// Validate that it's a JSONRPCMessage (could add more validation here)
			if (!message || typeof message !== 'object') {
				throw new Error(`Invalid JSONRPCMessage format: ${JSON.stringify(message)}`);
			}

			// Call the onmessage handler if it exists
			this.onmessage?.(message);

			return new Response('Accepted', { status: 202 });
		} catch (error) {
			this.onerror?.(error as Error);
			return new Response(`Invalid message: ${error}`, { status: 400 });
		}
	}
}
