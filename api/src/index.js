require('dotenv').config();
const express = require('express');
const { init }            = require('./db');
const authRouter          = require('./routes/auth');
const { router: appsRouter } = require('./routes/apps');
const webhookRouter       = require('./routes/webhook');
const providersRouter     = require('./routes/providers');

const app = express();
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/auth',      authRouter);       // public
app.use('/webhooks',  webhookRouter);    // HMAC-verified
app.use('/apps',      appsRouter);       // JWT protected
app.use('/providers', providersRouter);  // JWT protected

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ 
  status: 'ok', 
  time: new Date() 
}));
// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});