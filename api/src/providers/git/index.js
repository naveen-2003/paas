// const { decrypt } = require('../../utils/crypto');

function getCloneUrl(provider, repoUrl, username, token) {
  const url = new URL(repoUrl);

  switch (provider) {
    case 'github':
      // https://x-access-token:<token>@github.com/user/repo.git
      return `https://x-access-token:${token}@${url.host}${url.pathname}`;

    case 'gitlab':
      // https://oauth2:<token>@gitlab.com/user/repo.git
      return `https://oauth2:${token}@${url.host}${url.pathname}`;

    case 'bitbucket':
      // https://<username>:<token>@bitbucket.org/user/repo.git
      return `https://${username}:${token}@${url.host}${url.pathname}`;

    case 'gitea':
      // Check if local — swap to internal service URL
      if (url.hostname === 'gitea.paas.local') {
        return `http://${username}:${token}@gitea-http.paas-system.svc.cluster.local:3000${url.pathname}`;
      }
      // Self-hosted Gitea with real domain
      return `http://${username}:${token}@${url.host}${url.pathname}`;

    default:
      // Generic — inject token if provided
      return token
        ? repoUrl.replace('https://', `https://${token}@`)
        : repoUrl;
  }
}

function getGitCloneCommand(provider, cloneUrl, isLocal) {
  const sslSkip = isLocal ? 'git config --global http.sslVerify false && ' : '';
  return `${sslSkip}git clone ${cloneUrl} /workspace && echo "✅ Clone done"`;
}

module.exports = { getCloneUrl, getGitCloneCommand };