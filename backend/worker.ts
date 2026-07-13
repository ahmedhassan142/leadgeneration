/**
 * Worker — runs inside the HF Spaces container, spawned by server.js
 *
 * Pulls queued jobs from MongoDB and processes them, mirroring the logic in
 * app/api/background/processor/route.ts but as a long-running loop instead
 * of a Vercel serverless function.
 */

import 'dotenv/config';
import connectToDatabase from '../lib/db/connect';
import { getNextJob, completeJob, failJob } from '../lib/queue/mongo-queue';
import { scrapeGoogleMaps } from '../lib/scraper/googleMapsScraper';
import { analyzeWebsite } from '../lib/analyzer/website-Analyzer';
import { extractEmails } from '../lib/analyzer/emailExtractor';
import { analyzeWithAI } from '../lib/analyzer/geminiAnalyzer';
import { calculateScore } from '../lib/scoring/leadScorer';
import { logger } from '../lib/scraper/utils/logger';
import { outreachService } from '../lib/services/outreachservice';

const POLL_INTERVAL_MS = 10_000;          // 10s — poll for new jobs
const FOLLOWUP_TICK_MS = 60_000;          // 60s — process follow-up queue
const JOB_TYPES = ['scrape', 'analyze', 'email', 'ai', 'score'] as const;

async function processOneJobOfType(type: typeof JOB_TYPES[number]) {
  const job = await getNextJob(type).catch((e) => {
    logger.error(`getNextJob(${type}) failed`, e);
    return null;
  });
  if (!job) return;

  logger.info(`Processing ${type} job`, { jobId: job._id });
  try {
    let result;
    switch (type) {
      case 'scrape':
        result = await scrapeGoogleMaps(job.data.niche, job.data.location, 20);
        break;
      case 'analyze':
        result = await analyzeWebsite(job.data.website);
        break;
      case 'email':
        result = await extractEmails(job.data.leadId, job.data.website);
        break;
      case 'ai':
        result = await analyzeWithAI(job.data.leadId, job.data.website);
        break;
      case 'score':
        result = await calculateScore(job.data.leadId);
        break;
    }
    await completeJob(job._id, result);
    logger.info(`Completed ${type} job`, { jobId: job._id });
  } catch (error) {
    logger.error(`Failed ${type} job`, error);
    await failJob(job._id, error instanceof Error ? error.message : 'Unknown error');
  }
}

async function tick() {
  for (const type of JOB_TYPES) {
    await processOneJobOfType(type);
  }
}

async function followupTick() {
  try {
    await outreachService.processFollowUps();
    logger.info('Follow-up queue processed');
  } catch (e) {
    logger.error('Follow-up processing failed', e);
  }
}

async function main() {
  console.log('=== LeadGen Backend Worker (HuggingFace Spaces) ===');
  console.log('Environment check:');
  console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✓ set' : '✗ MISSING');
  console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✓ set' : '✗ MISSING (fallback emails will be used)');
  console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING');
  console.log('  SMTP_USER:', process.env.SMTP_USER || '(not set)');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
  console.log('');

  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is required');
    process.exit(1);
  }

  await connectToDatabase();
  console.log('✅ Connected to MongoDB\n');

  // Initial tick + start loops
  await tick();
  await followupTick();

  setInterval(tick, POLL_INTERVAL_MS);
  setInterval(followupTick, FOLLOWUP_TICK_MS);

  console.log(`Worker loops started:`);
  console.log(`  - Job poll:    every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  - Follow-ups:  every ${FOLLOWUP_TICK_MS / 1000}s`);
  console.log('');
}

main().catch((e) => {
  console.error('Worker crashed:', e);
  process.exit(1);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  process.exit(0);
});
