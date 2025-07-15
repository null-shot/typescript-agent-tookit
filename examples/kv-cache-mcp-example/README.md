# kv-cache-mcp-example

This is a minimal example project demonstrating how to build an MCP-compatible Worker using the `@modelcontextprotocol/sdk` and KV storage for basic caching behavior.

✅ Uses the base `McpServer` class from the MCP SDK  
✅ Uses KV properly as a cache (not summary storage)  
✅ No local file dependencies — works out of the box with `npm install`

---

## 🛠 Features
- `POST /cache/set`: Store a value by key
- `GET /cache/get?key=`: Retrieve a value
- `POST /cache/delete`: Delete a value

---

## 📁 Project Structure

```
/examples/kv-cache-mcp-example/
├── src/
│   ├── index.ts         # Entrypoint: handles requests via handleMcpRequest()
│   └── server.ts        # KVMemoryMcpServer extending McpServer
├── wrangler.toml        # Cloudflare Worker config (KV binding)
├── package.json         # No local deps, MCP SDK via GitHub
└── README.md            # Project overview and usage
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start local dev server
```bash
npx wrangler dev
```

### 3. Test with `curl`
```bash
# Set a value
curl -X POST http://localhost:8787/cache/set \
  -H "Content-Type: application/json" \
  -d '{"key": "foo", "value": "bar"}'

# Get the value
curl http://localhost:8787/cache/get?key=foo

# Delete the value
curl -X POST http://localhost:8787/cache/delete \
  -H "Content-Type: application/json" \
  -d '{"key": "foo"}'
```

---

## 🔒 Notes
- This example is built for recruiter review.
- It extends the base MCP server and uses the correct KV caching pattern.
- You can clone this repo and run the example directly without any local workspaces or symlinks.

---

## 📄 License
MIT
