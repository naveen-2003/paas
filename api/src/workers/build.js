require('dotenv').config();
const { Worker } = require('bullmq');
const { batchApi, coreApi } = require('../k8s/client');
const { pool } = require('../db');
const { deployApp } = require('../k8s/deploy');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
};

async function addLog(deploymentId, line) {
  console.log(`[build] ${line}`);
  await pool.query(
    'INSERT INTO build_logs (deployment_id, line) VALUES ($1, $2)',
    [deploymentId, line]
  );
}

async function waitForJob(jobName, namespace, deploymentId) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const { body } = await batchApi.readNamespacedJob(jobName, namespace);
      if (body.status?.succeeded) return true;
      if (body.status?.failed)    return false;
    } catch (e) { /* job not ready yet */ }
    await addLog(deploymentId, `  Building... (${(i + 1) * 5}s)`);
  }
  return false;
}

new Worker('builds', async (job) => {
  const { appName, commitSha, deploymentId, repoUrl } = job.data;
  const buildNs  = 'paas-builds';
  const shortSha = commitSha.slice(0, 7);
  const jobName  = `build-${appName}-${shortSha}`;
  const imageDest = `localhost:5001/${appName}:${shortSha}`;

  await addLog(deploymentId, `🔨 Build started: ${appName} @ ${shortSha}`);
  await addLog(deploymentId, `   Repo: ${repoUrl}`);

  // Ensure build namespace
  try {
    await coreApi.createNamespace({body:{ metadata: { name: buildNs } }});
  } catch (e) { if (e.statusCode !== 409) throw e; }

  // Create Kaniko Job
  const kanikoJob = {
    metadata: { name: jobName, namespace: buildNs },
    spec: {
      ttlSecondsAfterFinished: 120,
      template: {
        spec: {
          restartPolicy: 'Never',
          containers: [{
            name: 'kaniko',
            image: 'gcr.io/kaniko-project/executor:latest',
            args: [
              `--context=${repoUrl}`,
              `--destination=${imageDest}`,
              '--insecure',
              '--skip-tls-verify',
              '--insecure-pull',
            ]
          }]
        }
      }
    }
  };

  try {
    await batchApi.createNamespacedJob(buildNs, kanikoJob);
  } catch (e) { if (e.statusCode !== 409) throw e; }

  await addLog(deploymentId, `   Kaniko job created: ${jobName}`);

  const success = await waitForJob(jobName, buildNs, deploymentId);

  if (!success) {
    await pool.query(
      "UPDATE deployments SET status='failed', finished_at=NOW() WHERE id=$1",
      [deploymentId]
    );
    await addLog(deploymentId, '❌ Build FAILED');
    return;
  }

  await addLog(deploymentId, '✅ Build succeeded — deploying to Kubernetes...');

  await deployApp(appName, shortSha);

  await pool.query(
    "UPDATE deployments SET status='live', finished_at=NOW() WHERE id=$1",
    [deploymentId]
  );
  await addLog(deploymentId, `🚀 Live at http://${appName}.paas.local`);

}, { connection });

console.log('🔧 Build worker listening...');