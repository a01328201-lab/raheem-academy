'use strict';
const { query, queryOne } = require('./db');

async function getPlan(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('invalid_user_id');

  let row = await queryOne(
    'SELECT plan, expires_at FROM web_subscriptions WHERE web_user_id = $1',
    [id]
  );

  if (!row) {
    await query(
      'INSERT INTO web_subscriptions (web_user_id, plan, expires_at, updated_at) VALUES ($1, $2, NULL, $3) ON CONFLICT (web_user_id) DO NOTHING',
      [id, 'free', Math.floor(Date.now() / 1000)]
    );
    row = { plan: 'free', expires_at: null };
  }

  const now = Math.floor(Date.now() / 1000);

  if (row.plan === 'pro' && row.expires_at && Number(row.expires_at) <= now) {
    await query(
      'UPDATE web_subscriptions SET plan = $1, expires_at = NULL, updated_at = $2 WHERE web_user_id = $3',
      ['free', now, id]
    );
    return { plan: 'free', active: false, expiresAt: null };
  }

  const active = row.plan === 'pro' && (!row.expires_at || Number(row.expires_at) > now);
  return {
    plan: active ? 'pro' : 'free',
    active,
    expiresAt: active ? Number(row.expires_at) : null
  };
}

async function setPlan(userId, plan, days = 30) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('invalid_user_id');
  if (!['free', 'pro'].includes(plan)) throw new Error('invalid_plan');

  days = Number(days);
  if (plan === 'pro' && (!Number.isInteger(days) || days < 1 || days > 3650)) {
    throw new Error('days_must_be_1_to_3650');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = plan === 'pro' ? now + days * 86400 : null;

  await query(
    'INSERT INTO web_subscriptions (web_user_id, plan, expires_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (web_user_id) DO UPDATE SET plan = $2, expires_at = $3, updated_at = $4',
    [id, plan, expiresAt, now]
  );

  return getPlan(id);
}

module.exports = { getPlan, setPlan };
