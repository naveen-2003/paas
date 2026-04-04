require('dotenv').config();
const express = require('express');
const { init } = require('./db');
const { router: appsRouter } = require('./routes/apps');
const webhookRouter = require('./routes/webhook');

const app = express();
app.use(express.json());

app.use('/apps',     appsRouter);
app.use('/webhooks', webhookRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 4000;

init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});