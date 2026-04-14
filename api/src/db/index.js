const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'paas',
  password: process.env.PG_PASSWORD || 'paas1234',
  database: process.env.PG_DATABASE || 'paasdb',
});

async function init() {
  await pool.query(`

    -- ── Users ─────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT        NOT NULL,
      role          VARCHAR(32) DEFAULT 'user',  -- user, admin
      created_at    TIMESTAMP DEFAULT NOW()
    );

    -- ── API Keys (for CLI/webhooks) ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS api_keys (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name       VARCHAR(64) NOT NULL,
      key_hash   TEXT        NOT NULL,
      last_used  TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- ── Git Providers ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS git_providers (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      provider     VARCHAR(32) NOT NULL,
      name         VARCHAR(64) NOT NULL,
      base_url     TEXT,
      access_token TEXT        NOT NULL,
      username     TEXT,
      created_at   TIMESTAMP DEFAULT NOW()
    );

    -- ── Container Registries ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS registries (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name              VARCHAR(64) NOT NULL,
      type              VARCHAR(32) NOT NULL,
      host              TEXT        NOT NULL,
      username          TEXT,
      password_or_token TEXT,
      aws_region        TEXT,
      aws_access_key    TEXT,
      aws_secret_key    TEXT,
      gcp_project       TEXT,
      created_at        TIMESTAMP DEFAULT NOW()
    );

    -- ── Clusters ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS clusters (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name             VARCHAR(64) NOT NULL,
      type             VARCHAR(32) NOT NULL,
      kubeconfig       TEXT        NOT NULL,
      namespace_prefix VARCHAR(32) DEFAULT 'apps',
      created_at       TIMESTAMP DEFAULT NOW()
    );

    -- ── Apps ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS apps (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name            VARCHAR(64) UNIQUE NOT NULL,
      subdomain       VARCHAR(64) UNIQUE NOT NULL,
      repo_url        TEXT,
      branch          VARCHAR(64) DEFAULT 'main',
      git_provider_id INTEGER REFERENCES git_providers(id) ON DELETE SET NULL,
      registry_id     INTEGER REFERENCES registries(id)    ON DELETE SET NULL,
      cluster_id      INTEGER REFERENCES clusters(id)      ON DELETE SET NULL,
      created_at      TIMESTAMP DEFAULT NOW()
    );

    -- ── Deployments ───────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS deployments (
      id          SERIAL PRIMARY KEY,
      app_id      INTEGER REFERENCES apps(id) ON DELETE CASCADE,
      git_commit  VARCHAR(64),
      status      VARCHAR(32) DEFAULT 'queued',
      created_at  TIMESTAMP DEFAULT NOW(),
      finished_at TIMESTAMP
    );

    -- ── Build Logs ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS build_logs (
      id            SERIAL PRIMARY KEY,
      deployment_id INTEGER REFERENCES deployments(id) ON DELETE CASCADE,
      line          TEXT,
      logged_at     TIMESTAMP DEFAULT NOW()
    );

  `);

  console.log('✅ DB initialized');
}

module.exports = { pool, init };