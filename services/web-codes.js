'use strict';
const crypto = require('crypto');
const { query, queryOne } = require('./db');
const webPlans = require('./web-plans');

async function createCode(days) {
  days = Number(days);
  if (![7, 30].includes(days)) throw new Error('مدة الكود يجب أن تكون 7 أو 30 يومًا');

  let code;
  let exists = true;
  while (exists) {
    code = 'RWEB-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    const row = await queryOne('SELECT 1 FROM web_codes WHERE code = $1', [code]);
    exists = Boolean(row);
  }

  await query(
    'INSERT INTO web_codes (code, plan, days, created_at) VALUES ($1, $2, $3, $4)',
    [code, 'pro', days, Math.floor(Date.now() / 1000)]
  );

  return code;
}

async function redeemCode(userId, rawCode) {
  const id = Number(userId);
  const code = String(rawCode || '').trim().toUpperCase();

  if (!Number.isSafeInteger(id) || id < 1) {
    return { ok: false, msg: 'حساب الموقع غير صالح' };
  }
  if (!/^RWEB-[A-F0-9]{16}$/.test(code)) {
    return { ok: false, msg: 'صيغة الكود غير صحيحة' };
  }

  try {
    const row = await queryOne(
      'SELECT code, days, used_by FROM web_codes WHERE code = $1',
      [code]
    );

    if (!row) return { ok: false, msg: 'الكود غير موجود' };
    if (row.used_by !== null && row.used_by !== undefined) {
      return { ok: false, msg: 'الكود مستخدم من قبل' };
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await query(
      'UPDATE web_codes SET used_by = $1, used_at = $2 WHERE code = $3 AND used_by IS NULL RETURNING code',
      [id, now, code]
    );

    if (result.length !== 1) {
      return { ok: false, msg: 'الكود مستخدم من قبل' };
    }

    await webPlans.setPlan(id, 'pro', row.days);
    return { ok: true, plan: 'pro', days: row.days };
  } catch (e) {
    console.error('[web-codes]', e.message);
    return { ok: false, msg: 'حصل خطأ أثناء تفعيل الاشتراك' };
  }
}

module.exports = { createCode, redeemCode };
