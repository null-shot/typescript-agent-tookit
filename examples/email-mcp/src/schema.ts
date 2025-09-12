import { z } from 'zod';

export const emailSchema = z.object({
  id: z.string().uuid(),
  from_addr: z.string(),
  to_addr: z.string(),
  subject: z.string().nullable(),
  text: z.string().nullable(),
  raw_size: z.number().int(),
  received_at: z.string(), // ISO
  created_at: z.string(),
  updated_at: z.string(),
});

export type Email = z.infer<typeof emailSchema>;

// List filters for resources/tools
export const emailFilterSchema = z.object({
  search_text: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['received_at', 'created_at', 'updated_at']).default('received_at'),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
});

export type EmailFilter = z.infer<typeof emailFilterSchema>;

export const EMAILS_SQL = `
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  subject TEXT,
  text TEXT,
  raw_size INTEGER NOT NULL,
  received_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at);
CREATE INDEX IF NOT EXISTS idx_emails_from_addr ON emails(from_addr);
CREATE INDEX IF NOT EXISTS idx_emails_to_addr ON emails(to_addr);
`;