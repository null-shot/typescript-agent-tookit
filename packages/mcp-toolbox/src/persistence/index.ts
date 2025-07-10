import sqlite3 from 'sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

export interface Package {
  id: number
  uniqueName: string
  command: string
  args: string[]
  env: Record<string, string>
  installedAt: string
}

export interface PackageRepository {
  create(data: Omit<Package, 'id' | 'installedAt'>): Promise<Package>
  findByUniqueName(uniqueName: string): Promise<Package | null>
  findAll(): Promise<Package[]>
  deleteByUniqueName(uniqueName: string): Promise<boolean>
  count(): Promise<number>
}

class SqlitePackageRepository implements PackageRepository {
  private db: sqlite3.Database

  constructor(dbPath: string) {
    // Ensure directory exists
    mkdirSync(dirname(dbPath), { recursive: true })
    
    this.db = new sqlite3.Database(dbPath)
    this.initializeDatabase()
  }

  private async initializeDatabase() {
    return new Promise<void>((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS packages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uniqueName TEXT UNIQUE NOT NULL,
          command TEXT NOT NULL,
          args TEXT NOT NULL,
          env TEXT NOT NULL,
          installedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async create(data: Omit<Package, 'id' | 'installedAt'>): Promise<Package> {
    const db = this.db // Capture reference
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO packages (uniqueName, command, args, env)
        VALUES (?, ?, ?, ?)
      `)
      
      stmt.run([
        data.uniqueName,
        data.command,
        JSON.stringify(data.args),
        JSON.stringify(data.env)
      ], function(err: any) {
        if (err) {
          reject(err)
        } else {
          // Use captured db reference
          const selectStmt = db.prepare('SELECT * FROM packages WHERE id = ?')
          selectStmt.get([this.lastID], (err, row: any) => {
            if (err) {
              reject(err)
            } else {
              resolve({
                id: row.id,
                uniqueName: row.uniqueName,
                command: row.command,
                args: JSON.parse(row.args),
                env: JSON.parse(row.env),
                installedAt: row.installedAt
              })
            }
          })
        }
      })
    })
  }

  async findByUniqueName(uniqueName: string): Promise<Package | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM packages WHERE uniqueName = ?',
        [uniqueName],
        (err, row: any) => {
          if (err) {
            reject(err)
          } else if (!row) {
            resolve(null)
          } else {
            resolve({
              id: row.id,
              uniqueName: row.uniqueName,
              command: row.command,
              args: JSON.parse(row.args),
              env: JSON.parse(row.env),
              installedAt: row.installedAt
            })
          }
        }
      )
    })
  }

  async findAll(): Promise<Package[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM packages ORDER BY installedAt DESC', (err, rows: any[]) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows.map(row => ({
            id: row.id,
            uniqueName: row.uniqueName,
            command: row.command,
            args: JSON.parse(row.args),
            env: JSON.parse(row.env),
            installedAt: row.installedAt
          })))
        }
      })
    })
  }

  async deleteByUniqueName(uniqueName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM packages WHERE uniqueName = ?',
        [uniqueName],
        function(err) {
          if (err) {
            reject(err)
          } else {
            resolve(this.changes > 0)
          }
        }
      )
    })
  }

  async count(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM packages', (err, row: any) => {
        if (err) reject(err)
        else resolve(row.count)
      })
    })
  }
}

export function createPackageRepository(type: 'sqlite', dbPath?: string): PackageRepository {
  if (type === 'sqlite') {
    return new SqlitePackageRepository(dbPath || './data/packages.db')
  }
  throw new Error(`Unsupported repository type: ${type}`)
}