export const ExpenseResource = {
  name: "expense",
  properties: {
    id: { type: "string" },
    user: { type: "string" },
    amount: { type: "number" },
    description: { type: "string" },
    status: { type: "string", enum: ["pending", "approved", "rejected"] },
  },
};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ExpenseRepository } from "./repository";

export function setupServerResources(
  server: McpServer,
  repository: ExpenseRepository
) {
  // No resources defined for expense-mcp yet.
}
