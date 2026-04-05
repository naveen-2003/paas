const express = require('express');
const { pool } = require('../db');
const { buildQueue } = require('./apps');

const router = express.Router();

// POST /webhooks/gitea — called by Gitea on every push
router.post('/gitea', async (req, res) => {
  const payload = req.body;

  if (!payload?.repository?.name)
    return res.status(400).json({ error: 'Invalid payload' });

  const appName   = payload.repository.name;
  const commitSha = payload.after;
  const repoUrl   = payload.repository.clone_url;
  // console.log(payload.repository);
  // const repoUrl = `https://admin:admin1234@gitea-http.paas-system.svc.cluster.local:3000/admin/${appName}.git`;
  console.log(`Gitea Payload: ${repoUrl}`);

  if (!commitSha || commitSha === '0000000000000000000000000000000000000000')
    return res.status(200).json({ message: 'Skipped (branch delete)' });

  // Look up app
  const { rows } = await pool.query(
    'SELECT * FROM apps WHERE name=$1', [appName]
  );
  if (!rows.length)
    return res.status(404).json({ error: `App "${appName}" not registered. POST /apps first.` });

  // Create deployment record
  const { rows: dep } = await pool.query(
    "INSERT INTO deployments (app_id, git_commit, status) VALUES ($1, $2, 'queued') RETURNING *",
    [rows[0].id, commitSha]
  );

  // Enqueue build
  await buildQueue.add('build', {
    appName,
    commitSha,
    deploymentId: dep[0].id,
    repoUrl,
  });

  console.log(`📦 Build queued: ${appName} @ ${commitSha.slice(0, 7)}`);
  res.json({ message: 'Build queued', deploymentId: dep[0].id });
});

module.exports = router;