/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeAll } from "vitest";
import { EmailRepository } from "../src/repository";

// Vitest Workers pool injects global `SELF` fetch (the worker) and `env`.
declare const env: Env;
// `SELF` is the worker module’s default export object that handles fetch/email in the pool.
declare const SELF: ExportedHandler<Env>;

function withSession(url: string, sessionId = "test-session") {
  const u = new URL(url);
  u.searchParams.set("sessionId", sessionId);
  return u.toString();
}

describe("EmailMcpServer DO - inbound route", () => {
  let repo: EmailRepository;

  beforeAll(async () => {
    repo = new EmailRepository(env.EMAILS_DB);
    await repo.initializeDatabase();
  });

  it("POST /email/inbound persists email in D1", async () => {
    // Build a request to the Worker fetch() that routes to the DO
    // The worker fetch() will derive DO id from sessionId and forward the request to the DO.
    const url = withSession("https://example.internal/email/inbound", "inbound-test-1");
    const payload = {
      id: crypto.randomUUID(),
      from_addr: "sender@example.com",
      to_addr: "inbox@my-zone",
      subject: "Inbound Subject",
      text: "Body from inbound",
      raw_size: 512,
      received_at: new Date().toISOString(),
    };

    const req = new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await SELF.fetch!(req, env, {} as ExecutionContext);
    expect(res.status).toBeLessThan(400);
    const json = await res.json<any>();
    expect(json.ok).toBe(true);

    // Verify persistence via repository
    const found = await repo.getEmailById(payload.id);
    expect(found).not.toBeNull();
    expect(found?.subject).toBe("Inbound Subject");
    expect(found?.text).toBe("Body from inbound");
  });
});