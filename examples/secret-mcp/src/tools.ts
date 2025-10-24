import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerTools(server: McpServer, env: Env) {
	const secretNumber = parseInt(env.SECRET_NUMBER);
	// Let's you to guess the secret
	server.tool(
		'guess_number',
		'Tells you if you guessed the number correctly',
		{
			guess: z.number().describe('The number you guessed'),
		},
		async ({ guess }: { guess: number }) => {
			const guessedCorrectedly = guess === secretNumber;
			return {
				content: [
					{
						type: 'text',
						text: `You guessed ${guess}: your guess was ${guessedCorrectedly}`,
					},
				],
				correct: guessedCorrectedly,
			};
		},
	);
}
