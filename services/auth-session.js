const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'sessions.db'));

const sessionMiddleware = session({
    store: new SQLiteStore({
        client: db,
        expired: { clear: true, intervalMs: 900000 } // كل 15 دقيقة
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // أسبوع
        httpOnly: true,
        secure: false, // خليها true لو HTTPS
        sameSite: 'lax'
    },
    name: 'raheem.sid'
});

// Middleware للتحقق من الدخول
function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
}

module.exports = { sessionMiddleware, requireAuth };
