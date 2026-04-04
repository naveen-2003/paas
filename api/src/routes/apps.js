const express = require('express');
const { Queue } = require('bullmq');
const { pool } = require('../db');

const router = express.Router();

const buildQueue = new Queue('builds', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }
});

// POST /apps — register a new app
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !/^[a-z0-9-]+$/.test(name))
    return res.status(400).json({ error: 'Name must be lowercase letters, numbers, hyphens only' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO apps (name, subdomain) VALUES ($1, $1) RETURNING *',
      [name]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(400).json({ error: 'App name already exists' });
  }
});

// GET /apps — list all apps with latest deploy status
router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.*,
           d.status   AS deploy_status,
           d.git_commit,
           d.created_at AS last_deployed_at
    FROM apps a
    LEFT JOIN LATERAL (
      SELECT * FROM deployments
      WHERE app_id = a.id
      ORDER BY created_at DESC LIMIT 1
    ) d ON true
    ORDER BY a.created_at DESC
  `);
  res.json(rows);
});

// GET /apps/:name — single app detail
router.get('/:name', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM apps WHERE name=$1', [req.params.name]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// GET /apps/:name/logs — build logs for latest deployment
router.get('/:name/logs', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT bl.line, bl.logged_at
    FROM build_logs bl
    JOIN deployments d ON d.id = bl.deployment_id
    JOIN apps a ON a.id = d.app_id
    WHERE a.name = $1
    ORDER BY bl.logged_at ASC
  `, [req.params.name]);
  res.json(rows);
});

// GET /apps/:name/deployments — deployment history
router.get('/:name/deployments', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.* FROM deployments d
    JOIN apps a ON a.id = d.app_id
    WHERE a.name = $1
    ORDER BY d.created_at DESC
  `, [req.params.name]);
  res.json(rows);
});

module.exports = { router, buildQueue };