// app/api/inbound/jobboards/route.ts
import { NextResponse } from 'next/server';
import { JobBoardScraper } from '@/lib/scraper/inbound/JobBoardScraper';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST() {
  try {
    logger.info('💼 Starting Job Boards inbound scraper...');
    
    const scraper = new JobBoardScraper();
    const leadsCount = await scraper.scrape();

    return NextResponse.json({
      success: true,
      source: 'jobboards',
      leadsFound: leadsCount,
      message: `✅ Found ${leadsCount} new leads from Job Boards`
    });

  } catch (error: any) {
    logger.error('❌ Job Boards scraper failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}