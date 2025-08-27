import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  AiSdkAgent,
  type AIUISDKMessage,
  ToolboxService,
} from "@null-shot/agent";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: "*", // Allow any origin for development; restrict this in production
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    exposeHeaders: ["X-Session-Id"],
    maxAge: 86400, // 24 hours
  })
);

// Route all requests to the durable object instance based on session
app.all("/agent/chat/:sessionId?", async (c) => {
  const { AGENT } = c.env;
  var sessionIdStr = c.req.param("sessionId");

  if (!sessionIdStr || sessionIdStr == "") {
    sessionIdStr = AGENT.newUniqueId().toString();
  }

  const id = AGENT.idFromName(sessionIdStr);

  const forwardRequest = new Request(
    "https://internal.com/agent/chat/" + sessionIdStr,
    {
      method: c.req.method,
      body: c.req.raw.body,
    }
  );

  // Forward to Durable Object and get response
  return await AGENT.get(id).fetch(forwardRequest);
});

//
export class DependentAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env) {
    // Use string model identifier - AI SDK v5 supports this directly
    let modelId: string;
    switch (env.AI_PROVIDER) {
      case "anthropic":
        modelId = "anthropic:claude-3-haiku-20240307";
        break;
      default:
        // This should never happen due to validation above, but TypeScript requires this
        throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
    }

    super(state, env, modelId, [new ToolboxService(env)]);
  }

  async processMessage(
    sessionId: string,
    messages: AIUISDKMessage
  ): Promise<Response> {
    // Use the protected streamTextWithMessages method - model is handled automatically by the agent
    const result = await this.streamTextWithMessages(
      sessionId,
      messages.messages,
      {
        system:
          "You are a conversational expert, enjoying deep, intellectual conversations.",
        maxSteps: 10,
        // Enable MCP tools from imported mcp.json
        experimental_toolCallStreaming: true,
        onError: (error: unknown) => {
          console.error("Error processing message", error);
        },
      }
    );

    return result.toTextStreamResponse();
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
