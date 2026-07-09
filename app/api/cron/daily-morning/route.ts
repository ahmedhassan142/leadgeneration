// app/api/cron/daily-morning/route.ts
// Consolidated daily morning cron job for Vercel Hobby plan (1 run/day).
//
// Hobby plan limits: max 2 cron jobs, each running at most once per day.
// This endpoint combines what used to be three separate frequent jobs:
//   1. daily-scrape      (queue scrape jobs for multiple niches/locations)
//   2. process-queue     (kick the background processor for pending jobs)
//   3. process-followups (send scheduled follow-up emails in sequences)
//
// Schedule: 0 8 * * *  → runs once per day at 08:00 UTC.
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';
import { sequenceManager } from '@/lib/outreach/sequence';
import { logger } from '@/lib/scraper/utils/logger';

export const maxDuration = 300; // 5 minutes — enough for queue + followups

export async function GET(request: Request) {
  // Optional CRON_SECRET protection (Vercel sends this header automatically)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, any> = {};

  logger.info('🌅 Running consolidated daily-morning cron job');

  // ── 1. Queue scrape jobs for multiple niches/locations ───────────────
  try {
    const niches: Array<{ niche: string; location: string }> = [
      { niche: 'real estate agents', location: 'Austin, TX' },
      { niche: 'plumbers', location: 'Miami, FL' },
      { niche: 'dentists', location: 'Seattle, WA' },
      { niche: 'roofers', location: 'Chicago, IL' },
      { niche: 'electricians', location: 'Denver, CO' },
    ];
    const scrapeJobs = await Promise.all(
      niches.map((n) => addJob('scrape', n))
    );
    results.scrape = { success: true, jobsQueued: scrapeJobs.length };
    logger.info(`✅ Queued ${scrapeJobs.length} scrape jobs`);
  } catch (error: any) {
    results.scrape = { success: false, error: error.message };
    logger.error('Daily scrape step failed', error);
  }

  // ── 2. Kick the background processor (process pending queue jobs) ────
  try {
    const baseUrl =
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const procResponse = await fetch(`${baseUrl}/api/background/processor`, {
      method: 'POST',
    });
    results.queue = await procResponse.json();
    logger.info('✅ Queue processor triggered');
  } catch (error: any) {
    results.queue = { success: false, error: error.message };
    logger.error('Queue processor step failed', error);
  }

  // ── 3. Process pending follow-up emails in outreach sequences ────────
  try {
    const followupsProcessed = await sequenceManager.processPendingFollowUps();
    results.followups = { success: true, processed: followupsProcessed };
    logger.info(`✅ Processed ${followupsProcessed} follow-ups`);
  } catch (error: any) {
    results.followups = { success: false, error: error.message };
    logger.error('Follow-up processing step failed', error);
  }

  const durationMs = Date.now() - startTime;
  logger.info(`🏁 Daily-morning cron complete in ${durationMs}ms`);

  return NextResponse.json({
    success: true,
    job: 'daily-morning',
    timestamp: new Date().toISOString(),
    durationMs,
    results,
  });
}
