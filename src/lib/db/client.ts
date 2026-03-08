import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

let dbInstance: Awaited<ReturnType<typeof import('@tauri-apps/plugin-sql').default.load>> | null = null;

async function getSqlite() {
  if (!dbInstance) {
    const Database = (await import('@tauri-apps/plugin-sql')).default;
    dbInstance = await Database.load('sqlite:bottingos.db');
  }
  return dbInstance;
}

function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trimStart().toLowerCase();
  return trimmed.startsWith('select') || trimmed.startsWith('pragma');
}

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    if (!isTauri()) {
      return { rows: [] };
    }

    const sqlite = await getSqlite();

    if (isSelectQuery(sql)) {
      const rows = await sqlite.select(sql, params as unknown[]).catch((e: unknown) => {
        console.error('SQL Select Error:', e, sql);
        return [];
      });
      const mapped = (rows as Record<string, unknown>[]).map((row) => Object.values(row));
      return { rows: method === 'all' ? mapped : (mapped[0] ?? []) };
    }

    await sqlite.execute(sql, params as unknown[]).catch((e: unknown) => {
      console.error('SQL Execute Error:', e, sql);
    });
    return { rows: [] };
  },
  { schema, logger: false }
);
