import { Hono } from "hono";
import { cors } from "hono/cors";
import { applyPermissionlessAgentSessionRouter } from "@nullshot/agent";
import { AiSdkAgent, AIUISDKMessage } from "@nullshot/agent/aisdk";
import { Service } from "@nullshot/agent";
import { ToolboxService } from "@nullshot/agent/services";
import { createWorkersAI } from "workers-ai-provider";

// Minimal agent that echoes a short response via Workers AI
export class QueueAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env) {
    if (!env.AI)
      throw new Error(
        "AI binding missing. Configure Workers AI in wrangler.jsonc"
      );
    const workersai = createWorkersAI({ binding: env.AI });
    const model = workersai("@cf/meta/llama-3.1-8b-instruct" as any);
    const services: Service[] = [new ToolboxService(env)];
    super(state, env, model, services);
  }

  async processMessage(
    sessionId: string,
    messages: AIUISDKMessage
  ): Promise<Response> {
    const result = await this.streamTextWithMessages(
      sessionId,
      messages.messages,
      {
        system: "You are a helpful assistant. Keep responses concise.",
        maxSteps: 5,
      }
    );
    return result.toTextStreamResponse();
  }
}

// Hono app for producer and agent gateway
const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

// Simple enqueue endpoint: { sessionId, messages }
app.post("/enqueue", async (c) => {
  const body = await c.req.json<any>();
  const sessionId: string = body.sessionId || crypto.randomUUID();
  const messages = body.messages || [{ role: "user", content: "Hello!" }];

  await c.env.REQUEST_QUEUE.send({ sessionId, messages });

  return c.json({ enqueued: true, sessionId });
});

// Fetch latest result for session
app.get("/result/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const value = await c.env.RESULTS.get(`result:${sessionId}`);
  if (!value) return c.json({ result: null }, 200);
  return c.json({ result: value }, 200);
});

// Route /agent/chat/:sessionId to the DO agent
applyPermissionlessAgentSessionRouter(app);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  // Queue consumer: run messages through the Agent DO
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext) {
    for (const msg of batch.messages) {
      try {
        const { sessionId, messages } = msg.body || {};
        if (!sessionId || !messages) {
          console.warn("Invalid queue message, skipping");
          continue;
        }
        const id = env.AGENT.idFromName(sessionId);
        const req = new Request("https://internal/agent/chat/" + sessionId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: crypto.randomUUID(), messages }),
        });
        // Synchronously fetch the agent and persist full text to KV for retrieval
        const resp = await env.AGENT.get(id).fetch(req);
        const text = await resp.text();
        ctx.waitUntil(
          env.RESULTS.put(`result:${sessionId}`, text, {
            expirationTtl: 60 * 60,
          })
        );
      } catch (e) {
        console.error("Queue processing error:", e);
        throw e;
      }
    }
  },
};
