const migrations: { name: string; sql: string }[] = [
  {
    name: '0001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        icloud_account TEXT,
        provider TEXT,
        retailers TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS vault_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site TEXT NOT NULL,
        username TEXT NOT NULL,
        password_ciphertext BLOB NOT NULL,
        password_iv TEXT NOT NULL,
        notes_ciphertext BLOB,
        notes_iv TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS vccs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT,
        last_four TEXT NOT NULL,
        label TEXT,
        linked_account_id INTEGER REFERENCES emails(id),
        status TEXT DEFAULT 'active',
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_name TEXT,
        product TEXT NOT NULL,
        size TEXT,
        price REAL NOT NULL,
        store TEXT,
        profile TEXT,
        order_number TEXT,
        success INTEGER,
        raw_data TEXT,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER REFERENCES orders(id),
        name TEXT NOT NULL,
        category TEXT,
        purchase_price REAL NOT NULL,
        status TEXT DEFAULT 'in_stock',
        listed_url TEXT,
        listed_price REAL,
        sold_price REAL,
        sold_date INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS calculator_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT,
        sku TEXT,
        purchase_price REAL NOT NULL,
        results_json TEXT NOT NULL,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS tracker_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        date INTEGER NOT NULL,
        tags TEXT DEFAULT '[]',
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT,
        product_name TEXT NOT NULL,
        target_price REAL NOT NULL,
        direction TEXT NOT NULL,
        marketplace TEXT,
        active INTEGER DEFAULT 1,
        created_at INTEGER
      )
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const { getSqlite } = await import('./client');
  const sqlite = await getSqlite();

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  const applied = await sqlite
    .select<{ name: string }[]>('SELECT name FROM __drizzle_migrations ORDER BY id')
    .catch(() => [] as { name: string }[]);
  const appliedNames = new Set(applied.map((r) => r.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;

    console.log(`Running migration: ${migration.name}`);
    const statements = migration.sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await sqlite.execute(stmt);
    }

    await sqlite.execute(
      'INSERT INTO __drizzle_migrations (name, created_at) VALUES (?, ?)',
      [migration.name, Date.now()]
    );
  }

  console.log('Migrations complete');
}
