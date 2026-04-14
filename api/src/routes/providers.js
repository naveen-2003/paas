const express = require('express');
const { pool } = require('../db');
const { encrypt } = require('../utils/crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Apply auth to all provider routes
router.use(requireAuth);

// ── Git Providers ──────────────────────────────────────────────────────────

router.get('/git', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, provider, name, base_url, username, created_at FROM git_providers WHERE user_id=$1',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/git', async (req, res) => {
  const { provider, name, base_url, access_token, username } = req.body;
  if (!provider || !access_token)
    return res.status(400).json({ error: 'provider and access_token required' });
  const { rows } = await pool.query(
    `INSERT INTO git_providers (user_id, provider, name, base_url, access_token, username)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, provider, name, username`,
    [req.user.id, provider, name, base_url, encrypt(access_token), username]
  );
  res.status(201).json(rows[0]);
});

router.delete('/git/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM git_providers WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Git provider deleted' });
});

// ── Registries ────────────────────────────────────────────────────────────

router.get('/registry', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, type, host, username, created_at FROM registries WHERE user_id=$1',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/registry', async (req, res) => {
  const {
    name, type, host, username, password_or_token,
    aws_region, aws_access_key, aws_secret_key, gcp_project
  } = req.body;
  if (!name || !type)
    return res.status(400).json({ error: 'name and type required' });

  const { rows } = await pool.query(
    `INSERT INTO registries
       (user_id, name, type, host, username, password_or_token,
        aws_region, aws_access_key, aws_secret_key, gcp_project)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, name, type, host`,
    [
      req.user.id, name, type,
      host || getDefaultHost(type),
      username,
      password_or_token ? encrypt(password_or_token) : null,
      aws_region,
      aws_access_key ? encrypt(aws_access_key) : null,
      aws_secret_key ? encrypt(aws_secret_key) : null,
      gcp_project,
    ]
  );
  res.status(201).json(rows[0]);
});

router.delete('/registry/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM registries WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Registry deleted' });
});

// ── Clusters ──────────────────────────────────────────────────────────────

router.get('/cluster', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, type, namespace_prefix, created_at FROM clusters WHERE user_id=$1',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/cluster', async (req, res) => {
  const { name, type, kubeconfig, namespace_prefix } = req.body;
  if (!name || !kubeconfig)
    return res.status(400).json({ error: 'name and kubeconfig required' });
  const { rows } = await pool.query(
    `INSERT INTO clusters (user_id, name, type, kubeconfig, namespace_prefix)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, type, namespace_prefix`,
    [req.user.id, name, type || 'other', encrypt(kubeconfig), namespace_prefix || 'paas']
  );
  res.status(201).json(rows[0]);
});

router.delete('/cluster/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM clusters WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Cluster deleted' });
});

function getDefaultHost(type) {
  const hosts = {
    dockerhub: 'registry.hub.docker.com',
    ghcr:      'ghcr.io',
    gcr:       'gcr.io',
    ecr:       'amazonaws.com',
  };
  return hosts[type] || '';
}

module.exports = router;