require('dotenv').config();
const express = require('express');
const { init } = require('./db');
const { router: appsRouter } = require('./routes/apps');
const webhookRouter = require('./routes/webhook');
const providersRouter = require('./routes/providers');

const app = express();
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/apps',      appsRouter);
app.use('/webhooks',  webhookRouter);
app.use('/providers', providersRouter);

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ 
  status: 'ok', 
  time: new Date() 
}));

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error Handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    // console.log(`   Routes:`);
    // console.log(`   GET  /health`);
    // console.log(`   ANY  /apps`);
    // console.log(`   POST /webhooks/push`);
    // console.log(`   ANY  /providers/git`);
    // console.log(`   ANY  /providers/registry`);
    // console.log(`   ANY  /providers/cluster`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});