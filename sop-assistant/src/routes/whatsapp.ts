import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { answer } from '../services/rag.js';

export const whatsappRouter = Router();

whatsappRouter.post('/webhook/whatsapp', async (req, res) => {
  if (!isValidTwilioRequest(req)) {
    return res.status(403).type('text/plain').send('Invalid signature.');
  }

  const body = typeof req.body?.Body === 'string' ? req.body.Body : '';
  const from = typeof req.body?.From === 'string' ? req.body.From : 'unknown';
  console.log(`[whatsapp] message from ${from}: ${body}`);

  let reply: string;
  try {
    reply = await answer(body);
  } catch (error) {
    console.error('[whatsapp] failed to answer:', error);
    reply = `Something went wrong. Please contact ${config.ESCALATION_CONTACT}.`;
  }

  res.type('text/xml').send(toTwiml(reply));
});

function toTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isValidTwilioRequest(req: {
  header: (name: string) => string | undefined;
  originalUrl: string;
  body: Record<string, unknown>;
}): boolean {
  if (!config.TWILIO_AUTH_TOKEN || !config.PUBLIC_URL) {
    return true;
  }

  const signature = req.header('X-Twilio-Signature');
  if (!signature) {
    return false;
  }

  const url = `${config.PUBLIC_URL.replace(/\/$/, '')}${req.originalUrl}`;
  const params = req.body ?? {};
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + String(params[key]), url);
  const expected = crypto.createHmac('sha1', config.TWILIO_AUTH_TOKEN).update(Buffer.from(data, 'utf8')).digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
