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
      const job = await batchApi.readNamespacedJob({
        name: jobName,
        namespace,
      });
      // New client returns object directly, no .body wrapper
      if (job.status?.succeeded) return true;
      if (job.status?.failed)    return false;
    } catch (e) {
      console.log('Job not ready yet:', e.message);
    }
    await addLog(deploymentId, `  Building... (${(i + 1) * 5}s elapsed)`);
  }
  return false;
}

// ─── Fetch kaniko pod logs when build fails ───────────────────────────────
async function fetchKanikoLogs(jobName, buildNs, deploymentId) {
  try {
    const { body: podList } = await coreApi.listNamespacedPod({
      namespace: buildNs,
      labelSelector: `job-name=${jobName}`,
    });
    const podName = podList.items[0]?.metadata?.name;
    if (!podName) return;

    const { body: logs } = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace: buildNs,
    });

    await addLog(deploymentId, '--- Kaniko logs (last 20 lines) ---');
    for (const line of logs.split('\n').slice(-20)) {
      if (line.trim()) await addLog(deploymentId, line);
    }
  } catch (e) {
    await addLog(deploymentId, `(could not fetch kaniko logs: ${e.message})`);
  }
}

new Worker('builds', async (job) => {
  const { appName, commitSha, deploymentId, repoUrl } = job.data;
  const buildNs  = 'paas-builds';
  const shortSha = commitSha.slice(0, 7);
  const jobName  = `build-${appName}-${shortSha}`;
  // const imageDest = `host.docker.internal:5001/${appName}:${shortSha}`;
  const imageDest = `kind-registry:5000/${appName}:${shortSha}`;
  // console.log(job.data);
  try {
    await addLog(deploymentId, `🔨 Build started: ${appName} @ ${shortSha}`);
    await addLog(deploymentId, `   Repo: ${repoUrl}`);

    // Ensure build namespace
    try {
      await coreApi.createNamespace({ body: { metadata: { name: buildNs } } });
    } catch (e) { if (e.code !== 409) throw e; }

    // Create Kaniko Job
    // const kanikoJob = {
    //   apiVersion: 'batch/v1',
    //   kind: 'Job',
    //   metadata: { name: jobName, namespace: buildNs },
    //   spec: {
    //     ttlSecondsAfterFinished: 120,
    //     template: {
    //       spec: {
    //         restartPolicy: 'Never',
    //         containers: [{
    //           name: 'kaniko',
    //           image: 'gcr.io/kaniko-project/executor:latest',
    //           imagePullPolicy: 'IfNotPresent',
    //           args: [
    //             `--context=${repoUrl}`,
    //             `--destination=${imageDest}`,
    //             // '--insecure',
    //             // '--insecure-pull',
    //             // '--skip-tls-verify',
    //             // '--skip-tls-verify-pull',
    //           ]
    //         }]
    //       }
    //     }
    //   }
    // };

    // Smart clone URL — use internal service for local Gitea, original URL for GitHub/others
    const isLocalGitea = repoUrl.includes('gitea.paas.local') || repoUrl.includes('gitea-http');
    const cloneUrl = isLocalGitea
      ? `http://gitea-http.paas-system.svc.cluster.local:3000/admin/${appName}.git`
      : repoUrl;  // GitHub, GitLab, etc — use as-is

    const gitCloneCmd = isLocalGitea
      ? `git config --global http.sslVerify false && git clone ${cloneUrl} /workspace`
      : `git clone ${cloneUrl} /workspace`;  // GitHub uses valid HTTPS, no skip needed
    const kanikoJob = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: jobName, namespace: buildNs },
      spec: {
        ttlSecondsAfterFinished: 120,
        template: {
          spec: {
            restartPolicy: 'Never',
            initContainers: [{
              name: 'git-clone',
              image: 'alpine/git:latest',
              imagePullPolicy: 'IfNotPresent',
              command: ['sh', '-c'],
              args: [`${gitCloneCmd} && echo "Clone done" && ls /workspace`],
              volumeMounts: [{ name: 'workspace', mountPath: '/workspace' }]
            }],
            containers: [{
              name: 'kaniko',
              image: 'gcr.io/kaniko-project/executor:latest',
              imagePullPolicy: 'IfNotPresent',
              args: [
                '--context=dir:///workspace',      // ← always dir, never URL
                '--dockerfile=Dockerfile',
                `--destination=${imageDest}`,
                '--insecure',                      // push over HTTP
                '--insecure-pull',                 // pull base images over HTTP if needed
                '--skip-tls-verify',               // skip TLS for registry
                '--skip-tls-verify-pull',          // skip TLS for pulling base images
              ],
              volumeMounts: [{ name: 'workspace', mountPath: '/workspace' }]
            }],
            volumes: [{ name: 'workspace', emptyDir: {} }]
          }
        }
      }
    };

    try {
      await batchApi.createNamespacedJob({
        namespace: buildNs,
        body: kanikoJob,
      });
      await addLog(deploymentId, `   Kaniko job created: ${jobName}`);
      await addLog(deploymentId, `   Image destination: ${imageDest}`);
    } catch (e) {
      if (e.code !== 409) throw e;
      await addLog(deploymentId, `   Job already exists, reusing: ${jobName}`);
    }

    // ─── Wait for job to complete ─────────────────────────────────────────
    const success = await waitForJob(jobName, buildNs, deploymentId);

    if (!success) {
      // ─── FAILURE: fetch kaniko logs to show what went wrong ───────────
      await fetchKanikoLogs(jobName, buildNs, deploymentId);

      await pool.query(
        "UPDATE deployments SET status='failed', finished_at=NOW() WHERE id=$1",
        [deploymentId]
      );
      await addLog(deploymentId, '❌ Build FAILED');
      return;
    }

    // ─── SUCCESS: deploy to Kubernetes ───────────────────────────────────
    await addLog(deploymentId, '✅ Build succeeded — deploying...');
    await deployApp(appName, shortSha);

    await pool.query(
      "UPDATE deployments SET status='live', finished_at=NOW() WHERE id=$1",
      [deploymentId]
    );
    await addLog(deploymentId, `🚀 Live at http://${appName}.paas.local`);

  } catch (e) {
    console.error('Worker error:', e);
    await addLog(deploymentId, `💥 Unexpected error: ${e.message}`);
    await pool.query(
      "UPDATE deployments SET status='failed', finished_at=NOW() WHERE id=$1",
      [deploymentId]
    );
  }

}, { connection });

console.log('🔧 Build worker listening...');