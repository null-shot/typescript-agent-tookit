# Image MCP Server Example (Cloudflare R2 Integration)

An MCP server that manages image metadata in a SQL database  
and stores image objects in a Cloudflare R2 bucket.

Supports:
- `image_list` — view all stored images
- `image_upload` — store image (base64) and metadata
- `image_retrieve` — fetch image by ID
- `image_search` — fuzzy search by name, description, or object key

# Develoment
1. Install
`pnpm install`

2. Run local dev server
`pnpm dev`

3. Run integration tests
`pnpm test`

3. Deploy `wrangler login` `pnpm deploy`


# Configure R2 bucket with **Wrangler** Configuration file

## 1) Create an R2 bucket

### Create a bucket (choose any name you like)
```
pnpm wrangler r2 bucket create mcp-images
```

💡 Tip: Bucket names are global within your account. Keep it simple (letters, numbers, hyphen).

## 2) Bind the bucket in wrangler.jsonc

Add (or edit) the r2_buckets section. The binding is the variable you’ll read in code via env.<binding>.
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "r2-bucket-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-17",

  // 👇 add this block (or append to your existing array)
  "r2_buckets": [
    {
      "bucket_name": "mcp-images",     // your R2 bucket name
      "binding": "IMAGE_BUCKET"        // the env binding used by your code
    }
  ],

  "durable_objects": {
    "bindings": [
      { "name": "IMAGE_MCP_SERVER", "class_name": "ImageMcpServer" }
    ]
  },

  "migrations": [
    // … your existing DO migrations …
  ],

  "compatibility_flags": ["nodejs_compat"]
}
```

Which binding name should I choose?Anything is fine; we use IMAGE_BUCKET. If Wrangler asks:

* Yes → Wrangler inserts the block for you.

* Yes, but let me choose → Type IMAGE_BUCKET to match the code.


## 3) Update type your Env (so TS knows about the binding)
If you use Wrangler typegen, run: pnpm wrangler types(Regenerates the ambient types used by your Worker.)

## 4) Run locally
```
pnpm dev
```

Wrangler should print:
```
Your Worker has access to the following bindings:
env.IMAGE_BUCKET (mcp-images)  R2 Bucket  local
```

If you see [not connected] for a binding, ensure both dev processes are running.To persist Durable Object state across reloads:
```
pnpm wrangler dev --persist-to .wrangler/state
```

## 6) Verify with MCP Inspector

Open `http://localhost:6274`

Transport: SSE

URL: `http://localhost:8787/sse`

Click **Connect**

Run these tools:
* **images_list**

* **images_upload** (base64 or URL)

* **image_retrieve**

* **image_search**

✅ You should see objects appear in R2 (Dashboard → R2 → your bucket).

## 7) Deploy to production
Login your cloudflare account
```
pnpm wrangler login
```

Then deploy with the deploy command
```
pnpm wrangler deploy
```

After deploy:
```
SSE: https://<your-worker>.workers.dev/sse
WebSocket: wss://<your-worker>.workers.dev/ws
```

Point the Inspector to the deployed SSE URL if testing production.

## 8) Common pitfalls

### ❗ Service binding [not connected]

Re-run pnpm dev and ensure SSE URL matches :8787/sse.

### 🔁 Changed Durable Object class name?

Use migrations → rename_class. To wipe data: deleted_classes → new_sqlite_classes in a later tag.

Eaxmple
```
migrations": [
  { 
    "tag": "v1",
      "new_sqlite_classes": [
      "ExampleMcpServer"
    ]
  },
  {
    "tag": "v2",
    "renamed_classes": [
      {
        "from": "ExampleMcpServer",
        "to": "ImageMcpServer"
      }
    ]
  }
]
```

### 📦 Uploads succeed but no objects in R2

Confirm bucket name in wrangler.jsonc matches your actual R2 bucket.

### 🧠 TypeScript says Env.IMAGE_BUCKET missing

Add to Env interface and regenerate types with `pnpm wrangler types`

### 🧭 One-screen TL;DR

```pnpm wrangler r2 bucket create mcp-images```

Add to wrangler.jsonc:
```
"r2_buckets": [
  { "bucket_name": "mcp-images", "binding": "IMAGE_BUCKET" }
]
```

Add to `Env`: `IMAGE_BUCKET: R2Bucket`

Run locally → `pnpm dev` → Connect Inspector → `http://localhost:8787/sse`

Test tools → `images_list`, `images_upload`, `image_retrieve` `image_search`

Deploy → `pnpm wrangler deploy`

