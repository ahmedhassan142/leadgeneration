// app/api/cron/process-followups/route.ts
import { NextResponse } from 'next/server';
import { sequenceManager } from '@/lib/outreach/sequence';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET(request: Request) {
  // Security check (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    logger.info('🕐 Starting follow-up processor...');
    
    const processedCount = await sequenceManager.processPendingFollowUps();

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to process follow-ups:', error);
    return NextResponse.json(
      { error: 'Failed to process follow-ups' },
      { status: 500 }
    );
  }
}