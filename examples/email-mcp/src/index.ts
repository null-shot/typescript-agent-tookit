import { EmailMcpServer } from './server';

export { EmailMcpServer };

// Worker entrypoint for handling requests and email events.
// We shard by sessionId if provided, else by a stable name to avoid too many DOs.
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    let sessionIdStr = url.searchParams.get('sessionId');

    const id = sessionIdStr
      ? env.EMAIL_MCP_SERVER.idFromString(sessionIdStr)
      : env.EMAIL_MCP_SERVER.newUniqueId();

    url.searchParams.set('sessionId', id.toString());    

    return env.EMAIL_MCP_SERVER.get(id).fetch(
      new Request(url.toString(), request)
    );
  },

  // Inbound email handler: validate recipient, parse, forward to DO for persistence
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {

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