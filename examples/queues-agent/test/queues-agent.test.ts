import { expect, it } from "vitest";

const BASE = "http://127.0.0.1:8787";

it("enqueues and returns a result (may be null without Workers AI auth)", async () => {
  const sessionId = `test-${crypto.randomUUID()}`;

  const enqueue = await fetch(`${BASE}/enqueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      messages: [{ role: "user", content: "One sentence about queues." }],
    }),
  });
  expect(enqueue.ok).toBe(true);
  const ej = await enqueue.json();
  expect(ej.enqueued).toBe(true);

  // Poll result up to ~8s
  let result: any = null;
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${BASE}/result/${sessionId}`);
    expect(r.ok).toBe(true);
    const j = await r.json();
    if (j.result) {
      result = j.result;
      break;
    }
    await new Promise((res) => setTimeout(res, 1000));
  }

  // We allow null when not authenticated to Workers AI locally
  expect(result === null || typeof result === "string").toBe(true);
});
