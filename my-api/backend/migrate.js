import pg from 'pg';
import DB from './db.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'clinic_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123'
});

async function migrate() {
  console.log('Running database migrations...');

  // 1. PostgreSQL migration
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL, applying migrations...');
    await client.query(`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 15;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT '';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_percent INT DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS personal_discount_percent INT DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0;
      INSERT INTO categories (name) VALUES ('Без категории') ON CONFLICT (name) DO NOTHING;
      UPDATE services SET stock_quantity = 15 WHERE stock_quantity IS NULL;
    `);
    client.release();
    console.log('PostgreSQL migration completed successfully.');
  } catch (err) {
    console.warn('PostgreSQL migration warning (might be offline):', err.message);
  } finally {
    await pool.end();
  }

  // 2. SQLite migration
  try {
    try {
      DB.exec("ALTER TABLE services ADD COLUMN stock_quantity INTEGER DEFAULT 15");
    } catch (_) {}
    try {
      DB.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT DEFAULT ''");
    } catch (_) {}
    try {
      DB.exec("ALTER TABLE orders ADD COLUMN coupon_discount_percent INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      DB.exec("ALTER TABLE orders ADD COLUMN personal_discount_percent INTEGER DEFAULT 0");
    } catch (_) {}
    try {
      DB.exec("ALTER TABLE orders ADD COLUMN subtotal_amount REAL DEFAULT 0");
    } catch (_) {}
    try {
      DB.exec("INSERT OR IGNORE INTO categories (name) VALUES ('Без категории')");
    } catch (_) {}
    try {
      DB.exec("UPDATE services SET stock_quantity = 15 WHERE stock_quantity IS NULL");
    } catch (_) {}
    console.log('SQLite migration completed successfully.');
  } catch (err) {
    console.warn('SQLite migration error:', err.message);
  }

  console.log('All migrations completed!');
}

migrate();
