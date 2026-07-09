// app/api/outreach/resume/route.ts
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

    const success = await outreachService.resumeOutreach(outreachId);

    return NextResponse.json({
      success,
      message: success ? 'Outreach resumed' : 'Failed to resume'
    });

  } catch (error: any) {
    logger.error('Failed to resume outreach:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}