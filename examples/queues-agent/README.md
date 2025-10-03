## Queues Agent Example

Showcase of using Cloudflare Queues with the NullShot Agent Toolkit:

- HTTP producer endpoint enqueues chat jobs
- Queue consumer triggers inside the same Worker and forwards each job directly to a Durable Object Agent to process with AI

### Architecture

- Producer: `POST /enqueue` → pushes `{ sessionId, messages }` into `REQUEST_QUEUE`
- Consumer: `queue()` handler → forwards each message to `AGENT` Durable Object at `/agent/chat/:sessionId`
- Agent: `QueueAgent` extends the toolkit `AiSdkAgent` and streams an AI response (Workers AI by default)

### Files

- `src/index.ts` – Worker with producer route, queue consumer, and DO Agent
- `wrangler.jsonc` – Bindings for Queue, Durable Object, Workers AI

### Prerequisites

- Node.js 18+
- Wrangler CLI
- Cloudflare account

### Setup

Run modes

- Local (Free): Uses Miniflare’s local queue simulation. Workers AI still requires login to produce real model output; without login you’ll see “Not logged in” in logs, but the queue flow runs end-to-end.
- Cloud (Paid): Uses real Cloudflare Queues and Workers AI on your account. Requires a paid Workers plan for Queues.

1. Install deps

```bash
yarn install
```

2. Create a Queue and (optionally) a DLQ (production)

```bash
# Create main queue
npx wrangler queues create request-queue

# Optional: create a dead letter queue
npx wrangler queues create request-queue-dlq
```

3. Configure `wrangler.jsonc`

Edit the queue names if you used different names in step 2. The default config expects:

- producer/consumer queue: `request-queue`
- dead letter queue: `request-queue-dlq`

4. Authenticate and run with real services

```bash
# Login interactively (recommended for dev)
npx wrangler login

# Or set a token for non-interactive shells
export CLOUDFLARE_API_TOKEN=...   # least-privilege token

# Use real edge runtime (queues + Workers AI)
npx wrangler dev --remote

# Deploy to Cloudflare
npx wrangler deploy
```

5. Privacy and OSS hygiene

- Never commit secrets or tokens. Use Wrangler secrets or environment variables.
- This repo example does not include any secrets. Avoid adding `.dev.vars` to git.
- For local only, you can create `.dev.vars` (excluded by `.gitignore`) to store non-sensitive vars.

### Usage

Enqueue a chat job (producer):

```bash
curl -X POST "http://127.0.0.1:8787/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session-1",
    "messages": [
      { "role": "user", "content": "Say hello in one sentence." }
    ]
  }'
```

The consumer will receive queue messages and route them to the Agent Durable Object. You can tail logs to observe processing:

```bash
npx wrangler tail
```

### Configuration Notes

- `compatibility_date`: set to 2025-02-11 per repo rules
- `compatibility_flags`: `["nodejs_compat"]`
- Observability enabled with `head_sampling_rate = 1`
- Uses Workers AI by default; adjust `AI_PROVIDER`/keys if you want another provider (OpenAI, Anthropic, etc.)

### Retrieve results (optional KV persistence)

- This example stores the latest agent response per `sessionId` in KV (binding `RESULTS`).
- Fetch the persisted output:

```bash
curl "http://127.0.0.1:8787/result/demo-session-1"
```

Returns:

```json
{ "result": "... assistant text ..." }
```

### Production checklist

- Auth: `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN`).
- Queues: create `request-queue` and optional `request-queue-dlq` (Paid plan required for cloud queues).
- Retries/DLQ: keep `retry_delay` configured; monitor DLQ.
- Persistence: KV (included), or D1/R2 for richer storage.
- Security: no secrets in code; use Wrangler secrets/env vars.
- Observability: `wrangler tail`, dashboard logs, metrics.
- Limits: model usage, queue throughput, DO CPU limits.

Note: Workers AI requires Cloudflare auth even in local dev. Without login you’ll see “Not logged in” in logs.

### Example Payload

```json
{
  "sessionId": "demo-session-1",
  "messages": [
    { "role": "user", "content": "Summarize Cloudflare Queues in one line." }
  ]
}
```
