// const { appsApi, coreApi, netApi } = require('./client');

// const NAMESPACE = 'paas-apps';
// const REGISTRY  = 'kind-registry:5000';

async function ensureNamespace(ns, clusterApi) {
  try {
    await clusterApi.coreApi.createNamespace({ body: { metadata: { name: ns } } });
  } catch (e) { if (e.code !== 409) throw e; }
}

async function applyDeployment(appName, appNamespace, imageDest, clusterApi) {
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
    await clusterApi.appsApi.createNamespacedDeployment({
      namespace: appNamespace,
      body: manifest,
    });
    console.log(`✅ Deployment created: ${appName}`);
  } catch (e) {
    if (e.code === 409) {
      await clusterApi.appsApi.replaceNamespacedDeployment({
        name: appName,
        namespace: appNamespace,
        body: manifest,
      });
      console.log(`✅ Deployment updated: ${appName}`);
    } else throw e;
  }
}

async function applyService(appName, appNamespace, clusterApi) {
  const manifest = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: appName, namespace: appNamespace },
    spec: {
      selector: { app: appName },
      ports: [{ port: 80, targetPort: 3000 }]
    }
  };
  try {
    await clusterApi.coreApi.createNamespacedService({
      namespace: appNamespace,
      body: manifest,
    });
    console.log(`✅ Service created: ${appName}`);
  } catch (e) { if (e.code !== 409) throw e; }
}

async function applyIngress(appName, appNamespace, clusterApi) {
  const host = `${appName}.paas.local`;
  const manifest = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: appName,
      namespace: appNamespace,
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
    await clusterApi.netApi.createNamespacedIngress({
      namespace: appNamespace,
      body: manifest,
    });
    console.log(`✅ Ingress created: ${host}`);
  } catch (e) {
    if (e.code === 409) {
      await clusterApi.netApi.replaceNamespacedIngress({
        name: appName,
        namespace: appNamespace,
        body: manifest,
      });
      console.log(`✅ Ingress updated: ${host}`);
    } else throw e;
  }
}

async function deployApp(appName, appNamespace, imageDest, clusterApi) {
  await ensureNamespace(appNamespace, clusterApi);
  await applyDeployment(appName, appNamespace, imageDest, clusterApi);
  await applyService(appName, appNamespace, clusterApi);
  await applyIngress(appName, appNamespace, clusterApi);
  console.log(`🚀 ${appName} → http://${appName}.paas.local`);
}

module.exports = { deployApp };