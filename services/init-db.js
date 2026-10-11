'use strict';
const { query } = require('./db');

async function initDb() {
  console.log('🔄 Creating tables...');

  await query(`
    CREATE TABLE IF NOT EXISTS web_users (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      email TEXT UNIQUE,
      name TEXT,
      avatar TEXT,
      username TEXT UNIQUE,
      password_hash TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
      last_login BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
      expires_at BIGINT NOT NULL,
      user_agent TEXT,
      ip TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS web_subscriptions (
      web_user_id INTEGER PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'free',
      expires_at BIGINT,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS web_codes (
      code TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT 'pro',
      days INTEGER NOT NULL,
      created_at BIGINT NOT NULL,
      used_by INTEGER,
      used_at BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_web_codes_used ON web_codes(used_by);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS web_daily_usage (
      user_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      usage_day TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, section, usage_day)
    );
  `);

  console.log('✅ All tables created');
}

if (require.main === module) {
  initDb().then(() => process.exit(0)).catch(e => { console.error('❌', e.message); process.exit(1); });
}

module.exports = { initDb };
