const express = require('express');
const { pool } = require('../db');
const { buildQueue } = require('./apps');
const { decrypt } = require('../utils/crypto');
const { getCloneUrl, getGitCloneCommand } = require('../providers/git');

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


router.post('/push', async (req, res) => {
  const payload = req.body;
  const appName   = payload.repository?.name;
  const commitSha = payload.after || payload.checkout_sha; // github vs gitlab
  if (!appName) return res.status(400).end();
  if (!commitSha || commitSha === '0000000000000000000000000000000000000000')
    return res.status(200).json({ message: 'Skipped' });

  // Load app with all provider details
  const { rows } = await pool.query(`
    SELECT a.*,
           gp.provider, gp.base_url, gp.access_token, gp.username AS git_username,
           r.type AS registry_type, r.host AS registry_host,
           r.username AS registry_username, r.password_or_token,
           r.aws_region, r.aws_access_key, r.aws_secret_key, r.gcp_project,
           c.kubeconfig, c.type AS cluster_type, c.namespace_prefix
    FROM apps a
    LEFT JOIN git_providers gp ON gp.id = a.git_provider_id
    LEFT JOIN registries r ON r.id = a.registry_id
    LEFT JOIN clusters c ON c.id = a.cluster_id
    WHERE a.name = $1
  `, [appName]);

  if (!rows.length)
    return res.status(404).json({ error: `App "${appName}" not registered` });

  const app = rows[0];
  const repoUrl = app.repo_url || payload.repository.clone_url;

  // Build clone URL with auth
  const cloneUrl = getCloneUrl(
    app.provider || 'github',
    repoUrl,
    app.git_username,
    app.access_token ? decrypt(app.access_token) : null
  );

  const { rows: dep } = await pool.query(
    "INSERT INTO deployments (app_id, git_commit, status) VALUES ($1, $2, 'queued') RETURNING *",
    [app.id, commitSha]
  );

  await buildQueue.add('build', {
    appName,
    commitSha,
    deploymentId: dep[0].id,
    cloneUrl,
    gitProvider:  app.provider,
    registryType: app.registry_type || 'self-hosted',
    registryHost: app.registry_host || 'kind-registry:5000',
    registryUsername: app.registry_username,
    registryPassword: app.password_or_token ? decrypt(app.password_or_token) : null,
    awsRegion:    app.aws_region,
    awsAccessKey: app.aws_access_key ? decrypt(app.aws_access_key) : null,
    awsSecretKey: app.aws_secret_key ? decrypt(app.aws_secret_key) : null,
    kubeconfig:   app.kubeconfig ? decrypt(app.kubeconfig) : null,
    clusterType:  app.cluster_type || 'kind',
    appNamespace: app.namespace_prefix || 'paas',
  });

  res.json({ message: 'Build queued', deploymentId: dep[0].id });
});

module.exports = router;