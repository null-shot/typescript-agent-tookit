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

    const SQL = await initSqlJs({
      locateFile: (file) => {
        // In bundled/production mode, the WASM file is in the same directory as the bundle
        // In development, it's in node_modules
        if (process.env.NODE_ENV === "production") {
          return `/app/${file}`;
        }
        return `node_modules/sql.js/dist/${file}`;
      },
    });

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

    const insertData = [
      data.uniqueName,
      data.command,
      JSON.stringify(data.args),
      JSON.stringify(data.env),
    ];

    stmt.run(insertData);

    // Get the last inserted row ID and immediately query for the full record
    const lastInsertResults = this.db.exec("SELECT last_insert_rowid() as id");
    const lastInsertId = lastInsertResults[0]?.values[0]?.[0];

    if (!lastInsertId) {
      throw new Error("Failed to get last insert ID");
    }

    // Use exec for better reliability
    const selectResults = this.db.exec(
      `SELECT * FROM packages WHERE id = ${lastInsertId}`
    );

    if (
      !selectResults ||
      selectResults.length === 0 ||
      !selectResults[0].values ||
      selectResults[0].values.length === 0
    ) {
      throw new Error("Failed to retrieve created package");
    }

    const result = selectResults[0];
    const rowData = result.values[0];

    // Map to object using column names
    const row: any = {};
    result.columns.forEach((col: string, index: number) => {
      row[col] = rowData[index];
    });

    this.saveDatabase();

    return {
      id: row.id as number,
      uniqueName: row.uniqueName as string,
      command: row.command as string,
      args: row.args ? JSON.parse(row.args as string) : [],
      env: row.env ? JSON.parse(row.env as string) : {},
      installedAt: row.installedAt as string,
    };
  }

  async findByUniqueName(uniqueName: string): Promise<Package | null> {
    await this.ensureInitialized();

    try {
      // Use exec for better reliability with proper SQL escaping
      const results = this.db.exec(
        "SELECT * FROM packages WHERE uniqueName = ?",
        [uniqueName]
      );

      if (!results || results.length === 0) {
        return null;
      }

      const result = results[0];
      if (!result.values || result.values.length === 0) {
        return null;
      }

      const rowData = result.values[0];

      // Map to object using column names
      const row: any = {};
      result.columns.forEach((col: string, index: number) => {
        row[col] = rowData[index];
      });

      // Validate that we have required fields
      if (!row.uniqueName || !row.command) {
        console.error("❌ Database row missing required fields:", row);
        return null;
      }

      return {
        id: row.id as number,
        uniqueName: row.uniqueName as string,
        command: row.command as string,
        args: row.args ? JSON.parse(row.args as string) : [],
        env: row.env ? JSON.parse(row.env as string) : {},
        installedAt: row.installedAt as string,
      };
    } catch (error) {
      console.error("❌ Error in findByUniqueName:", error);
      return null;
    }
  }

  async findAll(): Promise<Package[]> {
    await this.ensureInitialized();

    try {
      // Use db.exec instead of prepare/getAsObject for better reliability with SQL.js
      const results = this.db.exec(
        "SELECT * FROM packages ORDER BY installedAt DESC"
      );

      if (!results || results.length === 0) {
        return [];
      }

      const result = results[0]; // First (and should be only) result set

      if (!result.values || result.values.length === 0) {
        return [];
      }

      // Map the values array to objects using column names
      const packages = result.values.map((row: any[]) => {
        const rowObj: any = {};
        result.columns.forEach((col: string, index: number) => {
          rowObj[col] = row[index];
        });

        return {
          id: rowObj.id,
          uniqueName: rowObj.uniqueName,
          command: rowObj.command,
          args: rowObj.args ? JSON.parse(rowObj.args) : [],
          env: rowObj.env ? JSON.parse(rowObj.env) : {},
          installedAt: rowObj.installedAt,
        };
      });

      return packages;
    } catch (error) {
      console.error("❌ Error in findAll using exec:", error);
      return [];
    }
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

    console.log(
      "🔍 DELETE DEBUG: Attempting to delete package with uniqueName:",
      uniqueName
    );
    console.log("🔍 DELETE DEBUG: uniqueName type:", typeof uniqueName);

    // First check if the package exists before attempting to delete
    const existingPackage = await this.findByUniqueName(uniqueName);
    console.log("🔍 DELETE DEBUG: Found existing package:", !!existingPackage);
    if (existingPackage) {
      console.log("🔍 DELETE DEBUG: Existing package details:", {
        id: existingPackage.id,
        uniqueName: existingPackage.uniqueName,
        command: existingPackage.command,
      });
    }

    const stmt = this.db.prepare("DELETE FROM packages WHERE uniqueName = ?");
    stmt.run([uniqueName]);

    const rowsModified = this.db.getRowsModified();
    console.log("🔍 DELETE DEBUG: Rows modified:", rowsModified);

    this.saveDatabase();
    return rowsModified > 0;
  }

  async count(): Promise<number> {
    await this.ensureInitialized();

    try {
      const results = this.db.exec("SELECT COUNT(*) as count FROM packages");

      if (!results || results.length === 0) {
        return 0;
      }

      const result = results[0];
      if (!result.values || result.values.length === 0) {
        return 0;
      }

      const count = result.values[0][0] as number; // First row, first column
      return count || 0;
    } catch (error) {
      console.error("❌ Error in count using exec:", error);
      return 0;
    }
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
