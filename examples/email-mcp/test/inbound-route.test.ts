/// <reference types="@cloudflare/workers-types" />

import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WorkerSSEClientTransport } from "@null-shot/test-utils/mcp/WorkerSSEClientTransport";


declare const env: Env;

type ToolResponse = {
  content: Array<{ type: string; text: string }>;
  // For list/get tools we return structured data
  emails?: any[];
  email?: any;
};

describe("Email MCP - tool-based client tests (tools + prompt)", () => {
  const baseUrl = "http://localhost";
  let client: Client;
  let ctx: ExecutionContext;

  beforeEach(async () => {
    ctx = createExecutionContext();
    client = new Client({ name: "email-mcp-test-client", version: "1.0.0" });
  });

  afterEach(async () => {
    try {
      if (client && typeof client.close === "function") {
        await client.close();
      }
    } catch {
      // ignore
    }
  });

  function createTransport(ctx: ExecutionContext) {
    const url = new URL(`${baseUrl}/sse`);
    return new WorkerSSEClientTransport(url, ctx);
  }

  it("connects via SSE and fetches server version", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    const serverInfo = await client.getServerVersion();
    expect(serverInfo).toBeDefined();
    // Name/version depend on your EmailMcpServer implementation;
    // make loose assertions to avoid coupling to internal strings.
    expect(typeof serverInfo?.name).toBe("string");
    expect(typeof serverInfo?.version).toBe("string");

    await waitOnExecutionContext(ctx);
  });

  it('returns "introduction" prompt content', async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // List prompts to ensure "introduction" exists
    const prompts = await client.listPrompts();
    expect(Array.isArray(prompts?.prompts)).toBe(true);
    const hasIntro = prompts!.prompts!.some((p) => p.name === "introduction");
    expect(hasIntro).toBe(true);

    // Get the "introduction" prompt content
    const intro = await client.getPrompt({ name: "introduction" });
    expect(intro).toBeDefined();
    expect(Array.isArray(intro!.messages)).toBe(true);
    const textParts = intro!.messages!.map((m) =>
      typeof (m as any).content === "string"
        ? (m as any).content
        : (m as any).content?.text
    );
    expect(textParts.join(" ")).toMatch(/Email MCP/i);

    await waitOnExecutionContext(ctx);
  });

  it("lists emails (tool: list_emails)", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    const res = (await client.callTool({
      name: "list_emails",
      arguments: {
        limit: 5,
        offset: 0,
        sort_by: "received_at",
        sort_direction: "desc",
      },
    })) as ToolResponse;

    expect(res).toBeDefined();
    expect(Array.isArray(res.content)).toBe(true);
    // Content[0].text typically summarizes results
    expect(res.content[0].type).toBe("text");

    await waitOnExecutionContext(ctx);
  });

  it("creates a synthetic inbound email record and fetches it (tool: get_email)", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // Since we can’t trigger email(message) locally, we simulate inbound by
    // posting to the DO route exposed by the worker fetch handler.
    const id = crypto.randomUUID();
    const payload = {
      id,
      from_addr: "sender@example.com",
      to_addr: "alice@example.com",
      subject: "Tool-based test inbound",
      text: "Hello from tool-based test",
      raw_size: 123,
      received_at: new Date().toISOString(),
    };

    // Use the same worker under test—construct a request that the worker fetch handler accepts.
    // The worker code typically shims through to the DO route /email/inbound.
    const url = new URL("http://localhost/email/inbound");
    // Include a sessionId to ensure deterministic DO routing
    url.searchParams.set("sessionId", "tool-based-inbound");

    const req = new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Use global fetch (provided by the test runtime worker) to hit the same module
    const res = await fetch(req);
    expect(res.status).toBeLessThan(400);

    // Now fetch via tool
    const getRes = (await client.callTool({
      name: "get_email",
      arguments: { id },
    })) as ToolResponse;

    expect(getRes).toBeDefined();
    expect(Array.isArray(getRes.content)).toBe(true);
    expect(getRes.content[0].type).toBe("text");

    await waitOnExecutionContext(ctx);
  });

  it("sends email (tool: send_email) to allowed recipient but in demo mode only", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // Ensure vars are configured for demo; SEND_EMAIL only works to verified recipients.
    // We still call the tool; in dev it may be mocked or will no-op if not bound live.
    const to = "alice@example.com"; // must match ALLOWED_RECIPIENTS in wrangler.jsonc

    const sendRes = (await client.callTool({
      name: "send_email",
      arguments: {
        to,
        subject: "Demo send from tool-based test",
        text: "This is a demo-only send_email call.",
      },
    })) as ToolResponse;

    expect(sendRes).toBeDefined();
    expect(Array.isArray(sendRes.content)).toBe(true);
    expect(sendRes.content[0].type).toBe("text");
    // The text usually confirms a queued/sent attempt or a mock confirmation.
    expect(sendRes.content[0].text.toLowerCase()).toMatch(/send|mock|queued/);

    await waitOnExecutionContext(ctx);
  });

  it("lists emails with search_text filter (tool: list_emails)", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // Create another synthetic inbound record for search
    const id = crypto.randomUUID();
    const marker = `Marker-${Date.now()}`;
    const payload = {
      id,
      from_addr: "someone@example.com",
      to_addr: "alice@example.com",
      subject: `Searchable ${marker}`,
      text: `Contains ${marker} in body`,
      raw_size: 111,
      received_at: new Date().toISOString(),
    };

    const url = new URL("http://localhost/email/inbound");
    url.searchParams.set("sessionId", "tool-based-inbound-2");

    const req = new Request(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res = await fetch(req);
    expect(res.status).toBeLessThan(400);

    const listRes = (await client.callTool({
      name: "list_emails",
      arguments: { search_text: marker, limit: 10 },
    })) as ToolResponse;

    expect(listRes).toBeDefined();
    expect(Array.isArray(listRes.content)).toBe(true);
    expect(listRes.content[0].type).toBe("text");

    await waitOnExecutionContext(ctx);
  });

  it("send_email rejects disallowed recipient (error case)", async () => {
  const transport = createTransport(ctx);
  await client.connect(transport);

  const disallowed = "not-allowed@outside.com"; // must NOT match ALLOWED_RECIPIENTS

  let threw = false;
  try {
    await client.callTool({
      name: "send_email",
      arguments: {
        to: disallowed,
        subject: "Should fail",
        text: "This should be rejected",
      },
    });
  } catch (err: any) {
    threw = true;
    // SDK typically throws Error with message from tool; make a loose assertion
    expect(String(err.message || err)).toMatch(/not allowed|disallowed|invalid/i);
  }
  expect(threw).toBe(true);

  await waitOnExecutionContext(ctx);
});

