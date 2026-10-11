'use strict';

const authService = require('../services/auth-service');

const COOKIE_NAME = 'raheem_token';

function parseCookies(cookieHeader) {
    const out = {};
    if (!cookieHeader) return out;
    cookieHeader.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        out[k] = decodeURIComponent(v);
    });
    return out;
}

function attachUser(req, res, next) {
    try {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies[COOKIE_NAME];
        if (token) {
            const s = authService.getSession(token);
            if (s) {
                req.user = s.user;
                req.sessionToken = token;
            }
        }
    } catch (e) {}
    next();
}

function requireAuth(req, res, next) {
    if (req.user) return next();
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    return res.redirect('/login');
}

function setAuthCookie(res, token, maxAgeSec = 30 * 24 * 60 * 60) {
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Lax`
    );
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
}

module.exports = { attachUser, requireAuth, setAuthCookie, clearAuthCookie, COOKIE_NAME };
