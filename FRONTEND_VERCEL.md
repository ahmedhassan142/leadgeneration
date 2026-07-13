# Frontend — Lead Generation UI (for Vercel)

This is the **Next.js 16 app** that runs on Vercel:
- Dashboard, leads table, outreach composer, mobile dashboard, inbound leads
- Lightweight API routes (lead CRUD, stats) — these read/write directly to MongoDB Atlas
- All heavy lifting (scraping, AI analysis, SMTP send, IMAP replies) is delegated to the HuggingFace backend worker

## Deploy on Vercel

### 1. Push repo to GitHub
```bash
git remote add origin https://github.com/ahmedhassan142/leadgeneration.git
git push -u origin main
```

### 2. Import to Vercel
1. https://vercel.com/new
2. Select the `leadgeneration` repo
3. **Framework Preset:** Next.js (auto-detected)
4. **Root Directory:** `./` (default — repo root)
5. **Build Command:** `npm run build` (default — runs `patch-packages.js` then `next build`)
6. **Output Directory:** `.next` (auto)

### 3. Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

| Key | Value | Required |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://ah770643:...@cluster0.bdbqw.mongodb.net/lead?retryWrites=true&w=majority&appName=Cluster0` | YES (app won't boot without it) |
| `GROQ_API_KEY` | (regenerate — current returns 403) | YES for AI email generation |
| `GEMINI_API_KEY` | `YOUR_GEMINI_API_KEY` | YES for AI lead scoring |
| `SMTP_HOST` | `smtp.hostinger.com` | YES for outreach |
| `SMTP_PORT` | `465` | YES |
| `SMTP_USER` | `ahmed@ahtech.fun` | YES |
| `SMTP_PASSWORD` | (your Hostinger email password) | YES |
| `SMTP_FROM` | `Ahmed Hassan` | recommended |
| `SMTP_FROM_EMAIL` | `ahmed@ahtech.fun` | recommended |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | recommended |
| `CRON_SECRET` | (any random string) | recommended |
| `NEXT_PUBLIC_CRON_SECRET` | (same as CRON_SECRET) | recommended |
| `NEXT_PUBLIC_BACKEND_URL` | `https://YOUR_USERNAME-leadgen-backend.hf.space` | optional — for future frontend → worker HTTP calls |

> ⚠️ **Important:** Vercel's serverless functions **cannot run Puppeteer reliably** (504s, no Chromium). The `app/api/scrape/*` and `app/api/background/processor` routes will still deploy but may fail. Heavy scraping + processing should go through the HuggingFace backend worker, which polls MongoDB for jobs and processes them.

### 4. Cron Jobs

`vercel.json` already declares 2 cron jobs (Vercel Hobby allows 2 free):
- `process-queue` — every 5 min
- `daily-morning` — daily at 9:00 UTC

These hit Vercel's cron-protected API routes. The HF backend worker is the primary processor now (polls every 10s, doesn't need cron).

## What Vercel does vs. what HuggingFace does

| Feature | Vercel (this) | HuggingFace (backend/) |
|---|---|---|
| **UI** | ✅ Dashboard, leads, outreach | ❌ |
| **Lead CRUD API** | ✅ /api/leads/* | ❌ |
| **Stats API** | ✅ /api/leads/stats | ❌ |
| **Outreach start/pause** | ✅ /api/outreach/* | ❌ |
| **Scraping (Puppeteer)** | ❌ timeouts | ✅ worker |
| **Website analysis** | ❌ timeouts | ✅ worker |
| **AI analysis (Gemini)** | ⚠️ slow but works | ✅ worker |
| **Lead scoring** | ✅ fast | ✅ worker |
| **SMTP send (Nodemailer)** | ⚠️ 30s limit | ✅ worker |
| **IMAP reply detection** | ❌ needs persistent connection | ✅ worker |
| **Follow-up queue** | ❌ needs interval | ✅ worker |
| **Voice sales calls** | ❌ | ⚠️ partial (Python) |

## Local dev

```bash
cd /home/z/my-project/leadgeneration
npm install
npm run dev    # http://localhost:3000
```

For full functionality locally, also run the backend worker in a separate terminal:
```bash
node backend/server.js    # http://localhost:7860
```
