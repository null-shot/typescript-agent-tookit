import { describe, it, expect, beforeEach } from 'vitest';
import { ExpenseRepository, type Expense } from '../src/repository';

// Mock DurableObjectState
const mockDurableObjectState = {} as any;

describe('ExpenseRepository Unit Tests', () => {
  let repository: ExpenseRepository;

  beforeEach(() => {
    // Create a fresh repository for each test with mock DurableObjectState
    repository = new ExpenseRepository(mockDurableObjectState);
  });

  it('should create an expense successfully', () => {
    const expense: Expense = {
      id: 'test-id-1',
      user: 'emp123',
      amount: 100.50,
      description: 'Test expense',
      status: 'pending'
    };

    const createdExpense = repository.create(expense);

    expect(createdExpense).toBeDefined();
    expect(createdExpense.id).toBe('test-id-1');
    expect(createdExpense.amount).toBe(100.50);
    expect(createdExpense.description).toBe('Test expense');
    expect(createdExpense.user).toBe('emp123');
    expect(createdExpense.status).toBe('pending');
  });

  it('should list all expenses', () => {
    // Create some test expenses
    const expense1: Expense = {
      id: 'test-id-1',
      user: 'emp1',
      amount: 50.00,
      description: 'Expense 1',
      status: 'pending'
    };

    const expense2: Expense = {
      id: 'test-id-2',
      user: 'emp2',
      amount: 75.00,
      description: 'Expense 2',
      status: 'pending'
    };

    repository.create(expense1);
    repository.create(expense2);

    const expenses = repository.list();
    expect(expenses).toHaveLength(2);
    expect(expenses[0].amount).toBe(50.00);
    expect(expenses[1].amount).toBe(75.00);
  });

  it('should get an expense by id', () => {
    const expense: Expense = {
      id: 'test-id-1',
      user: 'emp123',
      amount: 200.00,
      description: 'Get test',
      status: 'pending'
    };

    repository.create(expense);

    const retrievedExpense = repository.get('test-id-1');
    expect(retrievedExpense).toBeDefined();
    expect(retrievedExpense?.id).toBe('test-id-1');
    expect(retrievedExpense?.amount).toBe(200.00);
    expect(retrievedExpense?.description).toBe('Get test');
  });

  it('should return undefined for non-existent expense', () => {
    const result = repository.get('non-existent-id');
    expect(result).toBeUndefined();
  });

  it('should update expense status to approved', () => {
    const expense: Expense = {
      id: 'test-id-1',
      user: 'emp123',
      amount: 200.00,
      description: 'Approval test',
      status: 'pending'
    };

    repository.create(expense);

    const updatedExpense = repository.updateStatus('test-id-1', 'approved');
    expect(updatedExpense).toBeDefined();
    expect(updatedExpense?.status).toBe('approved');

    const retrievedExpense = repository.get('test-id-1');
    expect(retrievedExpense?.status).toBe('approved');
  });

  it('should update expense status to rejected', () => {
    const expense: Expense = {
      id: 'test-id-1',
      user: 'emp456',
      amount: 300.00,
      description: 'Rejection test',
      status: 'pending'
    };

    repository.create(expense);

    const updatedExpense = repository.updateStatus('test-id-1', 'rejected');
    expect(updatedExpense).toBeDefined();
    expect(updatedExpense?.status).toBe('rejected');

    const retrievedExpense = repository.get('test-id-1');
    expect(retrievedExpense?.status).toBe('rejected');
  });

  it('should return undefined when updating non-existent expense', () => {
    const result = repository.updateStatus('non-existent-id', 'approved');
    expect(result).toBeUndefined();
  });

  it('should filter expenses by status', () => {
    // Create expenses with different statuses
    const expense1: Expense = {
      id: 'test-id-1',
      user: 'emp1',
      amount: 100,
      description: 'Pending expense',
      status: 'pending'
    };

    const expense2: Expense = {
      id: 'test-id-2',
      user: 'emp2',
      amount: 200,
      description: 'To be approved',
      status: 'pending'
    };

    repository.create(expense1);
    repository.create(expense2);
    repository.updateStatus('test-id-2', 'approved');

    const allExpenses = repository.list();
    const pendingExpenses = allExpenses.filter(e => e.status === 'pending');
    const approvedExpenses = allExpenses.filter(e => e.status === 'approved');

    expect(pendingExpenses).toHaveLength(1);
    expect(approvedExpenses).toHaveLength(1);
    expect(pendingExpenses[0].id).toBe('test-id-1');
    expect(approvedExpenses[0].id).toBe('test-id-2');
  });
});