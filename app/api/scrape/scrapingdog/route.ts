// app/api/scrape/scrapingdog/route.ts - FIXED with proper cleanup
import { NextResponse } from 'next/server';
import { scrapeWithScrapingDog } from '@/lib/scraper/ScrapingDog';
import scrapingDog from '@/lib/services/scrapingdogservice';
import { logger } from '@/lib/scraper/utils/logger';
import { startMicroBatchProcessor, stopMicroBatchProcessor } from '@/lib/queue/inline-process';
import { startNewScrapeSession } from '@/lib/queue/mongo-queue';

// GET method for stats
export async function GET() {
  try {
    const stats = scrapingDog.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      processorRunning: global.microBatchRunning || false,
      message: `✅ ScrapingDog: ${stats.remainingToday} searches remaining today`
    });
    
  } catch (error: any) {
    logger.error(`❌ Failed to fetch ScrapingDog stats`, { error: error.message });
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// POST method for scraping
export async function POST(request: Request) {
  const startTime = Date.now();
  let processorStarted = false;
  
  try {
    const { niche, location, pages = 3, waveSize = pages * 20 } = await request.json();

    const validNiches = ['real-estate', 'salon-spa', 'restaurant-cafe', 'retail-store', 'fitness-gym'];
    if (!validNiches.includes(niche)) {
      logger.warn(`❌ Invalid niche`, { niche });
      return NextResponse.json(
        { error: 'Invalid niche' },
        { status: 400 }
      );
    }

    // Validate wave size
    const validWaveSizes = [20, 40, 60, 80, 100];
    if (!validWaveSizes.includes(waveSize)) {
      logger.warn(`❌ Invalid wave size`, { waveSize });
      return NextResponse.json(
        { error: 'Invalid wave size. Use: 20, 40, 60, 80, 100' },
        { status: 400 }
      );
    }

    logger.info(`🐕 ScrapingDog request received`, { niche, location, pages, waveSize });

    // ✅ STOP any existing processor first
    if (global.microBatchRunning) {
      logger.info(`🛑 Stopping existing processor...`);
      await stopMicroBatchProcessor();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 🔥 START A NEW SESSION - CLEARS OLD JOBS
    logger.info(`🧹 Starting new scrape session...`);
    const sessionId = await startNewScrapeSession();
    console.log(`\n📋 SESSION ID: ${sessionId}`);
    console.log(`📋 This session will ONLY process new leads from this scrape\n`);

    // ✅ Start processor for this session
    logger.info(`🚀 Starting micro-batch processor for this session...`);
    startMicroBatchProcessor();
    processorStarted = true;
    
    // Wait for processor to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    const beforeStats = scrapingDog.getStats();
    logger.info(`📊 ScrapingDog stats before`, beforeStats);
    
    // Pass wave size to scraper
    const leadsSaved = await scrapeWithScrapingDog(niche, location, pages, waveSize);
    
    const afterStats = scrapingDog.getStats();
    logger.info(`📊 ScrapingDog stats after`, afterStats);

    const duration = Date.now() - startTime;
    
    // ✅ Schedule processor to stop after 10 seconds
    setTimeout(async () => {
      if (global.microBatchRunning) {
        logger.info(`🛑 Auto-stopping processor after scrape...`);
        await stopMicroBatchProcessor();
      }
    }, 10000);
    
    logger.success(`✅ ScrapingDog request completed`, { 
      leadsSaved, 
      waveSize,
      duration: `${duration}ms` 
    });

    return NextResponse.json({
      success: true,
      leadsFound: leadsSaved,
      niche,
      location,
      pages,
      waveSize,
      sessionId: sessionId.slice(-8),
      stats: afterStats,
      searchesUsed: afterStats.searchesToday - beforeStats.searchesToday,
      duration: `${duration}ms`,
      processor: {
        started: processorStarted,
        running: global.microBatchRunning || false,
        willStop: true,
        stopIn: '10 seconds'
      },
      message: `✅ Found ${leadsSaved} leads. Processor will stop automatically.`
    });

  } catch (error: any) {
    // ✅ STOP PROCESSOR ON ERROR
    if (global.microBatchRunning) {
      logger.info(`🛑 Stopping processor due to error...`);
      await stopMicroBatchProcessor();
    }
    
    logger.error(`❌ ScrapingDog request failed`, { 
      error: error.message,
      stack: error.stack 
    });
    return NextResponse.json(
      { error: error.message || 'Scrape failed' },
      { status: 500 }
    );
  }
}