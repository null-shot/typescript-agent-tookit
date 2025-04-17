import { Todo, TodoStatus, TODO_SCHEMA, rowToTodo, todoToRow } from './schema';

/**
 * Repository class for handling all todo database operations
 */
export class TodoRepository {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  /**
   * Initialize the SQLite database with the todo schema
   */
  public initializeDatabase(): void {
    try {
      // Execute the SQL schema
      this.ctx.storage.sql.exec(TODO_SCHEMA);
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  }

  /**
   * Create a new todo item
   */
  public async createTodo(todo: Todo): Promise<void> {
    try {
      await this.ctx.storage.sql.exec(`
        INSERT INTO todos (id, title, description, status, due_date)
        VALUES (?, ?, ?, ?, ?)
      `,
        todo.id, todo.title, todo.description, todo.status, todo.due_date
      );
    } catch (error) {
      console.error("Error creating todo:", error);
      throw new Error(`Failed to create todo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a todo by ID
   */
  public async getTodoById(id: string): Promise<Todo | null> {
    try {
      const results = await this.ctx.storage.sql.exec(`
        SELECT * FROM todos WHERE id = ?
      `, [id]);
      
      // Convert SQLite results to an array we can work with
      const rows = [];
      for (const row of results) {
        rows.push(row);
      }
      
      if (rows.length === 0) {
        return null;
      }
      
      return rowToTodo(rows[0]);
    } catch (error) {
      console.error("Error fetching todo:", error);
      throw new Error(`Failed to fetch todo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a todo item
   */
  public async updateTodo(todo: Partial<Todo> & { id: string }): Promise<void> {
    try {
      // Check if todo exists first
      const existingTodo = await this.getTodoById(todo.id);
      if (!existingTodo) {
        throw new Error(`Todo with id ${todo.id} not found`);
      }
      
      // Update the timestamp
      const now = new Date().toISOString();
      
      // Build the complete todo object, using existing values where not provided
      const updatedTodo = {
        ...existingTodo,
        title: todo.title !== undefined ? todo.title : existingTodo.title,
        description: todo.description !== undefined ? todo.description : existingTodo.description,
        status: todo.status !== undefined ? todo.status : existingTodo.status,
        due_date: todo.due_date !== undefined ? todo.due_date : existingTodo.due_date,
        updated_at: now
      };
      
      // Use a simple static query with fixed parameter order
      // Pass parameters individually, not as an array
      await this.ctx.storage.sql.exec(`
        UPDATE todos 
        SET title = ?, 
            description = ?, 
            status = ?, 
            due_date = ?, 
            updated_at = ? 
        WHERE id = ?
      `, 
        updatedTodo.title,
        updatedTodo.description, 
        updatedTodo.status, 
        updatedTodo.due_date, 
        updatedTodo.updated_at, 
        updatedTodo.id
      );
      
    } catch (error) {
      console.error("Error updating todo:", error);
      throw new Error(`Failed to update todo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a todo by ID
   */
  public async deleteTodoById(id: string): Promise<void> {
    try {
      await this.ctx.storage.sql.exec(`
        DELETE FROM todos WHERE id = ?
      `, [id]);
    } catch (error) {
      console.error("Error deleting todo:", error);
      throw new Error(`Failed to delete todo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List todos with filtering and pagination
   */
  public async listTodos(filters: {
    status?: TodoStatus | null;
    due_date_start?: string | null;
    due_date_end?: string | null;
    search_text?: string | null;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_direction?: string;
  }): Promise<Todo[]> {
    try {
      const {
        status, 
        due_date_start, 
        due_date_end, 
        search_text,
        limit = 10,
        offset = 0,
        sort_by = 'created_at',
        sort_direction = 'desc'
      } = filters;

      let query = `SELECT * FROM todos WHERE 1=1`;
      const params: any[] = [];
      
      // Add filter conditions
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }
      
      if (due_date_start) {
        query += ` AND due_date >= ?`;
        params.push(due_date_start);
      }
      
      if (due_date_end) {
        query += ` AND due_date <= ?`;
        params.push(due_date_end);
      }
      
      if (search_text) {
        query += ` AND (title LIKE ? OR description LIKE ?)`;
        const searchPattern = `%${search_text}%`;
        params.push(searchPattern, searchPattern);
      }
      
      // Add sorting
      query += ` ORDER BY ${sort_by} ${sort_direction}`;
      
      // Add pagination
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const results = await this.ctx.storage.sql.exec(query, params);
      
      // Convert SQLite results to an array we can work with
      const rows = [];
      for (const row of results) {
        rows.push(row);
      }
      
      return rows.map((row: any) => rowToTodo(row));
    } catch (error) {
      console.error("Error listing todos:", error);
      throw new Error(`Failed to list todos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get todos due today
   */
  public async getTodaysTodos(options: {
    status?: TodoStatus | null;
    sort_by?: string;
    sort_direction?: string;
  }): Promise<Todo[]> {
    try {
      const {
        status,
        sort_by = 'created_at',
        sort_direction = 'asc'
      } = options;
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
      
      let query = `SELECT * FROM todos WHERE due_date >= ? AND due_date < ?`;
      const params: any[] = [today, tomorrow]; // Match dates between today and tomorrow
      
      // Filter by status if provided
      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      } else {
        // Default to non-completed status
        query += ` AND status IN (?, ?)`;
        params.push(TodoStatus.NOT_STARTED, TodoStatus.IN_PROGRESS);
      }
      
      // Add sorting
      query += ` ORDER BY ${sort_by} ${sort_direction}`;
      
      const results = await this.ctx.storage.sql.exec(query, params);
      
      // Convert SQLite results to an array we can work with
      const rows = [];
      for (const row of results) {
        rows.push(row);
      }
      
      return rows.map((row: any) => rowToTodo(row));
    } catch (error) {
      console.error("Error getting today's todos:", error);
      throw new Error(`Failed to get today's todos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get todo statistics
   */
  public async getTodoStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    completionRate: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          status, 
          COUNT(*) as count 
        FROM todos 
        GROUP BY status
      `;
      
      const statsResults = await this.ctx.storage.sql.exec(statsQuery);
      
      const totalQuery = `SELECT COUNT(*) as total FROM todos`;
      const totalResults = await this.ctx.storage.sql.exec(totalQuery);
      
      const completedQuery = `
        SELECT COUNT(*) as completed 
        FROM todos 
        WHERE status = ?
      `;
      const completedResults = await this.ctx.storage.sql.exec(completedQuery, [TodoStatus.COMPLETED]);
      
      // Process results
      const statsRows = [];
      for (const row of statsResults) {
        statsRows.push(row);
      }
      
      const totalRows = [];
      for (const row of totalResults) {
        totalRows.push(row);
      }
      
      const completedRows = [];
      for (const row of completedResults) {
        completedRows.push(row);
      }
      
      const stats: Record<string, number> = {};
      let total = 0;
      
      if (totalRows.length > 0) {
        total = Number(totalRows[0].total) || 0;
      }
      
      statsRows.forEach((row: any) => {
        stats[row.status] = Number(row.count) || 0;
      });
      
      const completed = completedRows.length > 0 ? Number(completedRows[0].completed) || 0 : 0;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      
      return {
        total,
        byStatus: stats,
        completionRate: Math.round(completionRate * 100) / 100
      };
    } catch (error) {
      console.error("Error getting todo stats:", error);
      throw new Error(`Failed to get todo stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 