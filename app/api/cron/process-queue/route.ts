// app/api/cron/process-queue/route.ts
import { NextResponse } from 'next/server';
import { logger } from '@/lib/scraper/utils/logger';

export async function GET() {
  try {
    // Trigger queue processor
    const response = await fetch(
      `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/background/processor`,
      { method: 'POST' }
    );
    
    const result = await response.json();
    
    return NextResponse.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Queue processor cron failed', error);
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}