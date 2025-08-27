/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeAll } from "vitest";
import { emailSchema, EMAILS_SQL } from "../src/schema";
import { EmailRepository } from "../src/repository";

// This test runs in the Workers pool. The test environment provides `env` with D1.
declare const env: Env;

describe("EmailRepository (D1)", () => {
  let repo: EmailRepository;

  beforeAll(async () => {
    // Ensure schema and repo init
    repo = new EmailRepository(env.EMAILS_DB);
    await repo.initializeDatabase();

    // For safety in local runners, ensure schema exists (idempotent)
    await env.EMAILS_DB.exec(EMAILS_SQL);
  });

  it("createEmail -> getEmailById should round-trip", async () => {
    const email = emailSchema.parse({
      id: crypto.randomUUID(),
      from_addr: "alice@example.com",
      to_addr: "inbox@my-zone",
      subject: "Hello",
      text: "Test body",
      raw_size: 42,
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await repo.createEmail(email);

    const loaded = await repo.getEmailById(email.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(email.id);
    expect(loaded?.subject).toBe("Hello");
    expect(loaded?.text).toBe("Test body");
  });

  it("listEmails should support search, limit, offset, sorting", async () => {
    const baseTime = Date.now();

    const items = [
      {
        id: crypto.randomUUID(),
        from_addr: "bob@example.com",
        to_addr: "inbox@my-zone",
        subject: "Alpha",
        text: "First message",
        raw_size: 100,
        received_at: new Date(baseTime - 3000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        from_addr: "carol@example.com",
        to_addr: "inbox@my-zone",
        subject: "Beta",
        text: "Second message",
        raw_size: 200,
        received_at: new Date(baseTime - 2000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        from_addr: "dave@example.com",
        to_addr: "inbox@my-zone",
        subject: "Gamma",
        text: "Third message",
        raw_size: 300,
        received_at: new Date(baseTime - 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    for (const e of items) {
      await repo.createEmail(e as any);
    }

    // Default sort: received_at desc
    const page1 = await repo.listEmails({ limit: 2, offset: 0 });
    expect(page1.length).toBe(2);
    expect(page1[0].subject).toBe("Gamma");
    expect(page1[1].subject).toBe("Beta");

    // Page 2
    const page2 = await repo.listEmails({ limit: 2, offset: 2 });
    expect(page2.length).toBe(1);
    expect(page2[0].subject).toBe("Alpha");

    // Search across text/subject/from/to
    const searchBeta = await repo.listEmails({ search_text: "Second" });
    expect(searchBeta.some(e => e.subject === "Beta")).toBe(true);

    // Asc sorting
    const asc = await repo.listEmails({ sort_direction: "asc" });
    expect(asc[0].subject).toBe("Alpha");
  });
});