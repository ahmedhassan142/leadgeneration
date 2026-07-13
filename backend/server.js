/**
 * HuggingFace Spaces backend worker
 * ---------------------------------
 * Long-running Node process that polls MongoDB for queued jobs and runs them.
 * Replaces the Vercel cron-based processor so heavy work (Puppeteer/Playwright
 * scraping, website analysis, AI scoring, SMTP sending, IMAP reply detection,
 * follow-up sequence processing) runs on HF Spaces free CPU tier instead of
 * Vercel's serverless functions (which can't run Puppeteer reliably).
 *
 * Polls every 10s for: scrape | analyze | email | ai | score jobs.
 * Also runs the follow-up queue + IMAP reply detector on a 60s timer.
 *
 * Exposes a tiny HTTP health endpoint on $PORT (HF sets this) so the Space
 * shows as "Running".
 */

import 'dotenv/config';
import http from 'http';
import { createServer } from 'http';

// Wire aliases so @/lib/* imports work without a build step
process.env.TS_NODE_PROJECT = __dirname + '/../tsconfig.json';

// Use ts-node/esm or tsx loader for the lib imports below
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spawn } = require('child_process');
const path = require('path');

// We spawn a tsx subprocess to run the actual worker logic, since the lib
// uses TypeScript with path aliases ("@/lib/...") that need tsx's resolver.
const workerPath = path.join(__dirname, 'worker.ts');
const PORT = process.env.PORT || 7860;

// Health endpoint — HF Spaces pings this to know we're alive
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'leadgen-backend-worker',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[leadgen-backend] Health endpoint listening on :${PORT}`);
});

// Spawn tsx worker (it has access to the parent repo's lib/ via relative path)
const child = spawn('npx', ['tsx', workerPath], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});

child.on('exit', (code: number) => {
  console.log(`[leadgen-backend] Worker exited with code ${code}, restarting in 5s...`);
  setTimeout(() => process.exit(1), 5000); // HF will restart the container
});

process.on('SIGTERM', () => {
  console.log('[leadgen-backend] SIGTERM received, killing worker');
  child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  setTimeout(() => process.exit(0), 2000);
});
