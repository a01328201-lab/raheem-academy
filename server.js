require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: '64kb' }));

const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { index: false }));
}

const { attachUser, requireAuth } = require('./middleware/auth');
app.use(attachUser);

// Auth routes
try {
  app.use('/auth', require('./handlers/auth-handlers'));
} catch (e) {
  console.error('⚠️ auth-handlers:', e.message);
}

// الصفحة الرئيسية
app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login');
  const portal = path.join(PUBLIC_DIR, 'portal.html');
  const index = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(portal)) return res.sendFile(portal);
  if (fs.existsSync(index)) return res.sendFile(index);
  res.send('<h1>Raheem Academy</h1>');
});

// صفحة الدخول
app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// صفحة الأكاديمية
app.get('/academy', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'academy.html'));
});

// الاشتراك
app.get('/subscription', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'subscription.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('════════════════════════════');
  console.log('🎓 Raheem Academy Server');
  console.log('🌐 Port: ' + PORT);
  console.log('════════════════════════════');
});

process.on('uncaughtException', (e) => console.error('[UNCAUGHT]', e.message));
process.on('unhandledRejection', (e) => console.error('[UNHANDLED]', e));
