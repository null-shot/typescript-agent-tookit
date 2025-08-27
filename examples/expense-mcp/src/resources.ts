export const ExpenseResource = {
  name: 'expense',
  properties: {
    id: { type: 'string' },
    user: { type: 'string' },
    amount: { type: 'number' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }
  }
};

export function setupServerResources(server: any, repository: any) {
  // No resources defined for expense-mcp yet.
} 