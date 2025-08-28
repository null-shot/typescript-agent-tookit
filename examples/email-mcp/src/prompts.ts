import { McpServer } from '@modelcontextprotocol/sdk/server';

export function setupServerPrompts(server: McpServer) {
  server.prompt(
    'introduction',
    'Learn about the Email MCP and how to use it',
    () => ({
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Welcome to the Email MCP.
- Use "send_email" to send internal emails (verified recipients only).
- Use "list_emails" to browse stored inbound emails.
- Use "get_email" to fetch a specific stored email.

Receiving emails from the public is supported; sending is restricted to internal/verified addresses.`,
          },
        },
      ],
    })
  );
}