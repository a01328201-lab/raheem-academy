'use strict';

const crypto = require('crypto');
const db = require('./database');
const webPlans = require('./web-plans');

db.db.exec(`
  CREATE TABLE IF NOT EXISTS web_codes (
    code TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'pro' CHECK(plan = 'pro'),
    days INTEGER NOT NULL CHECK(days IN (7, 30)),
    created_at INTEGER NOT NULL,
    used_by INTEGER,
    used_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_web_codes_used ON web_codes(used_by);
`);

function createCode(days) {
  days = Number(days);
  if (![7, 30].includes(days)) throw new Error('مدة الكود يجب أن تكون 7 أو 30 يومًا');

  let code;
  do {
    code = 'RWEB-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  } while (db.db.prepare('SELECT 1 FROM web_codes WHERE code = ?').get(code));

  db.db.prepare(
    'INSERT INTO web_codes (code, plan, days, created_at) VALUES (?, ?, ?, ?)'
  ).run(code, 'pro', days, Math.floor(Date.now() / 1000));

  return code;
}

function redeemCode(userId, rawCode) {
  const id = Number(userId);
  const code = String(rawCode || '').trim().toUpperCase();

  if (!Number.isSafeInteger(id) || id < 1) {
    return { ok: false, msg: 'حساب الموقع غير صالح' };
  }
  if (!/^RWEB-[A-F0-9]{16}$/.test(code)) {
    return { ok: false, msg: 'صيغة الكود غير صحيحة' };
  }

  try {
    return db.db.transaction(() => {
      const row = db.db.prepare(
        'SELECT code, days, used_by FROM web_codes WHERE code = ?'
      ).get(code);

      if (!row) return { ok: false, msg: 'الكود غير موجود' };
      if (row.used_by !== null) {
        return { ok: false, msg: 'الكود مستخدم من قبل' };
      }

      const now = Math.floor(Date.now() / 1000);
      const updated = db.db.prepare(
        'UPDATE web_codes SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL'
      ).run(id, now, code);

      if (updated.changes !== 1) {
        return { ok: false, msg: 'الكود مستخدم من قبل' };
      }

      webPlans.setPlan(id, 'pro', row.days);
      return { ok: true, plan: 'pro', days: row.days };
    })();
  } catch (e) {
    console.error('[web-codes]', e.message);
    return { ok: false, msg: 'حصل خطأ أثناء تفعيل الاشتراك' };
  }
}

module.exports = { createCode, redeemCode };
