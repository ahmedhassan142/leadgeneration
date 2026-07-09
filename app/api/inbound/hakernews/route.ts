import { NextResponse } from 'next/server';
import { HackerNewsScraper } from '@/lib/scraper/inbound/Hackernews';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST() {
  try {
    logger.info('🐍 Starting Hacker News scraper...');
    
    const scraper = new HackerNewsScraper();
    const leadsCount = await scraper.scrape();

    return NextResponse.json({
      success: true,
      source: 'hacker_news',
      leadsFound: leadsCount,
      message: `✅ Found ${leadsCount} leads from Hacker News`
    });

  } catch (error: any) {
    logger.error('❌ Hacker News scraper failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Hacker News Scraper',
    usage: 'POST /api/inbound/hackernews to start scraping'
  });
}