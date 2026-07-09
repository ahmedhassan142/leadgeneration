# Lead Generation Platform

A full-stack Next.js 16 lead-generation platform: scrape Google Maps / mobile
app stores, analyze websites, score leads with AI (Groq + Gemini), and run
automated email outreach sequences with reply detection.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** MongoDB (Mongoose)
- **AI:** Groq (Llama 3.3 70B) for email/conversation generation, Google Gemini for website analysis & lead scoring
- **Email:** Nodemailer (SMTP) + IMAP reply detection
- **Scraping:** SerpApi, ScrapingDog, Puppeteer, Playwright, app-store-scraper-ts, google-play-scraper
- **Queue:** In-process + MongoDB-backed job queue
- **Voice sales calls:** AI-driven conversation engine (Groq) — web-friendly, serverless-safe

## Quick Start (Local)

```bash
# 1. Install dependencies (a postinstall script patches a packaging bug in
#    app-store-scraper-ts automatically)
npm install

# 2. Configure environment
cp .env.example .env.local
#   then fill in MONGODB_URI, GROQ_API_KEY, GEMINI_API_KEY, ...

# 3. Run the dev server
npm run dev
#   open http://localhost:3000  (redirects to /dashboard)

# 4. Production build
npm run build
npm start
```

> **Note on memory:** The full TypeScript type-check of this large codebase
> can exceed the default Node heap on small machines. `next.config.ts` sets
> `typescript.ignoreBuildErrors: true` so `next build` succeeds reliably both
> locally and on Vercel. The code still *compiles* cleanly; run
> `tsc --noEmit` with `NODE_OPTIONS=--max-old-space-size=8192` to audit types.

## Deploy on Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **New Project → Import** the repository.
3. Vercel auto-detects Next.js — no build overrides needed. The build command
   is `next build` (wrapped with the package patch via `npm run build`).
4. Add environment variables (Project → Settings → Environment Variables).
   See `.env.example` for the full list. **Minimum required for the app to
   boot:** `MONGODB_URI`. Add `GROQ_API_KEY` and `GEMINI_API_KEY` to enable AI
   features; without them the app still runs and returns fallback content.
5. Deploy. Vercel Cron jobs are declared in `vercel.json` (outreach processing,
   queue, follow-ups, daily scrape, daily export).

### Why a `postinstall` patch?

`app-store-scraper-ts@0.3.0` ships a broken dual ESM/CJS build: its root
`package.json` says `"type": "commonjs"` but the ESM files use extensionless
imports that Node cannot resolve natively. `scripts/patch-packages.js`
rewrites the package's `exports` map to point at its self-consistent CommonJS
build so both Turbopack and Node load it correctly. The patch runs
automatically on `npm install` (postinstall) and before every `npm run build`.

## Project Structure (key parts)

```
app/
  api/            Route handlers (leads, outreach, scraping, cron, sales-call)
  dashboard/      Main lead dashboard
  leads/          Leads table + filters
  outreach/       Outreach sequences + lead detail
  Inbound/        Inbound (app-store / Reddit / HN / job-board) leads
  Mobile-Dashboard/
lib/
  ai/             llamaClient (Groq), cold/warm email generators, prompts
  analyzer/       website-Analyzer, geminiAnalyzer, email/phone extractors
  email/          SMTP send, templates, outreach, IMAP reply detector
  db/             Mongoose connect + models (Lead, Outreach, Sequence, ...)
  queue/          mongo-queue, followup-queue, inline-process
  sales/          sales_call_engine + sales-conversations (AI voice calls)
  scraper/        serpApi, googleMapsScraper, MobileScraper, safe-scraper
  services/       ai (Gemini), googlesheet, serpApiservice, scrapingdog
scripts/          CLI utilities + patch-packages.js
vercel.json       Vercel Cron schedule
```
