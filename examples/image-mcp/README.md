# 🖼️ Image MCP Example — Cloudflare R2 Integration

This example demonstrates **MCP capabilities integrated with Cloudflare R2 Storage**, using an image management system as a concrete use case.  
It showcases how to build an MCP server that stores image metadata in a **Durable Object SQL database**, and image files in **R2 object storage**.

---

## 🎯 **Purpose: MCP + R2 Demonstration**

This example serves as a **reference implementation** for combining MCP, Durable Object SQL, and Cloudflare R2.

It demonstrates:

- **MCP Tool Integration** — Tools for uploading, listing, retrieving, and searching images  
- **R2 Object Storage** — Store and retrieve binary image objects  
- **Durable Object SQL DB** — Maintain metadata such as name, description, and object key  
- **Search Functionality** — Fuzzy search by name, description, or object key  
- **Production-Ready Setup** — Clear steps for local dev and deployment via Wrangler

---

## ⚙️ **Supported Tools**

| Tool | Description |
|------|--------------|
| `image_list` | List all stored images |
| `image_upload` | Upload image (base64) and metadata |
| `image_retrieve` | Retrieve image by ID |
| `image_search` | Fuzzy search by name, description, or object key |

---

# 🚀 **Quick Start Guide**

Follow this guide to set up the server and test image storage.
This quickstart will walk you through:
- Setting up your local dev environment
- Connecting to an R2 bucket
- Running & testing with MCP Inspector
- Deploying to Cloudflare

---

## 🧑‍💻 **Local Development**

### **Prerequisites**

- Node.js 18+ and `pnpm`
- Installed `wrangler` CLI (`npm install -g wrangler`)

---

### 🧩 **Step 1: Install & Run**

```bash
# 1. Install dependencies
pnpm install

# 2. Start local dev server
pnpm dev

# 3. Run integration tests (optional)
pnpm test
```

---

### 🪣 **Step 2: Create an R2 Bucket**

```bash
pnpm wrangler r2 bucket create mcp-images
```

💡 *Bucket names are global within your account. Keep it simple (letters, numbers, hyphens).*

---

### ⚙️ **Step 3: Configure Wrangler**

Edit your `wrangler.jsonc` and add the R2 bucket binding:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "r2-bucket-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-17",

  "r2_buckets": [
    {
      "bucket_name": "mcp-images",   // your R2 bucket name
      "binding": "IMAGE_BUCKET"      // env binding used by your code
    }
  ],

  "durable_objects": {
    "bindings": [
      {
        "name": "IMAGE_MCP_SERVER",
        "class_name": "ImageMcpServer" 
      }
    ]
  },

  "migrations": [],
  "compatibility_flags": ["nodejs_compat"]
}
```

> 💡 When Wrangler asks about the binding name, type `IMAGE_BUCKET` to match the code.

---

### 🧠 **Step 4: Update TypeScript Env Types**

Remember to run `pnpm run cf-typegen` after you change the `wrangler.json` file

```bash
pnpm run cf-typegen
```

This regenerates your `Env` types so `env.IMAGE_BUCKET` is recognized.

---

### 🧪 **Step 5: Run Locally**

```bash
pnpm dev
```

Expected output:

```
Your Worker has access to the following bindings:
env.IMAGE_BUCKET (mcp-images)  R2 Bucket  local
```

> ⚠️ If `[not connected]` appears, ensure both `wrangler dev` and `mcp server` are running.

---

### 🔍 **Step 6: Test via MCP Inspector**

1. Open MCP Inspector: [http://localhost:6274](http://localhost:6274)  
2. Transport: **SSE**  
3. URL: `http://localhost:8787/sse`  
4. Click **Connect**

Run tools:
- `images_list`
- `images_upload` (base64 or URL)
- `image_retrieve`
- `image_search`

✅ Uploaded objects should appear under **R2 → Dashboard → Bucket: `mcp-images`**

---

## 🧭 **Common Pitfalls & Fixes**

#### ❗ Binding shows `[not connected]`
Re-run `pnpm dev` and confirm SSE URL matches `:8787/sse`.

#### 🔁 Changed Durable Object class name?
Use migrations:

```jsonc
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["ImageMcpServer"] },
  { "tag": "v2", "renamed_classes": [{ "from": "ExampleMcpServer", "to": "ImageMcpServer" }] }
]
```

#### 📦 Upload succeeds but object missing in R2
Ensure `bucket_name` in `wrangler.jsonc` matches your actual R2 bucket.

#### 🧠 TS Error: `Env.IMAGE_BUCKET` missing
Add `IMAGE_BUCKET: R2Bucket` to your `Env` interface and rerun:

```bash
pnpm run cf-typegen
```

---

## ☁️ **Deployment**


### **Deploy to Production**

To deploy to Cloudflare Workers, you'll need:
- Cloudflare Account with **R2** + **Workers** access

```bash
pnpm wrangler login
pnpm wrangler deploy
```

Expected output:

```
SSE: https://<your-worker>.workers.dev/sse
WebSocket: wss://<your-worker>.workers.dev/ws
```

Set the MCP Inspector URL to your deployed SSE endpoint for production testing.

---

## ⚡ **One-Screen TL;DR**

```bash
pnpm wrangler r2 bucket create mcp-images
```

```jsonc
"r2_buckets": [
  { "bucket_name": "mcp-images", "binding": "IMAGE_BUCKET" }
]
```

```ts
interface Env {
  IMAGE_BUCKET: R2Bucket
}
```

```bash
pnpm dev
```

Inspector → `http://localhost:8787/sse`  
Run tools → `images_list`, `images_upload`, `image_retrieve`, `image_search`  
Deploy → `pnpm wrangler deploy`


## 🧭 Project Structure

```
examples/image-mcp-server/
├── src/
│   ├── index.ts        # Worker entrypoint
│   ├── server.ts       # Durable Object with tools
│   ├── bucket.ts       # R2 bucket wrapper
│   ├── repository.ts   # SQL DB and metadata management
│   ├── types.ts        # Shared types
│   └── tools.ts        # MCP tool definitions
├── wrangler.jsonc
├── package.json
└── README.md
```

---

## 📜 License

MIT