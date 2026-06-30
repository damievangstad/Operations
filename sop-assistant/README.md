# SOP Assistant

A standalone WhatsApp assistant that answers contractor questions from your SOPs.
Contractors text a Twilio WhatsApp number; this service retrieves the relevant SOP
passages and replies with a short, sourced answer.

This is **Phase 1**: the messaging + retrieval plumbing, running over a sample SOP
in `src/knowledge`. Phase 2 swaps the sample for your real Google Drive documents.

## Run locally

```bash
npm install
cp .env.example .env   # optional: add OPENAI_API_KEY for real answers
npm run dev
```

- No `OPENAI_API_KEY` → **echo mode**: it confirms it received your message (proves the plumbing).
- With `OPENAI_API_KEY` → **real answers** over the SOPs in `src/knowledge`, with the source section cited.

### Try it without WhatsApp
Open in a browser or curl:

```
http://localhost:8080/ask?q=how do I prime the machine
http://localhost:8080/ask?q=what is the refund policy
```

`GET /` shows index status; `GET /health` is a health check.

## Connect WhatsApp (Twilio sandbox)

1. Create a Twilio account and open the **WhatsApp sandbox** (Messaging → Try it out).
2. Deploy this service somewhere public (Render/Railway/VPS) so it has an HTTPS URL.
3. In the sandbox settings, set **"When a message comes in"** to:
   `https://YOUR_PUBLIC_URL/webhook/whatsapp` (HTTP POST).
4. Join the sandbox from your phone (send the join code to the sandbox number), then text it a question.

Set `TWILIO_AUTH_TOKEN` and `PUBLIC_URL` in `.env` to enable request-signature
validation (recommended once deployed; skipped automatically if either is unset).

## Environment variables

See `.env.example`. Key ones: `OPENAI_API_KEY`, `OPENAI_MODEL`,
`OPENAI_EMBED_MODEL`, `TWILIO_AUTH_TOKEN`, `PUBLIC_URL`, `ESCALATION_CONTACT`.
