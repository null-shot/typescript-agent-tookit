import { EmailMcpServer } from "./server";

export { EmailMcpServer };

// Worker entrypoint for handling requests and email events.
// We shard by sessionId if provided, else by a stable name to avoid too many DOs.
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    let sessionIdStr = url.searchParams.get("sessionId");

    const id = sessionIdStr
      ? env.EMAIL_MCP_SERVER.idFromString(sessionIdStr)
      : env.EMAIL_MCP_SERVER.idFromName("default-email-session");

    url.searchParams.set("sessionId", id.toString());

    return env.EMAIL_MCP_SERVER.get(id).fetch(
      new Request(url.toString(), request.clone()),
    );
  },
};
