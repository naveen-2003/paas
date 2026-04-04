const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const appsApi  = kc.makeApiClient(k8s.AppsV1Api);
const coreApi  = kc.makeApiClient(k8s.CoreV1Api);
const netApi   = kc.makeApiClient(k8s.NetworkingV1Api);
const batchApi = kc.makeApiClient(k8s.BatchV1Api);

module.exports = { kc, appsApi, coreApi, netApi, batchApi };