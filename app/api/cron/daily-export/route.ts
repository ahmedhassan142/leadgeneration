// app/api/cron/daily-export/route.ts
import { NextResponse } from 'next/server';
import { googleSheets } from '@/lib/services/googlesheet';
import { logger } from '@/lib/scraper/utils/logger';

// This runs daily at 11:59 PM via Vercel Cron
export async function GET() {
  try {
    logger.info('🕛 Running daily export cron job');
    
    const result = await googleSheets.exportAndClear();
    
    return NextResponse.json({
      success: true,
      message: `Daily export complete: ${result.exported} leads exported to Google Sheets`,
      data: result
    });
    
  } catch (error) {
    logger.error('Daily cron export failed', error);
    
    // Send alert (you could add email/Slack notification here)
    return NextResponse.json(
      { error: 'Daily export failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}