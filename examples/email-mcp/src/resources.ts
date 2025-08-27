import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EmailRepository } from './repository';
import { emailFilterSchema } from './schema';

export function setupServerResources(server: McpServer, repository: EmailRepository) {
  // Resource: d1://database/emails -> list with filters
  server.resource(
    'listEmails',
    'd1://database/emails',
    { description: 'List stored emails with optional search and pagination.' },
    async (uri: URL) => {
      const sp = uri.searchParams;
      const filters = emailFilterSchema.parse({
        search_text: sp.get('search_text') ?? undefined,
        limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
        offset: sp.get('offset') ? Number(sp.get('offset')) : undefined,
        sort_by: (sp.get('sort_by') as any) ?? undefined,
        sort_direction: (sp.get('sort_direction') as any) ?? undefined,
      });

      const emails = await repository.listEmails(filters);
      return {
        contents: [{ text: `Found ${emails.length} email(s)`, uri: uri.href }],
        emails,
      };
    }
  );

  // Resource: d1://database/emails/{id} -> get single
  server.resource(
    'getEmail',
    'd1://database/emails/{id}',
    async (uri: URL) => {
      const parts = uri.pathname.split('/');
      const id = parts[parts.length - 1];

      const email = await repository.getEmailById(id);
      if (!email) {
        return {
          contents: [{ text: `Email with ID ${id} not found`, uri: 'data:text/plain,email_not_found' }],
        };
      }

      return {
        contents: [{ text: `Email subject: ${email.subject ?? ''}`, uri: uri.href }],
        email,
      };
    }
  );
}