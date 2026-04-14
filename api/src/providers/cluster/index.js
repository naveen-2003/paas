const k8s = require('@kubernetes/client-node');
const { decrypt } = require('../../utils/crypto');

function getK8sClients(cluster) {
  const kc = new k8s.KubeConfig();

  // Load from stored kubeconfig (works for ALL cluster types)
  // const kubeconfig = decrypt(cluster.kubeconfig);
  kc.loadFromString(cluster.kubeconfig);

  return {
    appsApi:  kc.makeApiClient(k8s.AppsV1Api),
    coreApi:  kc.makeApiClient(k8s.CoreV1Api),
    netApi:   kc.makeApiClient(k8s.NetworkingV1Api),
    batchApi: kc.makeApiClient(k8s.BatchV1Api),
    kc,
  };
}

module.exports = { getK8sClients };