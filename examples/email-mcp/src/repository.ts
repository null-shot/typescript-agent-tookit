import { EMAILS_SQL, Email, emailSchema, EmailFilter } from './schema';

export class EmailRepository {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }

  initializeDatabase(): void {
    try {
      this.ctx.storage.sql.exec(EMAILS_SQL);
      console.log('Durable Object SQL: emails schema ensured');
    } catch (err) {
      console.error('Durable Object SQL schema init error', err);
      throw err;
    }
  }

  async createEmail(email: Email): Promise<void> {
    const stmt = `
      INSERT INTO emails (
        id, from_addr, to_addr, subject, text, raw_size, received_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await this.ctx.storage.sql.exec(stmt,
        email.id,
        email.from_addr,
        email.to_addr,
        email.subject,
        email.text,
        email.raw_size,
        email.received_at,
        email.created_at,
        email.updated_at
      );
    } catch (err) {
      console.error('createEmail error:', err);
      throw new Error(`Failed to insert email: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getEmailById(id: string): Promise<Email | null> {
    const stmt = `SELECT * FROM emails WHERE id = ? LIMIT 1`;
    try {
      const results = await this.ctx.storage.sql.exec(stmt, id);
      
      // Convert SQLite results to an array we can work with
      const rows = [];
      for (const row of results) {
        rows.push(row);
      }
      
      if (rows.length === 0) {
        return null;
      }
      
      return emailSchema.parse(rows[0]);
    } catch (err) {
      console.error('getEmailById error:', err);
      throw new Error(`Failed to get email: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async listEmails(filters: EmailFilter): Promise<Email[]> {
    const {
      search_text,
      limit = 20,
      offset = 0,
      sort_by = 'received_at',
      sort_direction = 'desc',
    } = filters;

    const clauses: string[] = [];
    const params: any[] = [];

    if (search_text) {
      clauses.push('(from_addr LIKE ? OR to_addr LIKE ? OR subject LIKE ? OR text LIKE ?)');
      const like = `%${search_text}%`;
      params.push(like, like, like, like);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM emails
      ${where}
      ORDER BY ${sort_by} ${sort_direction}
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    try {
      const results = await this.ctx.storage.sql.exec(sql, ...params);
      
      // Convert SQLite results to an array we can work with
      const rows = [];
      for (const row of results) {
        rows.push(row);
      }
      
      return rows.map((r) => emailSchema.parse(r));
    } catch (err) {
      console.error('listEmails error:', err);
      throw new Error(`Failed to list emails: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}