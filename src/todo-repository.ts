/**
 * Update a todo item
 */
public async updateTodo(todo: Partial<Todo> & { id: string }): Promise<void> {
  try {
    // Use a simpler approach with fixed field updates
    const now = new Date().toISOString();
    
    // Get current todo to merge with updates
    const currentTodo = await this.getTodoById(todo.id);
    if (!currentTodo) {
      throw new Error(`Todo with id ${todo.id} not found`);
    }
    
    // Update with new values, defaulting to current values if not provided
    const query = `
      UPDATE todos
      SET title = ?, description = ?, status = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `;
    
    const params = [
      todo.title ?? currentTodo.title,
      todo.description ?? currentTodo.description,
      todo.status ?? currentTodo.status,
      todo.due_date ?? currentTodo.due_date,
      now,
      todo.id
    ];
    
    await this.ctx.storage.sql.exec(query, params);
  } catch (error) {
    console.error("Error updating todo:", error);
    throw new Error(`Failed to update todo: ${error instanceof Error ? error.message : String(error)}`);
  }
} 