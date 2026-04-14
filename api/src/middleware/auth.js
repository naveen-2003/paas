const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ── Verify JWT token ───────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: 'Authorization header required' });

  const [scheme, token] = authHeader.split(' ');

  // Bearer token — JWT (dashboard)
  if (scheme === 'Bearer') {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const { rows } = await pool.query(
        'SELECT id, email, role FROM users WHERE id=$1', [payload.userId]
      );
      if (!rows.length)
        return res.status(401).json({ error: 'User not found' });
      req.user = rows[0];
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // ApiKey token — for CLI and webhooks
  if (scheme === 'ApiKey') {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.role
      FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = $1
    `, [keyHash]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid API key' });

    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used=NOW() WHERE key_hash=$1', [keyHash]
    );
    req.user = rows[0];
    return next();
  }

  return res.status(401).json({ error: 'Invalid authorization scheme. Use Bearer or ApiKey' });
}

// ── Require admin role ─────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ── Webhook HMAC verification ──────────────────────────────────────────────
function verifyWebhookSignature(secret) {
  return (req, res, next) => {
    const signature = req.headers['x-gitea-signature'] ||
                      req.headers['x-hub-signature-256'] ||
                      req.headers['x-gitlab-token'];

    if (!signature)
      return res.status(401).json({ error: 'Missing webhook signature' });

    // GitHub/Gitea style: sha256=<hash>
    if (signature.startsWith('sha256=')) {
      const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (signature !== expected)
        return res.status(401).json({ error: 'Invalid webhook signature' });
      return next();
    }

    // GitLab style: plain token
    if (signature === secret) return next();

    return res.status(401).json({ error: 'Invalid webhook signature' });
  };
}

module.exports = { requireAuth, requireAdmin, verifyWebhookSignature, JWT_SECRET };