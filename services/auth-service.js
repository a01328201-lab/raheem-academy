'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('./db');

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

async function getOrCreateUser({ provider, providerId, email, name, avatar }) {
  try {
    const existing = await queryOne(
      'SELECT * FROM web_users WHERE provider = $1 AND provider_id = $2',
      [provider, String(providerId)]
    );

    if (existing) {
      await query('UPDATE web_users SET last_login = $1 WHERE id = $2',
        [Math.floor(Date.now() / 1000), existing.id]);
      return { ok: true, user: existing, isNew: false };
    }

    const rows = await query(
      `INSERT INTO web_users (provider, provider_id, email, name, avatar)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [provider, String(providerId), email || null, name || null, avatar || null]
    );

    return { ok: true, user: rows[0], isNew: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
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

    const emailExists = await queryOne('SELECT id FROM web_users WHERE LOWER(email) = LOWER($1)', [email]);
    if (emailExists) return { ok: false, error: 'email_exists' };

    const userExists = await queryOne('SELECT id FROM web_users WHERE LOWER(username) = LOWER($1)', [username]);
    if (userExists) return { ok: false, error: 'username_exists' };

    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await query(
      `INSERT INTO web_users (provider, provider_id, email, name, username, password_hash)
       VALUES ('local', $1, $2, $3, $4, $5) RETURNING *`,
      [email, email, username, username, passwordHash]
    );

    return { ok: true, user: publicUser(rows[0]), isNew: true };
  } catch (e) {
    if (String(e.message).includes('duplicate')) return { ok: false, error: 'account_exists' };
    console.error('[auth/register]', e.message);
    return { ok: false, error: 'register_failed' };
  }
}

async function authenticateLocalUser({ email, password }) {
  try {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    const user = await queryOne(
      "SELECT * FROM web_users WHERE provider = 'local' AND LOWER(email) = LOWER($1)",
      [email]
    );

    if (!user || !user.password_hash) return { ok: false, error: 'invalid_credentials' };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { ok: false, error: 'invalid_credentials' };

    await query('UPDATE web_users SET last_login = $1 WHERE id = $2',
      [Math.floor(Date.now() / 1000), user.id]);

    return { ok: true, user: publicUser(user) };
  } catch (e) {
    console.error('[auth/login]', e.message);
    return { ok: false, error: 'login_failed' };
  }
}

async function createSession(userId, { userAgent = '', ip = '' } = {}) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

    await query(
      'INSERT INTO sessions (token, user_id, expires_at, user_agent, ip) VALUES ($1, $2, $3, $4, $5)',
      [token, Number(userId), expiresAt, String(userAgent).slice(0, 200), String(ip).slice(0, 50)]
    );

    return { ok: true, token, expiresAt };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getSession(token) {
  try {
    const session = await queryOne('SELECT * FROM sessions WHERE token = $1', [String(token)]);
    if (!session) return null;

    if (Number(session.expires_at) < Math.floor(Date.now() / 1000)) {
      await query('DELETE FROM sessions WHERE token = $1', [String(token)]);
      return null;
    }

    const user = await queryOne(
      'SELECT id, provider, provider_id, email, name, avatar, username, created_at, last_login FROM web_users WHERE id = $1',
      [session.user_id]
    );
    if (!user) return null;

    return { session, user };
  } catch (e) {
    return null;
  }
}

async function deleteSession(token) {
  try {
    await query('DELETE FROM sessions WHERE token = $1', [String(token)]);
    return true;
  } catch (e) { return false; }
}

async function cleanExpiredSessions() {
  try {
    const r = await query('DELETE FROM sessions WHERE expires_at < $1',
      [Math.floor(Date.now() / 1000)]);
    return r.length;
  } catch (e) { return 0; }
}

function verifyTelegramAuth(data, botToken) {
  try {
    const { hash, ...userData } = data;
    if (!hash) return { ok: false, error: 'no hash' };

    const dataCheckString = Object.keys(userData).sort()
      .map(k => k + '=' + userData[k]).join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString).digest('hex');

    if (computedHash !== hash) return { ok: false, error: 'invalid hash' };

    const authDate = parseInt(userData.auth_date || 0);
    if (Date.now() / 1000 - authDate > 86400) return { ok: false, error: 'expired' };

    return { ok: true, user: userData };
  } catch (e) {
    return { ok: false, error: e.message };
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
