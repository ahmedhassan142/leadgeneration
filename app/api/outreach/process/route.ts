// app/api/outreach/process/route.ts
import { NextResponse } from 'next/server';
import { outreachService } from '@/lib/services/outreachservice';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET(request: Request) {
  // Security check for cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const processedCount = await outreachService.processFollowUps();

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