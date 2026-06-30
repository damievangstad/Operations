import express from 'express';
import { config } from './config.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { answer, buildIndex, getIndexStatus } from './services/rag.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ service: 'sop-assistant', ...getIndexStatus() });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Browser/curl test endpoint so you can try answers without Twilio: /ask?q=...
// When ADMIN_KEY is set, callers must pass it via ?key= or the x-admin-key header.
app.get('/ask', async (req, res) => {
  if (config.ADMIN_KEY) {
    const provided = (typeof req.query.key === 'string' && req.query.key) || req.header('x-admin-key') || '';
    if (provided !== config.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized. Provide the admin key via ?key= or x-admin-key.' });
    }
  }

  const question = typeof req.query.q === 'string' ? req.query.q : '';
  try {
    res.json({ question, answer: await answer(question) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to answer.' });
  }
});

app.use(whatsappRouter);

async function start() {
  try {
    await buildIndex();
  } catch (error) {
    console.error('[startup] failed to build index:', error);
  }

  app.listen(config.PORT, () => {
    console.log(`sop-assistant listening on http://localhost:${config.PORT}`);
    console.log(`Try it: http://localhost:${config.PORT}/ask?q=how%20do%20I%20prime%20the%20machine`);
  });
}

void start();