it("get_email returns a not found error for unknown id", async () => {
  const transport = createTransport(ctx);
  await client.connect(transport);

  const unknownId = crypto.randomUUID();
  let caught = false;
  try {
    await client.callTool({
      name: "get_email",
      arguments: { id: unknownId },
    });
  } catch (err: any) {
    caught = true;
    expect(String(err.message || err)).toMatch(/not found|missing/i);
  }
  expect(caught).toBe(true);

  await waitOnExecutionContext(ctx);
});

it("list_emails validates bad inputs (negative limit)", async () => {
  const transport = createTransport(ctx);
  await client.connect(transport);

  let caught = false;
  try {
    await client.callTool({
      name: "list_emails",
      arguments: { limit: -5 },
    });
  } catch (err: any) {
    caught = true;
    expect(String(err.message || err)).toMatch(/invalid|limit|greater/i);
  }
  expect(caught).toBe(true);

  await waitOnExecutionContext(ctx);
});

it("prompt: requesting a missing prompt yields an error", async () => {
  const transport = createTransport(ctx);
  await client.connect(transport);

  let caught = false;
  try {
    await client.getPrompt({ name: "does_not_exist" });
  } catch (err: any) {
    caught = true;
    expect(String(err.message || err)).toMatch(/not found|unknown prompt|missing/i);
  }
  expect(caught).toBe(true);

  await waitOnExecutionContext(ctx);
});

