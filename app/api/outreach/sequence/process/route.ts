// app/api/outreach/sequence/process/route.ts
import { NextResponse } from 'next/server';
import { sequenceManager } from '@/lib/outreach/sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST(request: Request) {
  // Optional: Add authentication for cron jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    logger.info('🕐 Starting manual follow-up processor...');
    
    const processedCount = await sequenceManager.processPendingFollowUps();

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to process follow-ups:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}