// ═══════════════════════════════════════
// auth-service.js - نظام تسجيل الدخول
// Google + Telegram
// ═══════════════════════════════════════

'use strict';

const crypto = require('crypto');
const db = require('./database');

// ═══════════════════════════════════════
// إنشاء جداول
// ═══════════════════════════════════════
try {
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS web_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      email TEXT,
      name TEXT,
      avatar TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      last_login INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(provider, provider_id)
    );
    CREATE INDEX IF NOT EXISTS idx_web_users_provider ON web_users(provider, provider_id);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      expires_at INTEGER NOT NULL,
      user_agent TEXT,
      ip TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);
} catch (e) { console.error('[auth] init:', e.message); }

/* إضافة حقول الحساب المحلي دون حذف بيانات المستخدمين */
try {
const columns = db.db.pragma('table_info(web_users)').map(c => c.name);
if (!columns.includes('username')) {
db.db.exec('ALTER TABLE web_users ADD COLUMN username TEXT');
}
if (!columns.includes('password_hash')) {
db.db.exec('ALTER TABLE web_users ADD COLUMN password_hash TEXT');
}
db.db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_web_users_username ON web_users(username COLLATE NOCASE) WHERE username IS NOT NULL");
} catch (e) {
console.error('[auth] local account migration:', e.message);
}


// ═══════════════════════════════════════
// إنشاء أو جلب مستخدم
// ═══════════════════════════════════════
function getOrCreateUser({ provider, providerId, email, name, avatar }) {
  try {
    let user = db.db.prepare(
      'SELECT * FROM web_users WHERE provider = ? AND provider_id = ?'
    ).get(provider, String(providerId));

    if (user) {
      db.db.prepare('UPDATE web_users SET last_login = ? WHERE id = ?')
        .run(Math.floor(Date.now() / 1000), user.id);
      return { ok: true, user, isNew: false };
    }

    const result = db.db.prepare(`
      INSERT INTO web_users (provider, provider_id, email, name, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).run(provider, String(providerId), email || null, name || null, avatar || null);

    user = db.db.prepare('SELECT * FROM web_users WHERE id = ?').get(result.lastInsertRowid);
    return { ok: true, user, isNew: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════
// إنشاء جلسة
// ═══════════════════════════════════════
function createSession(userId, { userAgent = '', ip = '' } = {}) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 يوم

    db.db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, user_agent, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(token, Number(userId), expiresAt, String(userAgent).slice(0, 200), String(ip).slice(0, 50));

    return { ok: true, token, expiresAt };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════
// جلب جلسة
// ═══════════════════════════════════════
function getSession(token) {
  try {
    const session = db.db.prepare('SELECT * FROM sessions WHERE token = ?').get(String(token));
    if (!session) return null;

    if (session.expires_at < Math.floor(Date.now() / 1000)) {
      db.db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token));
      return null;
    }

    const user = db.db.prepare('SELECT id, provider, provider_id, email, name, avatar, username, created_at, last_login FROM web_users WHERE id = ?').get(session.user_id);
    if (!user) return null;

    return { session, user };
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════
// حذف جلسة
// ═══════════════════════════════════════
function deleteSession(token) {
  try {
    db.db.prepare('DELETE FROM sessions WHERE token = ?').run(String(token));
    return true;
  } catch (e) { return false; }
}

// ═══════════════════════════════════════
// حذف جلسات منتهية
// ═══════════════════════════════════════
function cleanExpiredSessions() {
  try {
    const r = db.db.prepare('DELETE FROM sessions WHERE expires_at < ?')
      .run(Math.floor(Date.now() / 1000));
    return r.changes;
  } catch (e) { return 0; }
}

// ═══════════════════════════════════════
// التحقق من Telegram Login Widget
// ═══════════════════════════════════════
function verifyTelegramAuth(data, botToken) {
  try {
    const { hash, ...userData } = data;
    if (!hash) return { ok: false, error: 'no hash' };

    // نبني data-check-string
    const dataCheckString = Object.keys(userData)
      .sort()
      .map(k => k + '=' + userData[k])
      .join('\n');

    // نحسب HMAC-SHA256
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return { ok: false, error: 'invalid hash' };
    }

    // نتحقق من مدة الصلاحية (24 ساعة)
    const authDate = parseInt(userData.auth_date || 0);
    if (Date.now() / 1000 - authDate > 86400) {
      return { ok: false, error: 'expired' };
    }

    return { ok: true, user: userData };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════
// تنظيف دوري للجلسات
// ═══════════════════════════════════════
setInterval(() => {
  const n = cleanExpiredSessions();
  if (n > 0) console.log('[auth] cleaned ' + n + ' expired sessions');
}, 60 * 60 * 1000);


const bcrypt = require('bcryptjs');

function publicUser(user) {
if (!user) return null;
const { password_hash, ...safeUser } = user;
return safeUser;
}

async function registerLocalUser({ username, email, password }) {
try {
username = String(username || '').trim();
email = String(email || '').trim().toLowerCase();
password = String(password || '');

if (!/^[a-zA-Z0-9_\u0600-\u06FF]{3,24}$/.test(username))
  return { ok: false, error: 'invalid_username' };
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
  return { ok: false, error: 'invalid_email' };
if (password.length < 8 || password.length > 128)
  return { ok: false, error: 'weak_password' };

if (db.db.prepare('SELECT id FROM web_users WHERE lower(email) = lower(?)').get(email))
  return { ok: false, error: 'email_exists' };
if (db.db.prepare('SELECT id FROM web_users WHERE username = ? COLLATE NOCASE').get(username))
  return { ok: false, error: 'username_exists' };

const passwordHash = await bcrypt.hash(password, 12);
const result = db.db.prepare(`
  INSERT INTO web_users
    (provider, provider_id, email, name, username, password_hash)
  VALUES ('local', ?, ?, ?, ?, ?)
`).run(email, email, username, username, passwordHash);

const user = db.db.prepare('SELECT * FROM web_users WHERE id = ?').get(result.lastInsertRowid);
return { ok: true, user: publicUser(user), isNew: true };

} catch (e) {
if (String(e.message).includes('UNIQUE constraint failed')) {
return { ok: false, error: 'account_exists' };
}
console.error('[auth/register]', e.message);
return { ok: false, error: 'register_failed' };
}
}

async function authenticateLocalUser({ email, password }) {
try {
email = String(email || '').trim().toLowerCase();
password = String(password || '');
const user = db.db.prepare(
"SELECT * FROM web_users WHERE provider = 'local' AND lower(email) = lower(?)"
).get(email);

if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
  return { ok: false, error: 'invalid_credentials' };
}

db.db.prepare('UPDATE web_users SET last_login = ? WHERE id = ?')
  .run(Math.floor(Date.now() / 1000), user.id);

return {
  ok: true,
  user: publicUser(db.db.prepare('SELECT * FROM web_users WHERE id = ?').get(user.id))
};

} catch (e) {
console.error('[auth/login]', e.message);
return { ok: false, error: 'login_failed' };
}
}

module.exports = {
  getOrCreateUser,
  registerLocalUser,
  authenticateLocalUser,
  createSession,
  getSession,
  deleteSession,
  cleanExpiredSessions,
  verifyTelegramAuth,
};
