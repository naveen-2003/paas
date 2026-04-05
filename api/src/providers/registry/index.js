// const { execSync } = require('child_process');

async function getRegistryConfig(registry) {
  switch (registry.type) {
    case 'dockerhub':
      return {
        host: 'registry.hub.docker.com',
        destination: `registry.hub.docker.com/${registry.username}`,
        authSecret: {
          username: registry.username,
          password: registry.password_or_token,
          server: 'https://index.docker.io/v1/',
        },
        insecure: false,
      };

    case 'ghcr':
      return {
        host: 'ghcr.io',
        destination: `ghcr.io/${registry.username}`,
        authSecret: {
          username: registry.username,
          password: registry.password_or_token,
          server: 'https://ghcr.io',
        },
        insecure: false,
      };

    case 'ecr':
      // Get ECR login token dynamically
      const ecrToken = await getECRToken(registry);
      return {
        host: `${registry.aws_account_id}.dkr.ecr.${registry.aws_region}.amazonaws.com`,
        destination: `${registry.aws_account_id}.dkr.ecr.${registry.aws_region}.amazonaws.com`,
        authSecret: {
          username: 'AWS',
          password: ecrToken,
          server: `https://${registry.aws_account_id}.dkr.ecr.${registry.aws_region}.amazonaws.com`,
        },
        insecure: false,
      };

    case 'gcr':
      return {
        host: 'gcr.io',
        destination: `gcr.io/${registry.gcp_project}`,
        authSecret: {
          username: '_json_key',
          password: registry.password_or_token, // service account JSON
          server: 'https://gcr.io',
        },
        insecure: false,
      };

    case 'self-hosted':
    default:
      return {
        host: registry.host,
        destination: registry.host,
        authSecret: registry.username ? {
          username: registry.username,
          password: registry.password_or_token,
          server: `http://${registry.host}`,
        } : null,
        insecure: true, // assume self-hosted is HTTP
      };
  }
}

async function getECRToken(registry) {
  const AWS = require('@aws-sdk/client-ecr');
  const client = new AWS.ECRClient({
    region: registry.aws_region,
    credentials: {
      accessKeyId: registry.aws_access_key,
      secretAccessKey: registry.aws_secret_key,
    },
  });
  const { authorizationData } = await client.send(new AWS.GetAuthorizationTokenCommand({}));
  const token = Buffer.from(authorizationData[0].authorizationToken, 'base64').toString();
  return token.split(':')[1]; // returns password part of "AWS:<token>"
}

module.exports = { getRegistryConfig };