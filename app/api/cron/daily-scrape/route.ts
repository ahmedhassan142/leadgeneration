// app/api/cron/daily-scrape/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET() {
  try {
    logger.info('Running daily scrape cron job');
    
    // Scrape multiple niches/locations
    const jobs = await Promise.all([
      addJob('scrape', { niche: 'real estate agents', location: 'Austin, TX' }),
      addJob('scrape', { niche: 'plumbers', location: 'Miami, FL' }),
      addJob('scrape', { niche: 'dentists', location: 'Seattle, WA' }),
      addJob('scrape', { niche: 'roofers', location: 'Chicago, IL' }),
      addJob('scrape', { niche: 'electricians', location: 'Denver, CO' }),
    ]);
    
    return NextResponse.json({ 
      success: true,
      message: 'Daily scrape jobs queued',
      jobs: jobs.length
    });
  } catch (error) {
    logger.error('Daily scrape cron failed', error);
    return NextResponse.json(
      { error: 'Failed to run daily scrape' },
      { status: 500 }
    );
  }
}