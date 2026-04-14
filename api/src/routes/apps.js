const express = require('express');
const { Queue } = require('bullmq');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Apply auth to all app routes
router.use(requireAuth);

const buildQueue = new Queue('builds', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }
});

// POST /apps
router.post('/', async (req, res) => {
  const { name, repo_url, branch, git_provider_id, registry_id, cluster_id } = req.body;
  if (!name || !/^[a-z0-9-]+$/.test(name))
    return res.status(400).json({ error: 'Name must be lowercase letters, numbers, hyphens only' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO apps
         (user_id, name, subdomain, repo_url, branch, git_provider_id, registry_id, cluster_id)
       VALUES ($1, $2, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, name, repo_url, branch || 'main', git_provider_id, registry_id, cluster_id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505')
      return res.status(400).json({ error: 'App name already exists' });
    throw e;
  }
});

// GET /apps — only show user's own apps
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.*,
           d.status     AS deploy_status,
           d.git_commit AS last_commit,
           d.created_at AS last_deployed_at
    FROM apps a
    LEFT JOIN LATERAL (
      SELECT * FROM deployments
      WHERE app_id = a.id
      ORDER BY created_at DESC LIMIT 1
    ) d ON true
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
  `, [req.user.id]);
  res.json(rows);
});

// GET /apps/:name
router.get('/:name', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM apps WHERE name=$1 AND user_id=$2',
    [req.params.name, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /apps/:name
router.delete('/:name', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM apps WHERE name=$1 AND user_id=$2 RETURNING *',
    [req.params.name, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ message: `App ${req.params.name} deleted` });
});

// GET /apps/:name/logs
router.get('/:name/logs', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT bl.line, bl.logged_at
    FROM build_logs bl
    JOIN deployments d ON d.id  = bl.deployment_id
    JOIN apps a        ON a.id  = d.app_id
    WHERE a.name = $1 AND a.user_id = $2
    ORDER BY bl.logged_at ASC
  `, [req.params.name, req.user.id]);
  res.json(rows);
});

// GET /apps/:name/deployments — deployment history
router.get('/:name/deployments', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.* FROM deployments d
    JOIN apps a ON a.id = d.app_id
    WHERE a.name = $1 AND a.user_id = $2
    ORDER BY d.created_at DESC
  `, [req.params.name, req.user.id]);
  res.json(rows);
});

module.exports = { router, buildQueue };