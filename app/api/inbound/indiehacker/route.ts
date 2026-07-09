// app/api/inbound/indiehackers/route.ts
import { NextResponse } from 'next/server';
import { IndieHackersScraper } from '@/lib/scraper/inbound/indiehacker';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST() {
  const startTime = Date.now();
  
  try {
    logger.info(`🏴‍☠️ Starting IndieHackers scraper...`);

    const scraper = new IndieHackersScraper();
    const leadsSaved = await scraper.scrape();
    
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      leadsFound: leadsSaved,
      duration: `${duration}ms`,
      message: `✅ Found ${leadsSaved} leads from IndieHackers`
    });

  } catch (error: any) {
    logger.error(`❌ IndieHackers request failed`, { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Scrape failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'IndieHackers Scraper - Use POST to start',
    groups: ['For Hire', 'Partner Up', 'Developers', 'Jobs']
  });
}