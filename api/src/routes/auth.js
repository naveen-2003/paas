const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { pool } = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(password, 12);

    // First user becomes admin automatically
    const { rows: existing } = await pool.query('SELECT COUNT(*) FROM users');
    const role = parseInt(existing[0].count) === 0 ? 'admin' : 'user';

    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email.toLowerCase(), hash, role]
    );
    const token = generateToken(rows[0].id);
    res.status(201).json({ user: rows[0], token });
  } catch (e) {
    if (e.code === '23505')
      return res.status(400).json({ error: 'Email already registered' });
    throw e;
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email=$1', [email.toLowerCase()]
  );
  if (!rows.length)
    return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid)
    return res.status(401).json({ error: 'Invalid email or password' });

  const token = generateToken(rows[0].id);
  res.json({
    user: { id: rows[0].id, email: rows[0].email, role: rows[0].role },
    token,
  });
});

// GET /auth/me — get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json(req.user);
});

// POST /auth/api-keys — generate a new API key
router.post('/api-keys', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ error: 'name required' });

  // Generate a secure random key
  const rawKey  = `paas_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await pool.query(
    'INSERT INTO api_keys (user_id, name, key_hash) VALUES ($1, $2, $3)',
    [req.user.id, name, keyHash]
  );

  // Return raw key ONCE — never stored in plaintext
  res.status(201).json({
    name,
    key: rawKey,
    note: 'Save this key — it will not be shown again',
  });
});

// GET /auth/api-keys — list API keys
router.get('/api-keys', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, last_used, created_at FROM api_keys WHERE user_id=$1',
    [req.user.id]
  );
  res.json(rows);
});

// DELETE /auth/api-keys/:id — revoke an API key
router.delete('/api-keys/:id', requireAuth, async (req, res) => {
  await pool.query(
    'DELETE FROM api_keys WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'API key revoked' });
});

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = router;