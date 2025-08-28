# Expense Tracker MCP Example

This example demonstrates how to build an MCP Server for expense tracking with Cloudflare Workflows integration, following the MCP server standard.

## Features

- Submit an expense (with workflow integration in production)
- Approve or reject an expense
- List all expenses
- Full integration with MCP protocol and tools

## Running Locally

```sh
pnpm install
cd examples/expense-mcp
pnpm dev
# or: npx wrangler dev
```

## Using the MCP Inspector

1. Start your Worker as above.
2. In a new terminal, run:
   ```sh
   npx @modelcontextprotocol/inspector
   ```
3. Open the Inspector at http://localhost:6274 (use the session token if prompted).
4. Set the transport to Streamable HTTP and enter your Worker URL: http://127.0.0.1:8787
5. You will see the following MCP tools:
   - `submitExpense`: Submit a new expense (input: user, amount, description)
   - `approveExpense`: Approve an expense (input: expenseId)
   - `rejectExpense`: Reject an expense (input: expenseId)
   - `listExpenses`: List all expenses (no input)

### Example Output

When you run `listExpenses`, you might see output like this:

```json
Found 3 expenses: [
  {
    "id": "3fee1c6e-1317-48b3-a5d4-7c22bfb5e7bb",
    "user": "ray",
    "amount": 3000,
    "description": "air ticket to Singapore",
    "status": "approved"
  },
  {
    "id": "3f60bc20-4afc-404c-b821-8448d5324bea",
    "user": "ray",
    "amount": 200,
    "description": "dinner",
    "status": "rejected"
  },
  {
    "id": "fee8bf1e-cc0b-40cd-be95-8a8eaabf178f",
    "user": "ray",
    "amount": 1000,
    "description": "hotel in singapore",
    "status": "pending"
  }
]
```

## Testing

Run the integration tests:

```bash
pnpm test
```

The test suite includes 8 comprehensive integration tests that verify:
- MCP client initialization and connection
- Server version compatibility  
- Expense submission, approval, and rejection
- Expense listing and querying
- Error handling for non-existent expenses

All tests complete successfully in ~1 second using the Cloudflare Workers test environment.

## Implementation Notes

- **Storage**: Uses an in-memory store for simplicity. In production, use D1 or KV for persistence.
- **Workflows**: Cloudflare Workflows integration is available in `src/workflow.ts` but disabled during testing to ensure clean test completion.
- **MCP Server**: Core server implementation in `src/server.ts` extends the base MCP Hono server.
- **Tools**: MCP tools for expense operations are defined in `src/tools.ts`.
- **Testing**: Uses the same proven patterns as `crud-mcp` for reliable integration testing. 