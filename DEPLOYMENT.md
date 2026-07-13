# Deployment Guide — Lead Generation Platform

This repo is split into **2 deployable pieces**:

```
leadgeneration/
├── app/              ← Frontend (Next.js) → Vercel
├── components/       ← Frontend UI components
├── public/           ← Frontend static assets
├── lib/              ← Shared library (used by BOTH frontend API routes + backend worker)
├── scripts/          ← CLI utilities (test scripts, scrapers, DB cleanup)
├── backend/          ← Backend worker → HuggingFace Spaces
│   ├── Dockerfile
│   ├── server.js
│   ├── worker.ts
│   └── README.md
├── FRONTEND_VERCEL.md
└── DEPLOYMENT.md   ← (this file)
```

## Quick decision tree

| What you want to do | Read this |
|---|---|
| Deploy the **UI** to Vercel | [`FRONTEND_VERCEL.md`](./FRONTEND_VERCEL.md) |
| Deploy the **worker** to HuggingFace Spaces | [`backend/README.md`](./backend/README.md) |
| Both (recommended) | this file ↓ |

## Step-by-step: deploy both

### Step 1 — Push this repo to GitHub

```bash
cd /home/z/my-project/leadgeneration
git add -A
git commit -m "Add backend/ folder for HuggingFace Spaces + deployment docs"
git push origin main
```

If you don't have a GitHub PAT set up locally, the assistant has already committed the changes — you just need to push:

```bash
# Option A: Use a Personal Access Token
git push https://<YOUR_GITHUB_PAT>@github.com/ahmedhassan142/leadgeneration.git main

# Option B: Use SSH (if you have an SSH key on GitHub)
git remote set-url origin git@github.com:ahmedhassan142/leadgeneration.git
git push origin main
```

### Step 2 — Deploy frontend to Vercel

1. Go to https://vercel.com/new
2. Import the `ahmedhassan142/leadgeneration` repo
3. Vercel auto-detects Next.js — leave defaults
4. Add environment variables (see `FRONTEND_VERCEL.md` for the full list)
5. **Deploy**

You'll get a URL like `https://leadgeneration-ahmedhassan142.vercel.app`.

### Step 3 — Deploy backend worker to HuggingFace Spaces

1. Go to https://huggingface.co/new-space
2. **Name:** `leadgen-backend`, **SDK:** Docker, **Hardware:** CPU basic (free)
3. **Create Space**
4. Push the entire repo (HF will use `backend/Dockerfile`):

```bash
git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/leadgen-backend
git push hf main
```

5. Add the same environment variables as **Secrets** in the Space's settings (see `backend/README.md`)
6. Wait ~2-3 min for the Docker build
7. Verify: visit `https://YOUR_HF_USERNAME-leadgen-backend.hf.space/health`

### Step 4 — Connect them

Both services share the same MongoDB Atlas database. No additional wiring needed — the worker polls MongoDB for jobs that the frontend creates.

**Optional:** Set `NEXT_PUBLIC_BACKEND_URL=https://YOUR_HF_USERNAME-leadgen-backend.hf.space` on Vercel so the frontend can ping the worker's health endpoint (for a "Backend status" indicator on the dashboard).

## Verification checklist

- [ ] Vercel deployment URL opens the dashboard
- [ ] Dashboard shows lead count (should be 320+ from previous scrapes)
- [ ] `/api/leads/stats` returns JSON with `total`, `hot`, `warm`, `cold`
- [ ] HuggingFace Space shows "Running" status
- [ ] HF Space `/health` returns `{"status":"ok"}`
- [ ] HF Space logs show "Connected to MongoDB" + "Worker loops started"
- [ ] Create a scrape job via UI → it should appear in MongoDB → HF worker picks it up within 10s → leads start appearing

## Known issues / TODO

1. **Groq API key returns 403** — must regenerate at https://console.groq.com before AI email generation works
2. **Hostinger SMTP password rejected** — must reset in hPanel → Emails → Reset Password
3. **IMAP reply detector is hardcoded to `imap.gmail.com`** in `lib/email/imap-reply-detector.ts` — needs patch to read `IMAP_HOST` from env if you want Hostinger IMAP
4. **`package.json` references 4 missing scripts** (`test`, `test-followups`, `find-reply`, `followup`) — use `test-followuplead` and `test-followups2` instead
5. **Vercel cron `app/api/cron/*`** routes — can be deleted or left alone since the HF worker now handles queue processing continuously

## Architecture diagram

```
                         ┌─────────────────────────────┐
                         │     User's Browser          │
                         └─────────────┬───────────────┘
                                       │
                         ┌─────────────▼───────────────┐
                         │   Vercel (Frontend)         │
                         │   - Next.js 16 UI           │
                         │   - /api/leads (CRUD)       │
                         │   - /api/outreach (start)   │
                         │   - /api/leads/stats        │
                         └─────────────┬───────────────┘
                                       │
                         ┌─────────────▼───────────────┐
                         │   MongoDB Atlas (shared)    │
                         │   - leads                   │
                         │   - jobs (queue)            │
                         │   - outreach                │
                         │   - sequences               │
                         └─────────────┬───────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │                                          │
       ┌──────────▼──────────┐                ┌─────────────▼─────────────┐
       │  Vercel cron        │                │  HuggingFace Worker       │
       │  (every 5 min)      │                │  (polls every 10s)        │
       │  → triggers /api    │                │  - scrape (Puppeteer)     │
       │    cron/process-... │                │  - analyze (Gemini)       │
       └─────────────────────┘                │  - email extract          │
                                              │  - AI score               │
                                              │  - SMTP send              │
                                              │  - IMAP replies           │
                                              │  - follow-up queue        │
                                              └───────────────────────────┘
```

## TL;DR

- **Frontend** → Vercel (one-click import + env vars)
- **Backend** → HuggingFace Docker Space (push repo + set secrets)
- **Database** → MongoDB Atlas (already set up, shared)
- **Push first** → then deploy both in parallel
