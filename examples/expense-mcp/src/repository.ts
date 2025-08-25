export type Expense = {
  id: string;
  user: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
};

export class ExpenseRepository {
  private expenses: Map<string, Expense> = new Map();

  constructor() {
    // Using in-memory storage, no DurableObjectState needed
  }

  create(expense: Expense) {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  updateStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    const expense = this.expenses.get(id);
    if (expense) {
      expense.status = status;
      this.expenses.set(id, expense);
    }
    return expense;
  }

  get(id: string) {
    return this.expenses.get(id);
  }

  list() {
    return Array.from(this.expenses.values());
  }

  initializeDatabase() {
    // No-op for in-memory, but matches the MCP pattern
  }
} 