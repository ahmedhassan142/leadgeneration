// app/api/outreach/start/route.ts
import { NextResponse } from 'next/server';
import { outreachService } from '@/lib/services/outreachservice';
import { logger } from '@/lib/scraper/utils/logger';

export async function POST(request: Request) {
  try {
    const { leadId, leadType, sequenceId, customEmail } = await request.json();

    if (!leadId || !leadType) {
      return NextResponse.json(
        { error: 'leadId and leadType are required' },
        { status: 400 }
      );
    }

    const outreach = await outreachService.startOutreach({
      leadId,
      leadType,
      sequenceId,
      customEmail
    });

    if (!outreach) {
      return NextResponse.json(
        { error: 'Failed to start outreach' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      outreachId: outreach._id,
      nextFollowUp: outreach.nextFollowUpAt
    });

  } catch (error: any) {
    logger.error('Failed to start outreach:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}