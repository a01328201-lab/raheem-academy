'use strict';
const { query, queryOne } = require('./db');

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return p.year + '-' + p.month + '-' + p.day;
}

async function getUsage(userId, section = 'general') {
  const row = await queryOne(
    'SELECT used FROM web_daily_usage WHERE user_id = $1 AND section = $2 AND usage_day = $3',
    [String(userId), String(section), today()]
  );
  const used = row ? Number(row.used) : 0;
  return { used, limit: 5, remaining: Math.max(0, 5 - used) };
}

async function consume(userId, section = 'general') {
  const date = today();
  const uid = String(userId);
  const sec = String(section);

  const row = await queryOne(
    'SELECT used FROM web_daily_usage WHERE user_id = $1 AND section = $2 AND usage_day = $3',
    [uid, sec, date]
  );
  const used = row ? Number(row.used) : 0;

  if (used >= 5) {
    return { ok: false, used, limit: 5, remaining: 0 };
  }

  if (row) {
    await query(
      'UPDATE web_daily_usage SET used = used + 1 WHERE user_id = $1 AND section = $2 AND usage_day = $3',
      [uid, sec, date]
    );
  } else {
    await query(
      'INSERT INTO web_daily_usage (user_id, section, usage_day, used) VALUES ($1, $2, $3, 1)',
      [uid, sec, date]
    );
  }

  return { ok: true, used: used + 1, limit: 5, remaining: 4 - used };
}

module.exports = { getUsage, consume };
