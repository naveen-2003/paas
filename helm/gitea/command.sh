# helm install gitea gitea-charts/gitea \
#   --namespace paas-system \
#   --set service.http.type=ClusterIP \
#   --set gitea.admin.username=admin \
#   --set gitea.admin.password=admin1234 \
#   --set gitea.admin.email=admin@paas.local \
#   --set postgresql-ha.enabled=false \
#   --set redis-cluster.enabled=false \
#   --set gitea.config.database.DB_TYPE=sqlite3 \
#   --set persistence.size=1Gi \
#   --wait --timeout=120s


helm install gitea gitea-charts/gitea \
  --namespace paas-system \
  --version 12.5.0 \
  -f helm/gitea/values.yaml \
  --disable-openapi-validation

helm upgrade --install gitea gitea-charts/gitea \
  --version 12.5.0 \
  -f helm/gitea/values.yaml


# TLS Secret creation
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout server.key -out server.crt \
-subj "/CN=api.test1.local/O=gitea.paas.local" \
-addext "subjectAltName = DNS:gitea.paas.local"

kubectl create secret tls gitea-tls-secret --cert=server.crt --key=server.key


