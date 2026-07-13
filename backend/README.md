# Backend — Lead Generation Worker (for HuggingFace Spaces)

Long-running Node worker that polls MongoDB for queued jobs and processes them.
Designed to be deployed as a **Docker Space** on HuggingFace (free CPU tier, 16GB RAM, no GPU needed).

## What this worker does

Replaces Vercel's serverless cron-based processor. Polls MongoDB every 10s and runs:

| Job type | Action |
|---|---|
| `scrape` | Calls `scrapeGoogleMaps(niche, location, 20)` — Puppeteer + SerpApi fallback |
| `analyze` | Fetches website, runs SEO / speed / CMS / mobile-friendly analysis |
| `email` | Extracts contact emails from website HTML + common pages |
| `ai` | Sends website screenshot to Gemini for AI design analysis |
| `score` | Calculates lead score (0-100) based on analysis + AI issues |

Plus, every 60s, runs `outreachService.processFollowUps()` to:
- Send next-step emails in active outreach sequences
- Generate cold/warm emails via Groq (Llama 3.3 70B)
- Send via SMTP (Hostinger / Gmail / etc.)
- Detect replies via IMAP

## Why HuggingFace (not Vercel) for the backend?

- **Puppeteer/Playwright don't fit Vercel serverless** — 504 timeouts, cold starts, no Chromium binary
- **Long-running workers need persistent process** — Vercel cron can only run for 60-900s then dies
- **HF Spaces free tier = 16GB RAM, no sleep, unlimited runtime** — perfect for a Node worker
- **Frontend stays on Vercel** — better DX, faster edge cache, free HTTPS

## Deploy on HuggingFace Spaces

### 1. Create the Space
1. Go to https://huggingface.co/new-space
2. **Owner:** your username
3. **Name:** `leadgen-backend`
4. **License:** MIT
5. **SDK:** Docker
6. **Hardware:** CPU basic (free) — 16GB RAM is enough
7. Click **Create Space**

### 2. Push this repo to the Space

HF Spaces are git repos. Either:
- **Option A (cleaner):** Create a separate HF repo with ONLY the `backend/` folder + `lib/` + `scripts/` + `package.json` + `Dockerfile`
- **Option B (quick):** Push the entire repo (HF will use the `backend/Dockerfile`)

```bash
# Add HF as a second remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/leadgen-backend

# Push
git push hf main
```

> ⚠️ The Dockerfile expects build context = repo root (it COPYs `lib/`, `scripts/`, `package.json`). If you push only `backend/`, edit the Dockerfile paths or move it to repo root.

### 3. Set environment variables (secrets)

In the Space → **Settings** → **Repository secrets** → **New secret**:

| Name | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://ah770643:...@cluster0.bdbqw.mongodb.net/lead?retryWrites=true&w=majority&appName=Cluster0` |
| `GROQ_API_KEY` | (your Groq key — regenerate if 403) |
| `GEMINI_API_KEY` | `YOUR_GEMINI_API_KEY` |
| `OPENROUTER_API_KEY` | (optional) |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `ahmed@ahtech.fun` |
| `SMTP_PASSWORD` | (your Hostinger email password) |
| `SMTP_FROM` | `Ahmed Hassan` |
| `SMTP_FROM_EMAIL` | `ahmed@ahtech.fun` |
| `SERP_API_KEY` | (optional — hardcoded fallback exists) |
| `SCRAPINGDOG_API_KEY` | (optional — hardcoded fallback exists) |

### 4. Verify

After ~2-3 min build, the Space shows **Running**. Visit the Space URL:

```
https://YOUR_USERNAME-leadgen-backend.hf.space/health
```

Should return:
```json
{"status":"ok","service":"leadgen-backend-worker","uptime":12.3,"timestamp":"..."}
```

Check the **Logs** tab — you should see:
```
=== LeadGen Backend Worker (HuggingFace Spaces) ===
Environment check:
  MONGODB_URI: ✓ set
  GROQ_API_KEY: ✓ set
  ...
✅ Connected to MongoDB
Worker loops started:
  - Job poll:    every 10s
  - Follow-ups:  every 60s
```

## Local test (without HF)

```bash
cd /home/z/my-project/leadgeneration
# Make sure .env.local has MONGODB_URI + GROQ_API_KEY + SMTP_*
node backend/server.js
# → health on http://localhost:7860/health
# → worker logs in same terminal
```

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Vercel         │         │  HuggingFace    │
│  (frontend)     │         │  (backend)      │
│                 │         │                 │
│  /dashboard     │  HTTP   │  Worker poll    │
│  /leads         │ ◄────► │  MongoDB queue  │
│  /outreach      │         │  Puppeteer      │
│  /api/* (light) │         │  SMTP send      │
│                 │         │  IMAP replies   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └──────────┬────────────────┘
                    ▼
            ┌───────────────┐
            │  MongoDB      │
            │  Atlas        │
            │  (shared)     │
            └───────────────┘
```

- **Vercel** hosts the Next.js UI + lightweight API routes (lead CRUD, stats)
- **HuggingFace** runs the worker that polls MongoDB and does the heavy lifting
- **MongoDB Atlas** is the shared state — both sides read/write to the same `lead` database
- The frontend can optionally call the HF worker's HTTP endpoints for long-running tasks (TBD)

## Files in this folder

- `server.js` — entry point. Spawns health HTTP server on $PORT + tsx worker subprocess
- `worker.ts` — actual worker logic. Imports from `../lib/` (parent repo)
- `Dockerfile` — HF Spaces image (Node 20 + Chromium + Playwright)
- `README_HF.md` — HuggingFace Space metadata
