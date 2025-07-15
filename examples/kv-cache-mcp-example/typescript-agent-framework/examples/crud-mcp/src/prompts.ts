import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function setupServerPrompts(server: McpServer) {
  // Introduction prompt - No arguments needed
  server.prompt(
    'introduction',
    'Learn about the Todo service and how to use it',
    () => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `Welcome to the Todo Service! This service helps you manage your tasks effectively.

Here's what you can do:
1. Create new todos with titles, descriptions, and due dates
2. List and filter your todos
3. Update existing todos
4. Mark todos as completed
5. Delete todos
6. View todo statistics

Would you like to:
- "Create a new todo" - I'll help you create a new task
- "Show my todos" - I'll list your current todos
- "Show today's todos" - I'll show tasks due today
- "View todo stats" - I'll show you statistics about your todos
- "Learn about filters" - I'll explain how to filter and sort todos`
        }
      }]
    })
  );

  // Create todo prompt with arguments schema
  server.prompt(
    'create_todo_help',
    'Learn how to create a new todo',
    {
      title: z.string().optional().describe('Example title to use in the explanation'),
      description: z.string().optional().describe('Example description to use in the explanation')
    },
    ({ title = 'Complete project report', description = 'Write final project report for Q1' }) => ({
      messages: [{
        role: 'assistant',
        content: {
          type: 'text',
          text: `To create a new todo, you'll need to provide:
- A title (required)
- A description (required)
- A status (optional: not_started, in_progress, completed, canceled)
- A due date (optional)

Example:
"Create a todo with title '${title}' and description '${description}' due on '2024-03-20'"

The todo will be created with a unique ID and timestamps.`
        }
      }]
    })
  );

  // List todos prompt with arguments schema
  server.prompt(
    'list_todos_help',
    'Learn how to list and filter todos',
    {
      filter: z.enum(['status', 'date', 'search', 'sorting']).optional()
        .describe('Type of filter to get specific help about')
    },
    ({ filter }) => {
      let filterText = '';
      if (filter === 'status') {
        filterText = `Status filter examples:
- "Show all completed todos"
- "Show in-progress todos"
- "List not started tasks"`;
      } else if (filter === 'date') {
        filterText = `Date filter examples:
- "Show todos due this week"
- "Show todos due today"
- "List tasks due next month"`;
      } else if (filter === 'search') {
        filterText = `Search examples:
- "Find todos containing 'project'"
- "Search for todos with 'urgent' in title"
- "List todos mentioning 'meeting'"`;
      } else if (filter === 'sorting') {
        filterText = `Sorting examples:
- "Show todos sorted by due date"
- "Show newest todos first"
- "List todos by priority"`;
      }

      return {
        messages: [{
          role: 'assistant',
          content: {
            type: 'text',
            text: filter ? filterText : `You can list todos with various filters:

1. Status filter:
   "Show all completed todos"
   "Show in-progress todos"

2. Date filter:
   "Show todos due this week"
   "Show todos due today"

3. Search:
   "Find todos containing 'project'"

4. Sorting:
   "Show todos sorted by due date"
   "Show newest todos first"

You can combine these filters:
"Show completed todos sorted by due date"
"Find urgent todos due this week"

Tip: Use the filter parameter to get specific examples for each type of filter.`
          }
        }]
      };
    }
  );

  // Update todo prompt with arguments schema
  server.prompt(
    'update_todo_help',
    'Learn how to update existing todos',
    {
      field: z.enum(['title', 'description', 'status', 'due_date']).optional()
        .describe('Specific field to get help about updating')
    },
    ({ field }) => {
      let fieldText = '';
      if (field === 'title') {
        fieldText = `To update a todo's title:
"Update todo <id> with new title 'Updated report deadline'"`;
      } else if (field === 'description') {
        fieldText = `To update a todo's description:
"Update todo <id> description to 'New detailed description of the task'"`;
      } else if (field === 'status') {
        fieldText = `To update a todo's status:
"Mark todo <id> as completed"
"Set todo <id> status to in_progress"`;
      } else if (field === 'due_date') {
        fieldText = `To update a todo's due date:
"Change due date of todo <id> to next Friday"
"Set todo <id> deadline to 2024-03-20"`;
      }

      return {
        messages: [{
          role: 'assistant',
          content: {
            type: 'text',
            text: field ? fieldText : `You can update any of these fields in a todo:
- Title
- Description
- Status
- Due date

Examples:
"Update todo <id> with new title 'Updated report deadline'"
"Mark todo <id> as completed"
"Change due date of todo <id> to next Friday"

You'll need the todo's ID to update it. You can get this by listing your todos first.

Tip: Use the field parameter to get specific examples for updating each field.`
          }
        }]
      };
    }
  );

  // Statistics prompt with arguments schema
  server.prompt(
    'statistics_help',
    'Learn about todo statistics',
    {
      metric: z.enum(['total', 'by_status', 'overdue', 'upcoming', 'completion_rate']).optional()
        .describe('Specific metric to get information about')
    },
    ({ metric }) => {
      let metricText = '';
      if (metric === 'total') {
        metricText = `To see total todos:
"Show total number of todos"
"How many todos do I have?"`;
      } else if (metric === 'by_status') {
        metricText = `To see todos by status:
"Show number of completed todos"
"How many todos are in progress?"`;
      } else if (metric === 'overdue') {
        metricText = `To see overdue todos:
"Show overdue todos"
"How many todos are past due?"`;
      } else if (metric === 'upcoming') {
        metricText = `To see upcoming deadlines:
"Show upcoming deadlines"
"What todos are due soon?"`;
      } else if (metric === 'completion_rate') {
        metricText = `To see completion rates:
"What's my completion rate?"
"Show my todo completion statistics"`;
      }

      return {
        messages: [{
          role: 'assistant',
          content: {
            type: 'text',
            text: metric ? metricText : `The todo statistics show you:
- Total number of todos
- Number of todos by status
- Overdue todos
- Upcoming deadlines
- Completion rates

Try:
"Show my todo statistics"
"How many todos are overdue?"
"What's my completion rate?"

Tip: Use the metric parameter to get specific examples for each type of statistic.`
          }
        }]
      };
    }
  );

  // Error handling prompt with arguments schema
  server.prompt(
    'error_handling',
    'Common errors and how to resolve them',
    {
      error_type: z.enum(['not_found', 'invalid_status', 'invalid_date', 'other']).optional()
        .describe('Specific error type to get help about')
    },
    ({ error_type }) => {
      let errorText = '';
      if (error_type === 'not_found') {
        errorText = `When you see "Todo not found":
- Make sure you're using the correct todo ID
- List your todos to see available IDs
- Try "Show my todos" to verify the todo exists`;
      } else if (error_type === 'invalid_status') {
        errorText = `When you see "Invalid status":
- Use one of: not_started, in_progress, completed, canceled
- Example: "Mark todo <id> as completed"`;
      } else if (error_type === 'invalid_date') {
        errorText = `When you see "Invalid date format":
- Use YYYY-MM-DD format for dates
- Example: 2024-03-20
- Or use relative dates like "next Friday"`;
      }

      return {
        messages: [{
          role: 'assistant',
          content: {
            type: 'text',
            text: error_type ? errorText : `Common errors you might encounter:

1. "Todo not found"
   - Make sure you're using the correct todo ID
   - List your todos to see available IDs

2. "Invalid status"
   - Use one of: not_started, in_progress, completed, canceled

3. "Invalid date format"
   - Use YYYY-MM-DD format for dates
   - Example: 2024-03-20

If you encounter any other errors, try:
"Show my todos" to verify the todo exists
"Learn about filters" to see correct filter formats

Tip: Use the error_type parameter to get specific help for each type of error.`
          }
        }]
      };
    }
  );
} 