it("reads a single email via resource URI d1://database/emails/{id}", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // Seed a synthetic inbound email first
    const id = crypto.randomUUID();
    const subject = `Resource Single Read ${Date.now()}`;
    const payload = {
      id,
      from_addr: "sender@example.com",
      to_addr: "alice@example.com",
      subject,
      text: "Resource-read single test body",
      raw_size: 222,
      received_at: new Date().toISOString(),
    };

    const url = new URL("http://localhost/email/inbound");
    url.searchParams.set("sessionId", "resource-single");
    const res = await fetch(
      new Request(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    expect(res.status).toBeLessThan(400);

    // Read via resource
    const resourceRes = await client.readResource({
      uri: `d1://database/emails/${encodeURIComponent(id)}`,
    });

    expect(resourceRes).toBeDefined();
    // CRUD-MCP style: resource responses include contents array; also allow direct fields for flexibility
    expect(Array.isArray((resourceRes as any).contents) || (resourceRes as any).email).toBe(true);

    // Try to extract the email in a robust way
    const email =
      (resourceRes as any).email ??
      ((resourceRes as any).contents?.[0]?.email ?? (resourceRes as any).contents?.[0] ?? null);

    expect(email).toBeTruthy();
    expect(email.id).toBe(id);
    expect(email.subject).toBe(subject);

    await waitOnExecutionContext(ctx);
  });

  it("reads a list of emails via resource URI d1://database/emails?limit=2", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    // Seed a couple of messages to ensure we have data
    for (let i = 0; i < 2; i++) {
      const payload = {
        id: crypto.randomUUID(),
        from_addr: `list${i}@example.com`,
        to_addr: "alice@example.com",
        subject: `Resource List Seed ${i} ${Date.now()}`,
        text: "Resource-read list test",
        raw_size: 100 + i,
        received_at: new Date().toISOString(),
      };
      const url = new URL("http://localhost/email/inbound");
      url.searchParams.set("sessionId", "resource-list");
      const res = await fetch(
        new Request(url.toString(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toBeLessThan(400);
    }

    // Read via resource with pagination
    const listRes = await client.readResource({
      uri: "d1://database/emails?limit=2",
    });

    expect(listRes).toBeDefined();
    const contents = (listRes as any).contents ?? (listRes as any).emails ?? [];
    expect(Array.isArray(contents)).toBe(true);
    // We requested limit=2; assert we didn’t exceed the limit
    expect(contents.length).toBeGreaterThan(0);
    expect(contents.length).toBeLessThanOrEqual(2);

    await waitOnExecutionContext(ctx);
  });

  it("reads emails via resource with search_text filter", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    const marker = `ResSearch-${Date.now()}`;
    // Seed a message containing a marker
    {
      const payload = {
        id: crypto.randomUUID(),
        from_addr: "searcher@example.com",
        to_addr: "alice@example.com",
        subject: `Resource Searchable ${marker}`,
        text: `Body includes ${marker}`,
        raw_size: 456,
        received_at: new Date().toISOString(),
      };
      const url = new URL("http://localhost/email/inbound");
      url.searchParams.set("sessionId", "resource-search");
      const res = await fetch(
        new Request(url.toString(), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
      expect(res.status).toBeLessThan(400);
    }

    // Read via resource with search_text
    const searchRes = await client.readResource({
      uri: `d1://database/emails?search_text=${encodeURIComponent(marker)}&limit=10`,
    });

    expect(searchRes).toBeDefined();
    const emails = (searchRes as any).emails ?? (searchRes as any).contents ?? [];
    expect(Array.isArray(emails)).toBe(true);
    expect(emails.length).toBeGreaterThan(0);

    // All subjects or bodies should include the marker
    for (const e of emails) {
      const subj = (e.subject || "").toString();
      const body = (e.text || "").toString();
      expect(subj.includes(marker) || body.includes(marker)).toBe(true);
    }

    await waitOnExecutionContext(ctx);
  });

  it("resource read: unknown id should produce not found error", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    const badId = crypto.randomUUID();
    let caught = false;
    try {
      await client.readResource({
        uri: `d1://database/emails/${encodeURIComponent(badId)}`,
      });
    } catch (err: any) {
      caught = true;
      expect(String(err?.message || err)).toMatch(/not found|missing|no such/i);
    }
    expect(caught).toBe(true);

    await waitOnExecutionContext(ctx);
  });

  it("resource list: invalid query params (negative limit) should error", async () => {
    const transport = createTransport(ctx);
    await client.connect(transport);

    let caught = false;
    try {
      await client.readResource({
        uri: "d1://database/emails?limit=-1",
      });
    } catch (err: any) {
      caught = true;
      expect(String(err?.message || err)).toMatch(/invalid|limit|greater/i);
    }
    expect(caught).toBe(true);

    await waitOnExecutionContext(ctx);
  });
});