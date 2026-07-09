import { NextResponse } from 'next/server';
import { WordPressPluginScraper } from '@/lib/scraper/inbound/wrodpressScraper';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST() {
  try {
    logger.info('🔌 Starting WordPress Plugin scraper...');
    
    const scraper = new WordPressPluginScraper();
    const leadsCount = await scraper.scrape();

    return NextResponse.json({
      success: true,
      source: 'wordpress_plugins',
      leadsFound: leadsCount,
      message: `✅ Found ${leadsCount} potential leads from WordPress plugins`
    });

  } catch (error: any) {
    logger.error('❌ WordPress plugin scraper failed:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}