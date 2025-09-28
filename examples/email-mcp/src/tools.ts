import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EmailRepository } from './repository';
import { EmailFilter, emailFilterSchema } from './schema';

export function setupServerTools(server: McpServer, repository: EmailRepository, env: Env) {
  // create_test_email: add a test email to the database for testing/demo purposes
  server.tool(
    'create_test_email',
    'Create a test email record in the database for testing purposes.',
    {
      from_addr: z.string().email().describe('Sender email address'),
      to_addr: z.string().email().describe('Recipient email address'),
      subject: z.string().min(1).describe('Email subject'),
      text: z.string().min(1).describe('Email body text'),
    },
    async ({ from_addr, to_addr, subject, text }: { from_addr: string; to_addr: string; subject: string; text: string }) => {
      const now = new Date().toISOString();
      const testEmail = {
        id: crypto.randomUUID(),
        from_addr,
        to_addr,
        subject,
        text,
        raw_size: text.length + subject.length + 100, // approximate
        received_at: now,
        created_at: now,
        updated_at: now,
      };

      await repository.createEmail(testEmail);

      // Verify it was created by immediately trying to read it back
      const verification = await repository.getEmailById(testEmail.id);
      const verifyText = verification ? "✅ Verified in DB" : "❌ Not found after creation";

      return {
        content: [{ type: 'text', text: `Test email created with ID: ${testEmail.id}. ${verifyText}` }],
        email: testEmail,
      };
    }
  );

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
      const preview = email.text ? email.text.split(' ').slice(0, 50).join(' ') : '';
      const truncated = email.text && email.text.split(' ').length > 50 ? '...' : '';
      
      return {
        content: [{ 
          type: 'text', 
          text: `Email ID: ${email.id}\nSubject: ${email.subject ?? '(no subject)'}\nFrom: ${email.from_addr}\nTo: ${email.to_addr}\nContent: ${preview}${truncated}` 
        }],
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

      if (emails.length === 0) {
        return {
          content: [{ type: 'text', text: 'Found 0 email(s)' }],
          emails,
        };
      }

      // Create a summary of emails with full IDs and subjects
      const emailSummary = emails.map(email => {
        const preview = email.text ? email.text.split(' ').slice(0, 12).join(' ') : '';
        const truncated = email.text && email.text.split(' ').length > 12 ? '...' : '';
        return `• ID: ${email.id}\n  Subject: "${email.subject ?? '(no subject)'}"\n  From: ${email.from_addr} → To: ${email.to_addr}\n  Content: ${preview}${truncated}\n`;
      }).join('\n');

      return {
        content: [{ 
          type: 'text', 
          text: `Found ${emails.length} email(s):\n\n${emailSummary}` 
        }],
        emails,
      };
    }
  );
}