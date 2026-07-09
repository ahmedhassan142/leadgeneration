// app/api/scrape/serp/route.ts - FIXED with proper cleanup
import { NextResponse } from 'next/server';
import { scrapeWithSerp } from '@/lib/scraper/serpApi';
import serpApi from '@/lib/services/serpApiservice';
import { logger } from '@/lib/scraper/utils/logger';
import { startMicroBatchProcessor, stopMicroBatchProcessor } from '@/lib/queue/inline-process';
import { startNewScrapeSession } from '@/lib/queue/mongo-queue';

// GET method for stats
export async function GET() {
  try {
    const stats = serpApi.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
      processorRunning: global.microBatchRunning || false,
      message: `✅ SERP API: ${stats.remainingToday} searches remaining today`
    });
    
  } catch (error: any) {
    logger.error(`❌ Failed to fetch SERP stats`, { error: error.message });
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
    const { niche, location, maxResults = 20, waveSize = 20 } = await request.json();

    const validNiches = ['real-estate', 'salon-spa', 'restaurant-cafe', 'retail-store', 'fitness-gym'];
    if (!validNiches.includes(niche)) {
      logger.warn(`❌ Invalid niche`, { niche });
      return NextResponse.json(
        { error: 'Invalid niche' },
        { status: 400 }
      );
    }

    logger.info(`🎯 SERP API request received`, { niche, location, maxResults, waveSize });

    // ✅ STOP any existing processor first
    if (global.microBatchRunning) {
      logger.info(`🛑 Stopping existing processor...`);
      await stopMicroBatchProcessor();
      // Give it time to clean up
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 🔥 START A NEW SESSION - CLEARS OLD JOBS
    logger.info(`🧹 Starting new scrape session...`);
    const sessionId = await startNewScrapeSession();
    console.log(`\n🧹 Cleared old jobs, new session: ${sessionId}`);
    console.log(`📋 This session will ONLY process new leads from this scrape\n`);

    // ✅ Start processor for this session
    logger.info(`🚀 Starting micro-batch processor for this session...`);
    startMicroBatchProcessor();
    processorStarted = true;
    
    // Wait for processor to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    const beforeStats = serpApi.getStats();
    logger.info(`📊 SERP API stats before`, beforeStats);
    
    // Run the scrape
    const leadsSaved = await scrapeWithSerp(niche, location, maxResults, waveSize);
    
    const afterStats = serpApi.getStats();
    logger.info(`📊 SERP API stats after`, afterStats);

    const duration = Date.now() - startTime;
    
    // ✅ Schedule processor to stop after 10 seconds (give it time to process)
    setTimeout(async () => {
      if (global.microBatchRunning) {
        logger.info(`🛑 Auto-stopping processor after scrape...`);
        await stopMicroBatchProcessor();
      }
    }, 10000);
    
    logger.success(`✅ SERP API request completed`, { 
      leadsSaved, 
      waveSize,
      duration: `${duration}ms`
    });

    return NextResponse.json({
      success: true,
      leadsFound: leadsSaved,
      niche,
      location,
      maxResults,
      waveSize,
      sessionId: sessionId,
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
    
    logger.error(`❌ SERP API request failed`, { 
      error: error.message,
      stack: error.stack 
    });
    return NextResponse.json(
      { error: error.message || 'Scrape failed' },
      { status: 500 }
    );
  }
}