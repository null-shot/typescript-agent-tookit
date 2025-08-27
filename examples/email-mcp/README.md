# Email MCP (D1 + Cloudflare Email)

An MCP server that:
- Sends internal emails via Cloudflare’s Email binding (only to verified addresses).
- Persists inbound emails to a D1 database.
- Exposes MCP tools and resources to interact with emails.

Features
- Tools:
  - send_email(to, subject, text)
  - list_emails(search_text?, limit?, offset?, sort_by?, sort_direction?)
  - get_email(id)
- Resources:
  - d1://database/emails
  - d1://database/emails/{id}
- Inbound handling:
  - Cloudflare Email Worker email() event stores inbound email into D1.

Important limitations
- This is for internal email only. Cloudflare’s Send Email binding delivers only to verified recipients on your zone.
- Not a general outbound SMTP service.

Setup

1) Create D1 database
- In Cloudflare Dashboard or via CLI:
  - wrangler d1 create email_db
  - Update wrangler.jsonc "d1_databases" database_id and database_name accordingly.

2) Email Routing and bindings
- Verify MAIL_FROM (sender) address in Cloudflare Email Routing.
- Verify intended recipient addresses or domains (ALLOWED_RECIPIENTS).
- Add “Send Email” binding named SEND_EMAIL in wrangler.jsonc.

3) Durable Object binding
- EMAIL_MCP_SERVER is defined in wrangler.jsonc. No extra setup beyond deploy.

4) Env vars
- MAIL_FROM: the verified sender (e.g., no-reply@example.com)
- ALLOWED_RECIPIENTS: comma-separated emails or @domain rules. Examples:
  - "alice@example.com,bob@example.com,@example.com"

Local development
- Install deps: pnpm i
- Update wrangler.jsonc vars and bindings.
- Run: pnpm dev

Deploy
- pnpm deploy

Testing MCP with the Playground
- Start the Playground package or your client.
- Connect via SSE/WebSocket to this Worker’s /sse (the MCP package already mounts standard endpoints in the DO).
- Call tools:
  - send_email
  - list_emails
  - get_email

Simulating inbound email locally
- POST JSON to /email/inbound (the DO route) to mimic an inbound event:
  - curl -X POST http://127.0.0.1:8787/email/inbound -H "content-type: application/json" -d '{
      "id":"<uuid>",
      "from_addr":"sender@example.com",
      "to_addr":"alice@example.com",
      "subject":"Hello",
      "text":"body",
      "raw_size":123,
      "received_at":"2025-03-10T12:00:00.000Z"
    }'
- Then list via MCP resource or tool.

Notes
- Large raw messages: we store only the text and metadata in D1. If you need full raw, consider R2.
- If you see recipient not allowed, update ALLOWED_RECIPIENTS.