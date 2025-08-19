import initSqlJs, { Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface Package {
  id: number;
  uniqueName: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  installedAt: string;
}

export interface PackageRepository {
  create(data: Omit<Package, "id" | "installedAt">): Promise<Package>;
  findByUniqueName(uniqueName: string): Promise<Package | null>;
  findAll(): Promise<Package[]>;
  updateByUniqueName(
    uniqueName: string,
    data: Partial<Omit<Package, "id" | "uniqueName" | "installedAt">>
  ): Promise<Package | null>;
  deleteByUniqueName(uniqueName: string): Promise<boolean>;
  count(): Promise<number>;
}

class SqlJsPackageRepository implements PackageRepository {
  private db!: Database;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    // Ensure directory exists
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const filebuffer = readFileSync(this.dbPath);
      this.db = new SQL.Database(filebuffer);
    } else {
      this.db = new SQL.Database();
    }

    // Create table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uniqueName TEXT UNIQUE NOT NULL,
        command TEXT NOT NULL,
        args TEXT NOT NULL,
        env TEXT NOT NULL,
        installedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.saveDatabase();
    this.initialized = true;
  }

  private saveDatabase() {
    const data = this.db.export();
    writeFileSync(this.dbPath, data);
  }

  async create(data: Omit<Package, "id" | "installedAt">): Promise<Package> {
    await this.ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT INTO packages (uniqueName, command, args, env)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run([
      data.uniqueName,
      data.command,
      JSON.stringify(data.args),
      JSON.stringify(data.env),
    ]);

    const selectStmt = this.db.prepare(
      "SELECT * FROM packages WHERE id = last_insert_rowid()"
    );
    const result = selectStmt.getAsObject();

    if (!result || result.length === 0) {
      throw new Error("Failed to create package");
    }

    const row = result[0] as any;

    this.saveDatabase();

    return {
      id: row.id as number,
      uniqueName: row.uniqueName as string,
      command: row.command as string,
      args: JSON.parse(row.args as string),
      env: JSON.parse(row.env as string),
      installedAt: row.installedAt as string,
    };
  }

  async findByUniqueName(uniqueName: string): Promise<Package | null> {
    await this.ensureInitialized();

    const stmt = this.db.prepare("SELECT * FROM packages WHERE uniqueName = ?");
    const result = stmt.getAsObject([uniqueName]);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0] as any;

    return {
      id: row.id as number,
      uniqueName: row.uniqueName as string,
      command: row.command as string,
      args: JSON.parse(row.args as string),
      env: JSON.parse(row.env as string),
      installedAt: row.installedAt as string,
    };
  }

  async findAll(): Promise<Package[]> {
    await this.ensureInitialized();

    const stmt = this.db.prepare(
      "SELECT * FROM packages ORDER BY installedAt DESC"
    );
    const result = stmt.getAsObject();

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((row: any) => ({
      id: row.id,
      uniqueName: row.uniqueName,
      command: row.command,
      args: JSON.parse(row.args),
      env: JSON.parse(row.env),
      installedAt: row.installedAt,
    }));
  }

  async updateByUniqueName(
    uniqueName: string,
    data: Partial<Omit<Package, "id" | "uniqueName" | "installedAt">>
  ): Promise<Package | null> {
    await this.ensureInitialized();

    // Build dynamic UPDATE query based on provided fields
    const fields = [];
    const values = [];

    if (data.command !== undefined) {
      fields.push("command = ?");
      values.push(data.command);
    }
    if (data.args !== undefined) {
      fields.push("args = ?");
      values.push(JSON.stringify(data.args));
    }
    if (data.env !== undefined) {
      fields.push("env = ?");
      values.push(JSON.stringify(data.env));
    }

    if (fields.length === 0) {
      // No fields to update
      return await this.findByUniqueName(uniqueName);
    }

    // Add the uniqueName for the WHERE clause
    values.push(uniqueName);

    const updateSql = `UPDATE packages SET ${fields.join(
      ", "
    )} WHERE uniqueName = ?`;
    const stmt = this.db.prepare(updateSql);
    stmt.run(values);

    this.saveDatabase();

    if (this.db.getRowsModified() === 0) {
      return null; // Package not found
    }

    // Return the updated package
    return await this.findByUniqueName(uniqueName);
  }

  async deleteByUniqueName(uniqueName: string): Promise<boolean> {
    await this.ensureInitialized();

    const stmt = this.db.prepare("DELETE FROM packages WHERE uniqueName = ?");
    stmt.run([uniqueName]);

    this.saveDatabase();
    return this.db.getRowsModified() > 0;
  }

  async count(): Promise<number> {
    await this.ensureInitialized();

    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM packages");
    const result = stmt.getAsObject();

    if (!result || result.length === 0) {
      return 0;
    }

    const row = result[0] as any;
    return row.count as number;
  }
}

export function createPackageRepository(
  type: "sqlite",
  dbPath?: string
): PackageRepository {
  if (type === "sqlite") {
    return new SqlJsPackageRepository(dbPath || "./data/packages.db");
  }
  throw new Error(`Unsupported repository type: ${type}`);
}
