const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const batchApi = kc.makeApiClient(k8s.BatchV1Api);


const test = async () => {
  try {
    
    const {body} = await batchApi.readNamespacedJob({
      name: 'build-myapp-e6fe347',
      namespace:'paas-builds',
    });
    // console.log(body);
  } catch (error) {
    console.log(error.body);
  }
  // batchApi.readNamespacedJob({
  //   name: 'build-myapp-e6fe347',
  //   namespace:'paas-builds',
  // }).then((res)=>{
  //   console.log(res);
  // })
};
test();

// k8sApi.listNamespacedPod({ namespace: 'default' }).then((res) => {
//     // console.log(res);
// });


// coreApi.createNamespace({body:{ metadata: { name: 'test' } }}).then((res)=>{
//   console.log(res);
// });

// const NAMESPACE = 'test';
// const REGISTRY  = 'localhost:5001';
// const image = `${REGISTRY}/myapp:main`;
// const body = {
//     metadata: { name: appName, namespace: NAMESPACE },
//     spec: {
//       replicas: 1,
//       selector: { matchLabels: { app: appName } },
//       template: {
//         metadata: { labels: { app: appName } },
//         spec: {
//           containers: [{
//             name: appName,
//             image,
//             ports: [{ containerPort: 3000 }],
//             imagePullPolicy: 'Always',
//           }]
//         }
//       }
//     }
//   };
// await appsApi.createNamespacedDeployment(NAMESPACE,body).then((res)=> {
//     console.log(res);
// });