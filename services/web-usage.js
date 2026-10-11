
'use strict';

const db = require('./database').db;

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return p.year + '-' + p.month + '-' + p.day;
}

// جدول جديد حتى لا نمسح أو نغيّر بيانات العداد القديم.
db.exec(`
CREATE TABLE IF NOT EXISTS web_daily_usage_by_section (
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, section, usage_day)
)`);

function getUsage(userId, section = 'general') {
  const row = db.prepare(
    'SELECT used FROM web_daily_usage_by_section WHERE user_id=? AND section=? AND usage_day=?'
  ).get(String(userId), String(section), today());
  const used = row ? Number(row.used) : 0;
  return { used, limit: 5, remaining: Math.max(0, 5 - used) };
}

function consume(userId, section = 'general') {
  const date = today();
  const uid = String(userId);
  const sec = String(section);

  return db.transaction(() => {
    const row = db.prepare(
      'SELECT used FROM web_daily_usage_by_section WHERE user_id=? AND section=? AND usage_day=?'
    ).get(uid, sec, date);
    const used = row ? Number(row.used) : 0;

    if (used >= 5) {
      return { ok: false, used, limit: 5, remaining: 0 };
    }

    if (row) {
      db.prepare(
        'UPDATE web_daily_usage_by_section SET used=used+1 WHERE user_id=? AND section=? AND usage_day=?'
      ).run(uid, sec, date);
    } else {
      db.prepare(
        'INSERT INTO web_daily_usage_by_section(user_id,section,usage_day,used) VALUES(?,?,?,1)'
      ).run(uid, sec, date);
    }

    return { ok: true, used: used + 1, limit: 5, remaining: 4 - used };
  })();
}

module.exports = { getUsage, consume };
