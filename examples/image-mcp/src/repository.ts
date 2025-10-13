// Repository that handles the db and composes the bucket and provide single point of access for the MCP server
// Can be improved by decoupling into repository, storage (bucket), and service layers.
// However, since the bucket object and DB record must remain consistent,
// and the current use case is simple, we’ll keep it unified for now.

import { R2ImageBucket, type ImageObject } from "./bucket";

export type ImageRecord = {
  id: string
  created_at: string,
  name?: string
  description?: string
  object: ImageObject
}

export type DbImageRow = Omit<ImageRecord, 'object'> & {
  object_key: string
}

const SQL_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    object_key TEXT UNIQUE NOT NULL,
    name TEXT OPTIONAL,
    description TEXT OPTIONAL,
    created_at TEXT NOT NULL
  );
`

export class ImageRepository {
  constructor(
    private storage: DurableObjectStorage,
    private bucket: R2ImageBucket
  ) {}

  async init() {
    // Create table if not exists
    await this.storage.sql.exec(SQL_TABLE_SCHEMA)
  }
  
  async put(base64: string, name?: string, description?: string) {
    // Put the image in the bucket
    const object = await this.bucket.putBase64(base64)

    // Create a new row in the database
    const row = {
      id: crypto.randomUUID(),
      object_key: object.key,
      name: name,
      description: description,
      content_type: object.content_type,
      size: object.size,
      uploaded: object.uploaded,
      created_at: new Date().toISOString()
    }
    try {
      await this
        .storage
        .sql
        .exec(
          `INSERT INTO images (id,object_key,name,description,created_at)
          VALUES (?,?,?,?,?)`,
          row.id, row.object_key, row.name, row.description, row.created_at
        )
    } catch (e) {
      // Undo the bucket operation
      console.error('Error when insert image record to db and deleting object from bucket: ', e);
      await this.bucket.delete(object.key)
      throw e
    }
    const { id: dbId, created_at } = row
    return { id: dbId, created_at, name, description, object }
  }

  async get(id: string) {
    const row = (await this
      .storage
      .sql
      .exec(`SELECT * FROM images WHERE id = ?`, [id])
      .toArray() as DbImageRow[])[0]

    if (!row) return null

    // the object must exist in the bucket. If not found, there's data inconsistency
    // throw error so it should be caught early.
    const object = await this.bucket.getAsBase64(row.object_key)
    if (!object) {
      throw new Error('Unexpected error: Object not found')
    }

    const { id: dbId, created_at, name, description } = row
    return { id: dbId, created_at, name, description, object }
  }

  async all(limit = 20, offset = 0) {
    const rows = await this
      .storage
      .sql
      .exec(
        `SELECT * FROM images ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        limit, offset
      )
      .toArray() as DbImageRow[]

    const results = await Promise.all(rows.map(async (row) => {
      const object = await this.bucket.getAsBase64(row.object_key)
      if (!object) {
        throw new Error('Unexpected error: Object not found')
      }
      const { id: dbId, created_at, name, description } = row
      return { id: dbId, created_at, name, description, object }
    }))
    return results
  }

  // For LLM to search the images
  async search(query: string, limit = 10, offset = 0) {
    // fuzzy search the images by name and description
    if (!query) return []

    const pat = `%${escLike(query)}%`
    const rows = await this
      .storage
        .sql
        .exec(
        `SELECT id, object_key, name, description, created_at
        FROM images
        WHERE name LIKE ? ESCAPE '\\'
            OR description LIKE ? ESCAPE '\\'
            OR object_key LIKE ? ESCAPE '\\'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        pat, pat, pat, limit, offset
      )
      .toArray() as DbImageRow[]

    const result = await Promise.all(rows.map(async (row) => {
      const object = await this.bucket.getAsBase64(row.object_key)
      if (!object) {
        throw new Error('Unexpected error: Object not found')
      }
      const { id, created_at, name, description } = row
      return { id, created_at, name, description, object }
    }))

    return result
  }
}

// -- Helper functions --

const escLike = (input: string) => {
  // escape the input string for the SQL LIKE pattern for safe search
  return input
    .replace(/\\/g, '\\\\')  // escape '\'
    .replace(/%/g, '\\%')    // escape '%'
    .replace(/_/g, '\\_');   // escape '_'
}