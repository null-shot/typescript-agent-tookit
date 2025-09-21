import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerTools(server: McpServer, env: Env) {
	// Get current time tool
	server.tool(
		'greeting',
		'Sends a greeting using an optional name if supplied',
		{
			name: z
				.string()
				.optional()
				.describe(
					'The name to use when sending the greeting. If no name is supplied, then the default value set by an env variable is used.'
				),
		},
		async ({ name }: { name?: string }) => {
			const greetingName = name || env.DEFAULT_NAME;

			return {
				content: [
					{
						type: 'text',
						text: `Hello ${greetingName}`,
					},
				],
			};
		}
	);
}
