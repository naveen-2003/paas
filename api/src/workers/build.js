require('dotenv').config();
const { Worker } = require('bullmq');
// const { batchApi, coreApi } = require('../k8s/client');
const { pool } = require('../db');
const { deployApp } = require('../k8s/deploy');
const { getRegistryConfig } = require('../providers/registry');
const { getK8sClients } = require('../providers/cluster');

const BUILD_NAMESPACE = process.env.BUILD_NAMESPACE || 'paas-builds'

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

async function waitForJob(jobName, appNamespace, deploymentId, clusterApi) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const job = await clusterApi.batchApi.readNamespacedJob({
        name: jobName,
        namespace: appNamespace,
      });
      // New client returns object directly, no .body wrapper
      if (job.status?.succeeded) return true;
      if (job.status?.failed) return false;
    } catch (e) {
      console.log('Job not ready yet:', e.message);
    }
    await addLog(deploymentId, `  Building... (${(i + 1) * 5}s elapsed)`);
    // if ((i + 1) % 12 == 0) {
    //   await addLog(deploymentId, `  Building... (${(i + 1) * 5}s elapsed)`);
    // }
    // else {
    //   console.log(`[build]  Building... (${(i + 1) * 5}s elapsed)`);
    // }
  }
  return false;
}

// ─── Fetch kaniko pod logs when build fails ───────────────────────────────
async function fetchKanikoLogs(jobName, appNamespace, deploymentId, clusterApi) {
  try {
    console.log(jobName + ' ' + appNamespace + " " + deploymentId + " " + clusterApi);
    const { body: podList } = await clusterApi.coreApi.listNamespacedPod({
      namespace: appNamespace,
      labelSelector: `job-name=${jobName}`,
    });
    console.log(podList);
    const podName = podList.items[0]?.metadata?.name;
    if (!podName) return;

    const { body: logs } = await clusterApi.coreApi.readNamespacedPodLog({
      name: podName,
      namespace: appNamespace,
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
  try {

    const {
      appName, commitSha, deploymentId,
      cloneUrl, gitProvider,
      registryType, registryHost, registryUsername, registryPassword,
      awsRegion, awsAccessKey, awsSecretKey,
      kubeconfig, clusterType, appNamespace,
    } = job.data;

    const shortSha = commitSha.slice(0, 7);
    const jobName = `build-${appName}-${shortSha}`;

    await addLog(deploymentId, `🔨 Build started: ${appName} @ ${shortSha}`);
    await addLog(deploymentId, `   Repo: ${cloneUrl}`);

    // Get registry config
    const regConfig = await getRegistryConfig({
      type: registryType,
      host: registryHost,
      username: registryUsername,
      password_or_token: registryPassword,
      aws_region: awsRegion,
      aws_access_key: awsAccessKey,
      aws_secret_key: awsSecretKey,
    });

    const imageDest = `${regConfig.destination}/${appName}:${shortSha}`;

    // Get K8s clients for this app's cluster
    // const clients = kubeconfig
    //   ? getK8sClients({ kubeconfig: `encrypted:${kubeconfig}` }) // already decrypted
    //   : { appsApi, coreApi, netApi, batchApi }; // fallback to default
    const clusterApi = getK8sClients({ kubeconfig: `${kubeconfig}` });
    console.log(`Test: ${clusterApi}`);

    const isLocal = gitProvider === 'gitea' && cloneUrl.includes('svc.cluster.local');

    const kanikoArgs = [
      '--context=dir:///workspace',
      '--dockerfile=Dockerfile',
      `--destination=${imageDest}`,
      '--image-download-retry=3',
      '--skip-tls-verify',
      '--skip-tls-verify-pull',
      '--insecure',
      '--insecure-pull'
    ];


    const kanikoJob = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: jobName, namespace: BUILD_NAMESPACE },
      spec: {
        ttlSecondsAfterFinished: 120,
        template: {
          spec: {
            restartPolicy: 'Never',
            initContainers: [{
              name: 'git-clone',
              image: 'alpine/git:latest',
              command: ['sh', '-c'],
              args: [
                `${isLocal ? 'git config --global http.sslVerify false && ' : ''}git clone ${cloneUrl} /workspace && echo "✅ Clone done"`
              ],
              volumeMounts: [{ name: 'workspace', mountPath: '/workspace' }]
            }],
            containers: [{
              name: 'kaniko',
              image: 'gcr.io/kaniko-project/executor:latest',
              imagePullPolicy: "IfNotPresent",
              args: kanikoArgs,
              volumeMounts: [{ name: 'workspace', mountPath: '/workspace' }]
            }],
            volumes: [{ name: 'workspace', emptyDir: {} }]
          }
        }
      }
    };

    // Ensure build namespace
    try {
      await clusterApi.coreApi.createNamespace({ body: { metadata: { name: BUILD_NAMESPACE } } });
    } catch (e) {
      // console.log(e);
      if (e.code !== 409) throw e;
    }

    // Registry auth secret name (created before job)
    if (regConfig.authSecret) {
      // kanikoArgs.push(`--registry-credentials=${regConfig.host}=${regConfig.authSecret.username}:${regConfig.authSecret.password}`);
      const dockerConfig = {
        auths: {
          [regConfig.authSecret.server]: {
            auth: Buffer.from(
              `${regConfig.authSecret.username}:${regConfig.authSecret.password}`
            ).toString('base64'),
          },
        },
      };

      const secretName = `kaniko-creds-${jobName}`;
      try {
        await clusterApi.coreApi.createNamespacedSecret({
          namespace: BUILD_NAMESPACE,
          body: {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: { name: secretName, namespace: BUILD_NAMESPACE },
            stringData: {
              'config.json': JSON.stringify(dockerConfig),
            },
          }
        });
      } catch (e) {
        if (e.code !== 409) throw e;
      }

      // Add volume + mount to the job spec
      kanikoJob.spec.template.spec.volumes.push({
        name: 'docker-config',
        secret: {
          secretName,
          items: [{ key: 'config.json', path: 'config.json' }],
        },
      });

      kanikoJob.spec.template.spec.containers[0].volumeMounts.push({
        name: 'docker-config',
        mountPath: '/kaniko/.docker',
      });

    }

    try {
      await clusterApi.batchApi.createNamespacedJob({
        namespace: BUILD_NAMESPACE,
        body: kanikoJob,
      });
      await addLog(deploymentId, `   Kaniko job created: ${jobName}`);
      await addLog(deploymentId, `   Image destination: ${imageDest}`);
    } catch (e) {
      if (e.code !== 409) throw e;
      await addLog(deploymentId, `   Job already exists, reusing: ${jobName}`);
    }

    // ─── Wait for job to complete ─────────────────────────────────────────
    const success = await waitForJob(jobName, BUILD_NAMESPACE, deploymentId, clusterApi);

    if (!success) {
      // ─── FAILURE: fetch kaniko logs to show what went wrong ───────────
      await fetchKanikoLogs(jobName, BUILD_NAMESPACE, deploymentId, clusterApi);

      await pool.query(
        "UPDATE deployments SET status='failed', finished_at=NOW() WHERE id=$1",
        [deploymentId]
      );
      await addLog(deploymentId, '❌ Build FAILED');
      return;
    }

    // ─── SUCCESS: deploy to Kubernetes ───────────────────────────────────
    await addLog(deploymentId, '✅ Build succeeded — deploying...');

    // Will not work, since the image's registry access need to specified
    await deployApp(appName, appNamespace, imageDest, clusterApi);

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