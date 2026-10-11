'use strict';

const db = require('./database');

db.db.exec(`
  CREATE TABLE IF NOT EXISTS web_subscriptions (
    web_user_id INTEGER PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free'
      CHECK(plan IN ('free','pro')),
    expires_at INTEGER,
    updated_at INTEGER NOT NULL
  )
`);

function getPlan(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error('invalid_user_id');
  }

  let row = db.db.prepare(
    'SELECT plan, expires_at FROM web_subscriptions WHERE web_user_id = ?'
  ).get(id);

  if (!row) {
    db.db.prepare(`
      INSERT OR IGNORE INTO web_subscriptions
      (web_user_id, plan, expires_at, updated_at)
      VALUES (?, 'free', NULL, ?)
    `).run(id, Math.floor(Date.now() / 1000));

    row = db.db.prepare(
      'SELECT plan, expires_at FROM web_subscriptions WHERE web_user_id = ?'
    ).get(id);
  }

  const now = Math.floor(Date.now() / 1000);

  if (row.plan === 'pro' && row.expires_at && row.expires_at <= now) {
    db.db.prepare(`
      UPDATE web_subscriptions
      SET plan = 'free', expires_at = NULL, updated_at = ?
      WHERE web_user_id = ?
    `).run(now, id);

    return { plan: 'free', active: false, expiresAt: null };
  }

  const active = row.plan === 'pro' &&
    (!row.expires_at || row.expires_at > now);

  return {
    plan: active ? 'pro' : 'free',
    active,
    expiresAt: active ? row.expires_at : null
  };
}

function setPlan(userId, plan, days = 30) {
  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error('invalid_user_id');
  }
  if (!['free', 'pro'].includes(plan)) {
    throw new Error('invalid_plan');
  }

  days = Number(days);
  if (plan === 'pro' &&
      (!Number.isInteger(days) || days < 1 || days > 3650)) {
    throw new Error('days_must_be_1_to_3650');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = plan === 'pro'
    ? now + days * 86400
    : null;

  db.db.prepare(`
    INSERT INTO web_subscriptions
      (web_user_id, plan, expires_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(web_user_id) DO UPDATE SET
      plan = excluded.plan,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at
  `).run(id, plan, expiresAt, now);

  return getPlan(id);
}

module.exports = { getPlan, setPlan };
