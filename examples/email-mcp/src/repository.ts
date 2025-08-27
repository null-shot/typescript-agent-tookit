import { D1Database } from 'cloudflare:workers';
import { EMAILS_SQL, Email, emailSchema, EmailFilter } from './schema';

export class EmailRepository {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async initializeDatabase(): Promise<void> {
    try {
      await this.db.exec(EMAILS_SQL);
      console.log('D1: emails schema ensured');
    } catch (err) {
      console.error('D1 schema init error', err);
      throw err;
    }
  }

  async createEmail(email: Email): Promise<void> {
    const stmt = `
      INSERT INTO emails (
        id, from_addr, to_addr, subject, text, raw_size, received_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      email.id,
      email.from_addr,
      email.to_addr,
      email.subject,
      email.text,
      email.raw_size,
      email.received_at,
      email.created_at,
      email.updated_at,
    ];

    try {
      await this.db.prepare(stmt).bind(...params).run();
    } catch (err) {
      console.error('createEmail error:', err);
      throw new Error(`Failed to insert email: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getEmailById(id: string): Promise<Email | null> {
    const stmt = `SELECT * FROM emails WHERE id = ? LIMIT 1`;
    try {
      const res = await this.db.prepare(stmt).bind(id).first<Email | undefined>();
      if (!res) return null;
      return emailSchema.parse(res);
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
      const res = await this.db.prepare(sql).bind(...params).all<Email>();
      const rows = res?.results ?? [];
      return rows.map((r) => emailSchema.parse(r));
    } catch (err) {
      console.error('listEmails error:', err);
      throw new Error(`Failed to list emails: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}