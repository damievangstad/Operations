import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: Number(process.env.PORT ?? 8080),
  PUBLIC_URL: process.env.PUBLIC_URL ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  OPENAI_EMBED_MODEL: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  ESCALATION_CONTACT: process.env.ESCALATION_CONTACT ?? 'your manager',
  ADMIN_KEY: process.env.ADMIN_KEY ?? ''
};

export const aiEnabled = Boolean(config.OPENAI_API_KEY);
