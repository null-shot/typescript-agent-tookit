import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AgentEnv } from "@null-shot/agent";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { AiSdkAgent, type AIUISDKMessage } from "@null-shot/agent/aisdk";
import { ToolboxService } from "@null-shot/agent/services";

interface EnvWithAgent extends Env, AgentEnv {
  ANTHROPIC_API_KEY: string;
  AGENT: DurableObjectNamespace<DependentAgent>;
  MCP_SERVICE: Fetcher;
}

// Instantiate application with Hono
const app = new Hono<Env>();

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
export class DependentAgent extends AiSdkAgent<EnvWithAgent> {
  constructor(state: DurableObjectState, env: EnvWithAgent) {
    let model: LanguageModel;
    switch (env.AI_PROVIDER) {
      case "anthropic":
        const anthropic = createAnthropic({
          apiKey: env.ANTHROPIC_API_KEY,
        });
        model = anthropic("claude-3-haiku-20240307");
        break;
      default:
        // This should never happen due to validation above, but TypeScript requires this
        throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
    }

    super(state, env, model, [new ToolboxService(env)]);
  }

  async processMessage(
    sessionId: string,
    messages: AIUISDKMessage
  ): Promise<Response> {
    const result = await this.streamText(sessionId, {
      model: this.model,
      system:
        "You are a conversational expert, enjoying deep, intellectual conversations.",
      messages: messages.messages,
      maxSteps: 10,
      // Enable MCP tools from imported mcp.json
      experimental_toolCallStreaming: true,
      onError: (error: unknown) => {
        console.error("Error processing message", error);
      },
    });

    return result.toDataStreamResponse();
  }
}

export default {
  async fetch(
    request: Request,
    env: EnvWithAgent,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
