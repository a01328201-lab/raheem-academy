const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'bot.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    first_name TEXT,
    username TEXT,
    plan TEXT DEFAULT 'free',
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    daily_count INTEGER DEFAULT 0,
    daily_reset TEXT,
    total_uses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_daily TEXT,
    referral_code TEXT,
    referred_by INTEGER,
    referral_count INTEGER DEFAULT 0,
    language TEXT DEFAULT 'ar'
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan TEXT,
    amount INTEGER,
    method TEXT,
    status TEXT DEFAULT 'pending',
    receipt_file_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_username TEXT,
    message TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY,
    plan TEXT,
    days INTEGER,
    used_by INTEGER,
    used_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    done INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    target_id INTEGER,
    message TEXT,
    send_at INTEGER,
    repeat_type TEXT,
    sent INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  -- [removed] banned_users - managed by security/db.js

  

  -- [removed] moderation_log - managed by security/db.js

  CREATE TABLE IF NOT EXISTS welcome_pack (
    user_id INTEGER PRIMARY KEY,
    claimed_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

const OWNER_ID = parseInt(process.env.ADMIN_ID) || 8819559018;

function isOwner(userId) {
  return parseInt(userId) === OWNER_ID;
}

function getUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  if (user.plan !== 'free' && user.expires_at && user.expires_at * 1000 < Date.now()) {
    db.prepare('UPDATE users SET plan = ?, expires_at = NULL WHERE user_id = ?').run('free', userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

function updateUser(userId, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(k => k + ' = ?').join(', ');
  db.prepare('UPDATE users SET ' + setClause + ' WHERE user_id = ?').run(...values, userId);
}

function getPlan(userId) {
  const user = getUser(userId);
  if (user.plan === 'free') return { plan: 'free', active: false };
  if (user.expires_at && user.expires_at * 1000 > Date.now()) {
    return { plan: user.plan, active: true, expires: user.expires_at };
  }
  return { plan: 'free', active: false };
}

function setPlan(userId, plan, days) {
  const expires = days > 0 ? Math.floor(Date.now() / 1000) + (days * 86400) : null;
  updateUser(userId, { plan, expires_at: expires });
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const pro = db.prepare("SELECT COUNT(*) as c FROM users WHERE plan != 'free' AND expires_at * 1000 > ?").get(Date.now()).c;
  const today = new Date().toISOString().split('T')[0];
  const active = db.prepare('SELECT COUNT(*) as c FROM users WHERE daily_reset = ?').get(today).c;
  return { total, pro, active };
}

function getUserStats(userId) {
  const user = getUser(userId);
  return {
    points: user.points || 0,
    streak: user.streak || 0,
    totalReferrals: user.referral_count || 0,
    totalUses: user.total_uses || 0,
  };
}

function addPoints(userId, points) {
  db.prepare('UPDATE users SET points = COALESCE(points,0) + ? WHERE user_id = ?').run(points, userId);
}

function checkDaily(userId) {
  const user = getUser(userId);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (user.last_daily === today) return { already: true, streak: user.streak || 0 };
  let newStreak = 1;
  if (user.last_daily === yesterday) newStreak = (user.streak || 0) + 1;
  const bonus = 10 + (newStreak * 5);
  db.prepare('UPDATE users SET last_daily = ?, streak = ?, points = COALESCE(points,0) + ? WHERE user_id = ?').run(today, newStreak, bonus, userId);
  return { already: false, streak: newStreak, bonus };
}

function generateReferralCode(userId) {
  const user = getUser(userId);
  if (user.referral_code) return user.referral_code;
  const code = 'REF' + userId.toString().slice(-6) + Math.random().toString(36).substring(2, 6).toUpperCase();
  db.prepare('UPDATE users SET referral_code = ? WHERE user_id = ?').run(code, userId);
  return code;
}

function getTopByPoints(limit = 10) {
  return db.prepare('SELECT user_id, first_name, points, streak, referral_count FROM users ORDER BY COALESCE(points,0) DESC LIMIT ?').all(limit);
}

function createCode(plan, days) {
  const code = 'RH-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  db.prepare('INSERT INTO codes (code, plan, days) VALUES (?, ?, ?)').run(code, plan, days);
  return code;
}

function redeemCode(userId, code) {
  const c = db.prepare('SELECT * FROM codes WHERE code = ?').get(code);
  if (!c) return { ok: false, msg: 'الكود مش موجود' };
  if (c.used_by) return { ok: false, msg: 'مستخدم قبل كده' };
  setPlan(userId, c.plan, c.days);
  db.prepare('UPDATE codes SET used_by = ?, used_at = ? WHERE code = ?').run(userId, Math.floor(Date.now() / 1000), code);
  return { ok: true, plan: c.plan, days: c.days };
}

function addPayment(userId, plan, amount, method, receiptFileId) {
  const r = db.prepare('INSERT INTO payments (user_id, plan, amount, method, receipt_file_id) VALUES (?, ?, ?, ?, ?)').run(userId, plan, amount, method, receiptFileId);
  return r.lastInsertRowid;
}

function approvePayment(id, adminId) {
  const p = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  if (!p || p.status !== 'pending') return null;
  db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('approved', id);
  const PLAN_DAYS = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365, lifetime: 36500 };
  setPlan(p.user_id, 'pro', PLAN_DAYS[p.plan] || 30);
  return p;
}

function rejectPayment(id) {
  db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('rejected', id);
}

function addSupportMessage(userId, userName, userUsername, message) {
  const r = db.prepare('INSERT INTO support_messages (user_id, user_name, user_username, message) VALUES (?, ?, ?, ?)').run(userId, userName, userUsername, message);
  return r.lastInsertRowid;
}

function getOpenSupportMessages() {
  return db.prepare("SELECT * FROM support_messages WHERE status = 'open' ORDER BY created_at DESC LIMIT 20").all();
}

function closeSupportMessage(id) {
  db.prepare("UPDATE support_messages SET status = 'closed' WHERE id = ?").run(id);
}

module.exports = {
  db, getUser, updateUser, getPlan, setPlan, getStats, getUserStats,
  addPoints, checkDaily, generateReferralCode, getTopByPoints,
  createCode, redeemCode, addPayment, approvePayment, rejectPayment,
  addSupportMessage, getOpenSupportMessages, closeSupportMessage,
  isOwner, OWNER_ID,
};
