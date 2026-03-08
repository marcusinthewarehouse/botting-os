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
  {
    name: '0002_price_alerts_v2',
    sql: `
      DROP TABLE IF EXISTS price_alerts;
      CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        style_id TEXT NOT NULL,
        marketplace TEXT NOT NULL,
        size TEXT,
        target_price REAL NOT NULL,
        direction TEXT NOT NULL,
        current_price REAL,
        recurring INTEGER DEFAULT 0,
        triggered INTEGER DEFAULT 0,
        triggered_at INTEGER,
        last_checked_at INTEGER,
        image_url TEXT,
        created_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: '0003_notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        action_url TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: '0004_drops',
    sql: `
      CREATE TABLE IF NOT EXISTS drops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        brand TEXT,
        retailer TEXT,
        category TEXT,
        drop_date INTEGER NOT NULL,
        drop_time TEXT,
        url TEXT,
        notes TEXT,
        reminder_minutes INTEGER,
        reminded INTEGER DEFAULT 0,
        source TEXT DEFAULT 'manual',
        created_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: '0005_resources',
    sql: `
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0,
        icon TEXT,
        created_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: '0006_inventory_missing_columns',
    sql: `
      ALTER TABLE inventory_items ADD COLUMN sku TEXT;
      ALTER TABLE inventory_items ADD COLUMN size TEXT;
      ALTER TABLE inventory_items ADD COLUMN location TEXT;
      ALTER TABLE inventory_items ADD COLUMN image_url TEXT;
      ALTER TABLE inventory_items ADD COLUMN notes TEXT
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
