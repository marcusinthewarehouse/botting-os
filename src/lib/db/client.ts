import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

// Cached at module load - environment never changes at runtime
export const IS_TAURI = typeof window !== 'undefined' && '__TAURI__' in window;

type SqliteDb = InstanceType<typeof Database>;

let sqlitePromise: Promise<SqliteDb> | null = null;

export async function getSqlite(): Promise<SqliteDb> {
  if (!sqlitePromise) {
    sqlitePromise = import('@tauri-apps/plugin-sql').then((m) =>
      m.default.load('sqlite:bottingos.db')
    );
  }
  return sqlitePromise;
}

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    if (!IS_TAURI) {
      return { rows: [] };
    }

    const sqlite = await getSqlite();

    // Use Drizzle's method param: 'run' = mutation, everything else = read
    if (method !== 'run') {
      const rows = await sqlite.select(sql, params as unknown[]).catch((e: unknown) => {
        console.error('SQL select error:', sql, e);
        return [];
      });
      const mapped = (rows as Record<string, unknown>[]).map((row) => Object.values(row));
      return { rows: method === 'all' ? mapped : (mapped[0] ?? []) };
    }

    await sqlite.execute(sql, params as unknown[]).catch((e: unknown) => {
      console.error('SQL execute error:', sql, e);
      throw e;
    });
    return { rows: [] };
  },
  { schema, logger: false }
);
