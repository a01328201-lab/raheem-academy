'use strict';

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const authService = require('../services/auth-service');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const router = express.Router();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

// ═══ Register (local) ═══
router.post('/register', express.json(), async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body || {};
    if (password !== confirmPassword) {
      return res.status(400).json({ ok: false, error: 'password_mismatch' });
    }

    const result = await authService.registerLocalUser({ username, email, password });
    if (!result.ok) {
      const status = ['invalid_username', 'invalid_email', 'weak_password'].includes(result.error) ? 400 :
        ['email_exists', 'username_exists', 'account_exists'].includes(result.error) ? 409 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }

    const session = await authService.createSession(result.user.id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || ''
    });

    if (!session.ok) {
      console.error('[register] session_failed:', session.error);
      return res.status(500).json({ ok: false, error: 'session_failed', detail: session.error });
    }

    setAuthCookie(res, session.token);
    return res.status(201).json({ ok: true, user: result.user });
  } catch (e) {
    console.error('[auth/register]', e.message);
    return res.status(500).json({ ok: false, error: 'register_failed', detail: e.message });
  }
});

// ═══ Login (local) ═══
router.post('/login', express.json(), async (req, res) => {
  try {
    const result = await authService.authenticateLocalUser(req.body || {});
    if (!result.ok) {
      const status = result.error === 'invalid_credentials' ? 401 : 500;
      return res.status(status).json({ ok: false, error: result.error });
    }

    const session = await authService.createSession(result.user.id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || ''
    });

    if (!session.ok) {
      return res.status(500).json({ ok: false, error: 'session_failed', detail: session.error });
    }

    setAuthCookie(res, session.token);
    return res.json({ ok: true, user: result.user });
  } catch (e) {
    console.error('[auth/login]', e.message);
    return res.status(500).json({ ok: false, error: 'login_failed', detail: e.message });
  }
});

// ═══ Google OAuth ═══
router.get('/google', (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account'
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect('/login?error=no_code');

    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const p = ticket.getPayload();

    const r = await authService.getOrCreateUser({
      provider: 'google',
      providerId: p.sub,
      email: p.email,
      name: p.name,
      avatar: p.picture
    });
    if (!r.ok) return res.redirect('/login?error=user_failed');

    const s = await authService.createSession(r.user.id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || ''
    });
    if (!s.ok) return res.redirect('/login?error=session_failed');

    setAuthCookie(res, s.token);
    res.redirect('/');
  } catch (e) {
    console.error('[auth/google]', e.message);
    res.redirect('/login?error=google_failed');
  }
});

// ═══ Telegram Login Widget ═══
router.post('/telegram', express.json(), async (req, res) => {
  try {
    const data = req.body || {};
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ ok: false, error: 'no_bot_token' });

    const v = authService.verifyTelegramAuth(data, botToken);
    if (!v.ok) return res.status(401).json({ ok: false, error: v.error });

    const tgUser = v.user;
    const r = await authService.getOrCreateUser({
      provider: 'telegram',
      providerId: tgUser.id,
      email: null,
      name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username,
      avatar: tgUser.photo_url || null
    });
    if (!r.ok) return res.status(500).json({ ok: false, error: 'user_failed' });

    const s = await authService.createSession(r.user.id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || ''
    });
    if (!s.ok) return res.status(500).json({ ok: false, error: 'session_failed' });

    setAuthCookie(res, s.token);
    res.json({ ok: true, user: r.user, isNew: r.isNew });
  } catch (e) {
    console.error('[auth/telegram]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══ Telegram Mini App ═══
router.post('/telegram-init', express.json(), async (req, res) => {
  try {
    const { initData } = req.body || {};
    if (!initData) return res.status(400).json({ ok: false, error: 'no_init_data' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ ok: false, error: 'no_bot_token' });

    const cryptoMod = require('crypto');
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return res.status(400).json({ ok: false, error: 'no_hash' });

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .map(pair => pair[0] + '=' + pair[1])
      .sort()
      .join(String.fromCharCode(10));

    const secretKey = cryptoMod.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = cryptoMod.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return res.status(401).json({ ok: false, error: 'invalid_hash' });

    const userStr = params.get('user');
    if (!userStr) return res.status(400).json({ ok: false, error: 'no_user' });
    const tgUser = JSON.parse(userStr);

    const r = await authService.getOrCreateUser({
      provider: 'telegram',
      providerId: tgUser.id,
      email: null,
      name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username,
      avatar: tgUser.photo_url || null
    });
    if (!r.ok) return res.status(500).json({ ok: false, error: 'user_failed' });

    const s = await authService.createSession(r.user.id, {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || ''
    });
    if (!s.ok) return res.status(500).json({ ok: false, error: 'session_failed' });

    setAuthCookie(res, s.token);
    res.json({ ok: true, user: r.user, isNew: r.isNew });
  } catch (e) {
    console.error('[auth/telegram-init]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ═══ Logout ═══
router.post('/logout', async (req, res) => {
  if (req.sessionToken) await authService.deleteSession(req.sessionToken);
  clearAuthCookie(res);
  res.json({ ok: true });
});

// ═══ Me ═══
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: req.user });
});

module.exports = router;
