const { appsApi, coreApi, netApi } = require('./client');

// const NAMESPACE = 'paas-apps';
// const REGISTRY  = 'kind-registry:5000';

async function ensureNamespace(ns) {
  try {
    await coreApi.createNamespace({ body: { metadata: { name: ns } } });
  } catch (e) { if (e.code !== 409) throw e; }
}

async function applyDeployment(appName, appNamespace, imageDest) {
  // const image = `${REGISTRY}/${appName}:${imageTag}`;
  const image = imageDest;
  const manifest = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: appName, namespace: appNamespace },
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
    await appsApi.createNamespacedDeployment({
      namespace: NAMESPACE,
      body: manifest,
    });
    console.log(`✅ Deployment created: ${appName}`);
  } catch (e) {
    if (e.code === 409) {
      await appsApi.replaceNamespacedDeployment({
        name: appName,
        namespace: NAMESPACE,
        body: manifest,
      });
      console.log(`✅ Deployment updated: ${appName}`);
    } else throw e;
  }
}

async function applyService(appName) {
  const manifest = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: appName, namespace: NAMESPACE },
    spec: {
      selector: { app: appName },
      ports: [{ port: 80, targetPort: 3000 }]
    }
  };
  try {
    await coreApi.createNamespacedService({
      namespace: NAMESPACE,
      body: manifest,
    });
    console.log(`✅ Service created: ${appName}`);
  } catch (e) { if (e.code !== 409) throw e; }
}

async function applyIngress(appName) {
  const host = `${appName}.paas.local`;
  const manifest = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
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
    await netApi.createNamespacedIngress({
      namespace: NAMESPACE,
      body: manifest,
    });
    console.log(`✅ Ingress created: ${host}`);
  } catch (e) {
    if (e.code === 409) {
      await netApi.replaceNamespacedIngress({
        name: appName,
        namespace: NAMESPACE,
        body: manifest,
      });
      console.log(`✅ Ingress updated: ${host}`);
    } else throw e;
  }
}

async function deployApp(appName, appNamespace, imageDest) {
  await ensureNamespace(appNamespace);
  await applyDeployment(appName, appNamespace, imageDest);
  await applyService(appName, appNamespace);
  await applyIngress(appName, appNamespace);
  console.log(`🚀 ${appName} → http://${appName}.paas.local`);
}

module.exports = { deployApp };