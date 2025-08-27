import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EmailRepository } from './repository';
import { EmailFilter, emailFilterSchema } from './schema';

export function setupServerTools(server: McpServer, repository: EmailRepository, env: Env) {
  // send_email: internal, only to verified/allowed recipients
  server.tool(
    'send_email',
    'Send an internal email to a verified recipient (Cloudflare Email Routing only).',
    {
      to: z.string().email().describe('Recipient email address'),
      subject: z.string().min(1).describe('Email subject'),
      text: z.string().min(1).describe('Plaintext body'),
    },
    async ({ to, subject, text }: { to: string; subject: string; text: string }) => {
      const allowed = (env.ALLOWED_RECIPIENTS ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const toLower = to.toLowerCase();
      const isAllowed = allowed.some((rule) =>
        rule.startsWith('@') ? toLower.endsWith(rule) : toLower === rule
      );

      if (!isAllowed) {
        throw new Error(
          `Recipient ${to} not allowed. Configure ALLOWED_RECIPIENTS env (comma-separated addresses or @domain rules).`
        );
      }

      if (!env.MAIL_FROM) {
        throw new Error('MAIL_FROM env var is required.');
      }

      // Build a minimal RFC 822 message
      const raw =
`From: ${env.MAIL_FROM}
To: ${to}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

${text}
`;

      // Send via Cloudflare Email binding
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: EmailMessage is provided by cloudflare:email module at runtime
      const { EmailMessage } = await import('cloudflare:email');
      await env.SEND_EMAIL.send(new EmailMessage(env.MAIL_FROM, to, raw));

      return {
        content: [{ type: 'text', text: `Email sent to ${to}` }],
      };
    }
  );

  // get_email: fetch a single email by id
  server.tool(
    'get_email',
    'Get a single stored email by ID.',
    {
      id: z.string().uuid().describe('Email id'),
    },
    async ({ id }: { id: string }) => {
      const email = await repository.getEmailById(id);
      if (!email) {
        return {
          content: [{ type: 'text', text: `Email with ID ${id} not found` }],
        };
      }
      return {
        content: [{ type: 'text', text: `Found email with subject: ${email.subject ?? ''}` }],
        email,
      };
    }
  );

  // list_emails: list stored emails with filters
  server.tool(
    'list_emails',
    'List stored emails with optional search and pagination.',
    {
      search_text: z.string().optional().describe('Search text across from, to, subject, body'),
      limit: z.number().int().min(1).max(100).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
      sort_by: z.enum(['received_at', 'created_at', 'updated_at']).optional().default('received_at'),
      sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
    },
    async (args: Partial<EmailFilter>) => {
      const filters = emailFilterSchema.parse(args);
      const emails = await repository.listEmails(filters);

      return {
        content: [{ type: 'text', text: `Found ${emails.length} email(s)` }],
        emails,
      };
    }
  );
}