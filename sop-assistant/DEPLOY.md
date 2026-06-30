# Deploying the SOP Assistant

Goal: get this service running 24/7 at a public HTTPS URL, then point your Twilio
WhatsApp number at it. Recommended host: **Render** (simple, supports the included
`render.yaml`). Railway or any Node host works too.

There are three stages: **push the code → deploy on Render → connect Twilio.**

---

## Stage 1 — Push the code to GitHub

This service lives in the **`damievangstad/Operations`** repo, in the `sop-assistant/`
subfolder, with `render.yaml` at the repo root. The repo is already cloned locally.
Commit and push:

```bash
cd "<path to>/Operations"
git add -A
git commit -m "Add sop-assistant service"
git push
```

`.env` is gitignored, so your keys are **not** pushed. Good.

---

## Stage 2 — Deploy on Render

1. Sign up / log in at <https://render.com> and connect your GitHub account.
2. Click **New → Blueprint**, pick the `Operations` repo. Render reads the root
   `render.yaml`, which sets `rootDir: sop-assistant` so it builds from the subfolder.
   (Or **New → Web Service**, set **Root Directory** = `sop-assistant`, build = `npm install && npm run build`, start = `npm start`.)
3. Before the first deploy, set these **environment variables** (Render dashboard → the service → Environment):
   - `OPENAI_API_KEY` — your OpenAI key
   - `ADMIN_KEY` — any long random string (protects the `/ask` test page)
   - `ESCALATION_CONTACT` — e.g. `Damien` or a phone number
   - leave `TWILIO_AUTH_TOKEN` and `PUBLIC_URL` blank for now
4. Deploy. When it's live, copy the public URL, e.g. `https://sop-assistant.onrender.com`.
5. Set `PUBLIC_URL` to that exact URL and trigger a redeploy.
6. Sanity check in a browser:
   - `https://<your-url>/health` → `{"status":"ok"}`
   - `https://<your-url>/ask?q=how do I prime the machine&key=<ADMIN_KEY>` → a real answer

Note on plans: `render.yaml` uses the **starter** plan so the service stays awake.
The free plan sleeps after inactivity (a contractor's first text would wait ~50s while
it wakes), so starter is worth it for field use.

---

## Stage 3 — Connect Twilio WhatsApp (sandbox)

1. In the Twilio console: **Messaging → Try it out → Send a WhatsApp message** (the sandbox).
2. Find **"When a message comes in"** and set it to:
   `https://<your-url>/webhook/whatsapp` — method **HTTP POST**. Save.
3. Back in Render, set `TWILIO_AUTH_TOKEN` (Twilio console → Account → Auth Token) and redeploy.
   With `TWILIO_AUTH_TOKEN` + `PUBLIC_URL` both set, the service now verifies that
   incoming requests really come from Twilio.
4. On your phone, join the sandbox: send the join code (shown in the console, like
   `join <two-words>`) to the sandbox WhatsApp number.
5. Text it a question: *"how much mix for 60 guests?"* — you should get an answer back.

---

## Going to a real WhatsApp number (later)

The sandbox is for you and a few testers. To let any contractor message a branded
Vangstad number, you register a WhatsApp sender through Twilio, which requires
**Meta business verification** (can take a few days). Once approved, you swap the
sandbox number for the production one — no code changes needed. Do this after the
sandbox proves the assistant is useful.

## Updating SOPs

Right now SOPs live in `src/knowledge/`. Edit/add `.md` files, commit, and push —
Render redeploys automatically. (Phase 2 replaces this with a live Google Drive sync.)
