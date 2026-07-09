// app/api/outreach/pause/route.ts
import { NextResponse } from 'next/server';
import { outreachService } from '@/lib/services/outreachservice';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST(request: Request) {
  try {
    const { outreachId } = await request.json();

    if (!outreachId) {
      return NextResponse.json(
        { error: 'outreachId is required' },
        { status: 400 }
      );
    }

    const success = await outreachService.pauseOutreach(outreachId);

    return NextResponse.json({
      success,
      message: success ? 'Outreach paused' : 'Failed to pause'
    });

  } catch (error: any) {
    logger.error('Failed to pause outreach:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}