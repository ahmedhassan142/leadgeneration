// app/api/background/analyze/route.ts
import { NextResponse } from 'next/server';
import { addJob } from '@/lib/queue/mongo-queue';
import { logger } from '@/lib/scraper/utils/logger';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { leadId, website } = await request.json();
    
    const job = await addJob('analyze', { leadId, website });
    
    return NextResponse.json({ 
      success: true, 
      jobId: job._id 
    });
  } catch (error) {
    logger.error('Analyze job failed', error);
    return NextResponse.json(
      { error: 'Failed to queue analyze job' },
      { status: 500 }
    );
  }
}