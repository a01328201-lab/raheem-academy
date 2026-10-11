require('dotenv').config();
'use strict';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});
pool.on('error', (e) => console.error('[pg]', e.message));
async function query(sql, params = []) { const r = await pool.query(sql, params); return r.rows; }
async function queryOne(sql, params = []) { const r = await pool.query(sql, params); return r.rows[0] || null; }
async function exec(sql, params = []) { const r = await pool.query(sql, params); return { changes: r.rowCount }; }
module.exports = { pool, query, queryOne, exec };
