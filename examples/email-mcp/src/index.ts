import { EmailMcpServer } from './server';

export { EmailMcpServer };

// Worker entrypoint for handling requests and email events.
// We shard by sessionId if provided, else by a stable name to avoid too many DOs.
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let sessionIdStr = url.searchParams.get('sessionId');

    // Fallback stable shard if none provided (helps local/manual calls)
    if (!sessionIdStr) sessionIdStr = 'default-session';
    const id = env.EMAIL_MCP_SERVER.idFromName(sessionIdStr);

    url.searchParams.set('sessionId', id.toString());

    return env.EMAIL_MCP_SERVER.get(id).fetch(
      new Request(url.toString(), request)
    );
  },

  // Inbound email handler: validate recipient, parse, forward to DO for persistence
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Validate recipient
    const allowed = (env.ALLOWED_RECIPIENTS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    // Try to extract "To" header value (envelope to available as message.to)
    // Worker email headers may contain multiple To headers; we use the envelope for validation
    const envelopeTo = message.to?.toLowerCase();
    const toAllowed =
      envelopeTo &&
      allowed.some((rule) =>
        rule.startsWith('@') ? envelopeTo.endsWith(rule) : envelopeTo === rule
      );

    if (!toAllowed) {
      message.setReject(
        `Recipient ${message.to} not allowed. Configure ALLOWED_RECIPIENTS.`
      );
      return;
    }

    // Best-effort extraction
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get('Subject') ?? '';
    const rawSize = message.rawSize;

    let text = '';
    try {
      text = await new Response(message.raw).text();
    } catch {
      // ignore parse errors; keep text empty
    }

    const payload = {
      id: crypto.randomUUID(),
      from_addr: from,
      to_addr: to,
      subject,
      text,
      raw_size: rawSize,
      received_at: new Date().toISOString(),
    };

    // Post to DO API to persist
    const id = env.EMAIL_MCP_SERVER.idFromName(to);
    const url = new URL('http://internal/email/inbound');
    await env.EMAIL_MCP_SERVER.get(id).fetch(
      new Request(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': id.toString() },
        body: JSON.stringify(payload),
      })
    );
  },
};