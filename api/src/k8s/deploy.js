const { appsApi, coreApi, netApi } = require('./client');

const NAMESPACE = 'paas-apps';
const REGISTRY  = 'localhost:5001';

async function ensureNamespace(ns) {
  try {
    await coreApi.createNamespace({body:{ metadata: { name: ns } }});
  } catch (e) { if (e.statusCode !== 409) throw e; }
}

async function applyDeployment(appName, imageTag) {
  const image = `${REGISTRY}/${appName}:${imageTag}`;
  const body = {
    metadata: { name: appName, namespace: NAMESPACE },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: appName } },
      template: {
        metadata: { labels: { app: appName } },
        spec: {
          containers: [{
            name: appName,
            image,
            ports: [{ containerPort: 3000 }],
            imagePullPolicy: 'Always',
          }]
        }
      }
    }
  };
  try {
    await appsApi.createNamespacedDeployment(NAMESPACE, body);
  } catch (e) {
    if (e.statusCode === 409)
      await appsApi.replaceNamespacedDeployment(appName, NAMESPACE, body);
    else throw e;
  }
}

async function applyService(appName) {
  const body = {
    metadata: { name: appName, namespace: NAMESPACE },
    spec: {
      selector: { app: appName },
      ports: [{ port: 80, targetPort: 3000 }]
    }
  };
  try {
    await coreApi.createNamespacedService(NAMESPACE, body);
  } catch (e) { if (e.statusCode !== 409) throw e; }
}

async function applyIngress(appName) {
  const host = `${appName}.paas.local`;
  const body = {
    metadata: {
      name: appName,
      namespace: NAMESPACE,
      annotations: { 'nginx.ingress.kubernetes.io/rewrite-target': '/' }
    },
    spec: {
      ingressClassName: 'nginx',
      rules: [{
        host,
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: { service: { name: appName, port: { number: 80 } } }
          }]
        }
      }]
    }
  };
  try {
    await netApi.createNamespacedIngress(NAMESPACE, body);
  } catch (e) {
    if (e.statusCode === 409)
      await netApi.replaceNamespacedIngress(appName, NAMESPACE, body);
    else throw e;
  }
}

async function deployApp(appName, imageTag) {
  await ensureNamespace(NAMESPACE);
  await applyDeployment(appName, imageTag);
  await applyService(appName);
  await applyIngress(appName);
  console.log(`✅ Deployed ${appName} → http://${appName}.paas.local`);
}

module.exports = { deployApp };