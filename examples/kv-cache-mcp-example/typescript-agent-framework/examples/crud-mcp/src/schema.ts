import { z, ZodRawShape } from 'zod';

// Enum for Todo statuses
export enum TodoStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELED = "canceled"
}

// Zod schema for TodoStatus
export const todoStatusSchema = z.enum([
  TodoStatus.NOT_STARTED,
  TodoStatus.IN_PROGRESS,
  TodoStatus.COMPLETED,
  TodoStatus.CANCELED
]);

// Raw schema shapes for MCP server tool definitions
export const schemas = {
  // Input schema for creating/updating todos
  todoInput: {
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    status: todoStatusSchema.optional(),
    due_date: z.string().optional()
  },
  
  // Schema for a complete Todo
  todo: {
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    status: todoStatusSchema,
    due_date: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
  },
  
  // Common smaller schemas
  id: { 
    id: z.string().uuid() 
  },
  
  // Schema for filtering todos
  todoFilter: {
    status: todoStatusSchema.optional(),
    due_date_start: z.string().optional(),
    due_date_end: z.string().optional(),
    search_text: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(10),
    offset: z.number().int().min(0).default(0),
    sort_by: z.enum(['title', 'due_date', 'created_at', 'updated_at']).default('created_at'),
    sort_direction: z.enum(['asc', 'desc']).default('desc')
  }
};

// Zod schema objects for validation
export const todoInputSchema = z.object(schemas.todoInput);
export const todoSchema = z.object(schemas.todo);
export const todoFilterSchema = z.object(schemas.todoFilter);

// TypeScript types inferred from Zod schemas
export type Todo = z.infer<typeof todoSchema>;
export type TodoInput = z.infer<typeof todoInputSchema>;
export type TodoFilter = z.infer<typeof todoFilterSchema>;

// SQL Schema
export const TODO_SCHEMA = `
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  due_date DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

// Converter functions for database rows and Todo objects
export function rowToTodo(row: any): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TodoStatus,
    due_date: row.due_date,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

export function todoToRow(todo: Todo): any {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    due_date: todo.due_date,
    created_at: todo.created_at,
    updated_at: todo.updated_at
  };
}