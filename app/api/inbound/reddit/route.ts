// app/api/inbound/reddit/route.ts
import { NextResponse } from 'next/server';
import { RedditScraper } from '@/lib/scraper/inbound/Redditscraper';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST() {
  try {
    logger.info('🔴 Starting Reddit inbound scraper...');
    
    const scraper = new RedditScraper();
    const leadsCount = await scraper.scrape();

    return NextResponse.json({
      success: true,
      source: 'reddit',
      leadsFound: leadsCount,
      message: `✅ Found ${leadsCount} new leads from Reddit`
    });

  } catch (error: any) {
    logger.error('❌ Reddit scraper failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}