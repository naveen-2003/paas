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
    CREATE TABLE IF NOT EXISTS apps (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) UNIQUE NOT NULL,
      subdomain VARCHAR(64) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      app_id INTEGER REFERENCES apps(id),
      git_commit VARCHAR(64),
      status VARCHAR(32) DEFAULT 'queued',
      created_at TIMESTAMP DEFAULT NOW(),
      finished_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS build_logs (
      id SERIAL PRIMARY KEY,
      deployment_id INTEGER REFERENCES deployments(id),
      line TEXT,
      logged_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ DB initialized');
}

module.exports = { pool, init };