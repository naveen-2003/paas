const express = require('express');
const { pool } = require('../db');
const { encrypt } = require('../utils/crypto');

const router = express.Router();

// ── Git Providers ─────────────────────────────────────────────────────────

router.get('/git', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, provider, name, base_url, username, created_at FROM git_providers'
  );
  res.json(rows); // never return tokens
});

router.post('/git', async (req, res) => {
  const { provider, name, base_url, access_token, username } = req.body;
  if (!provider || !access_token)
    return res.status(400).json({ error: 'provider and access_token required' });
  const { rows } = await pool.query(
    `INSERT INTO git_providers (provider, name, base_url, access_token, username)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, provider, name`,
    [provider, name, base_url, encrypt(access_token), username]
  );
  res.json(rows[0]);
});

router.delete('/git/:id', async (req, res) => {
  await pool.query('DELETE FROM git_providers WHERE id=$1', [req.params.id]);
  res.json({ message: 'deleted' });
});

// ── Registries ────────────────────────────────────────────────────────────

router.get('/registry', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, type, host, username, created_at FROM registries'
  );
  res.json(rows);
});

router.post('/registry', async (req, res) => {
  const { name, type, host, username, password_or_token,
          aws_region, aws_access_key, aws_secret_key, gcp_project } = req.body;
  if (!name || !type)
    return res.status(400).json({ error: 'name and type required' });
  const { rows } = await pool.query(
    `INSERT INTO registries
       (name, type, host, username, password_or_token,
        aws_region, aws_access_key, aws_secret_key, gcp_project)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, type, host`,
    [
      name, type,
      host || getDefaultHost(type),
      username,
      password_or_token ? encrypt(password_or_token) : null,
      aws_region,
      aws_access_key ? encrypt(aws_access_key) : null,
      aws_secret_key ? encrypt(aws_secret_key) : null,
      gcp_project,
    ]
  );
  res.json(rows[0]);
});

router.delete('/registry/:id', async (req, res) => {
  await pool.query('DELETE FROM registries WHERE id=$1', [req.params.id]);
  res.json({ message: 'deleted' });
});

// ── Clusters ──────────────────────────────────────────────────────────────

router.get('/cluster', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, type, namespace_prefix, created_at FROM clusters'
  );
  res.json(rows);
});

router.post('/cluster', async (req, res) => {
  const { name, type, kubeconfig, namespace_prefix } = req.body;
  if (!name || !kubeconfig)
    return res.status(400).json({ error: 'name and kubeconfig required' });
  const { rows } = await pool.query(
    `INSERT INTO clusters (name, type, kubeconfig, namespace_prefix)
     VALUES ($1, $2, $3, $4) RETURNING id, name, type`,
    [name, type || 'other', encrypt(kubeconfig), namespace_prefix || 'paas']
  );
  res.json(rows[0]);
});

router.delete('/cluster/:id', async (req, res) => {
  await pool.query('DELETE FROM clusters WHERE id=$1', [req.params.id]);
  res.json({ message: 'deleted' });
});

function getDefaultHost(type) {
  const hosts = {
    dockerhub: 'registry.hub.docker.com',
    ghcr: 'ghcr.io',
    gcr: 'gcr.io',
  };
  return hosts[type] || '';
}

module.exports = router;