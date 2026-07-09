// app/api/cron/daily-evening/route.ts
// Consolidated daily evening cron job for Vercel Hobby plan (1 run/day).
//
// This endpoint combines what used to be two separate jobs:
//   1. daily-export       (export scored leads to Google Sheets)
//   2. outreach/process   (process outreach follow-ups via outreachService)
//
// Schedule: 0 23 * * *  → runs once per day at 23:00 UTC.
import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/services/googlesheet';
import { outreachService } from '@/lib/services/outreachservice';
import { logger } from '@/lib/scraper/utils/logger';

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Optional CRON_SECRET protection
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, any> = {};

  logger.info('🌙 Running consolidated daily-evening cron job');

  // ── 1. Export scored leads to Google Sheets ──────────────────────────
  try {
    const exportResult = await googleSheets.exportAndClear();
    results.export = { success: true, ...exportResult };
    logger.info(`✅ Exported ${exportResult.exported} leads to Google Sheets`);
  } catch (error: any) {
    results.export = { success: false, error: error.message };
    logger.error('Google Sheets export step failed', error);
  }

  // ── 2. Process outreach follow-ups via the outreach service ──────────
  try {
    const processedCount = await outreachService.processFollowUps();
    results.outreach = { success: true, processed: processedCount };
    logger.info(`✅ Processed ${processedCount} outreach follow-ups`);
  } catch (error: any) {
    results.outreach = { success: false, error: error.message };
    logger.error('Outreach follow-up step failed', error);
  }

  const durationMs = Date.now() - startTime;
  logger.info(`🏁 Daily-evening cron complete in ${durationMs}ms`);

  return NextResponse.json({
    success: true,
    job: 'daily-evening',
    timestamp: new Date().toISOString(),
    durationMs,
    results,
  });
}
